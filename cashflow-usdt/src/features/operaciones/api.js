import { supabase } from '../../lib/supabase.js'
import { calcularOperacion, comisionNetaDesdeMontos } from '../../lib/calculations.js'

function montoParaCalculo(data) {
  if (data.monto != null && !Number.isNaN(Number(data.monto))) {
    return Number(data.monto)
  }
  if (data.tipo === 'compra') {
    return Number(data.monto_entrada ?? 0)
  }
  if (data.tipo === 'venta') {
    return Number(data.monto_salida ?? 0)
  }
  return 0
}

function notaCaja(observacion) {
  if (!observacion || typeof observacion !== 'string') return null
  const t = observacion.trim()
  if (!t) return null
  return t.length > 200 ? `${t.slice(0, 197)}…` : t
}

export async function fetchClientes() {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nombre, alias, telefono')
    .order('nombre', { ascending: true, nullsFirst: false })
  if (error) throw error
  return data ?? []
}

/**
 * Alta de cliente. `nombre` y `apellido` se guardan en un solo campo `nombre` (nombre completo).
 */
export async function createCliente({ nombre, apellido, telefono, alias }) {
  const n = String(nombre ?? '').trim()
  const a = String(apellido ?? '').trim()
  const full = [n, a].filter(Boolean).join(' ').trim()
  if (!full) {
    throw new Error('Indica al menos nombre o apellido.')
  }

  const row = {
    nombre: full,
    telefono: telefono?.trim() || null,
    alias: alias?.trim() || null,
  }

  const { data, error } = await supabase.from('clientes').insert([row]).select('id, nombre, alias, telefono').single()

  if (error) throw error
  return data
}

/**
 * Listado de operaciones con cliente embebido. Filtros opcionales; búsqueda `q` en cliente.
 */
export async function fetchOperaciones({
  q = '',
  tipo = 'todos',
  estado = 'todos',
  limit = 100,
} = {}) {
  let query = supabase
    .from('operaciones')
    .select('*, clientes(nombre, alias, telefono)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (tipo && tipo !== 'todos') query = query.eq('tipo', tipo)
  if (estado && estado !== 'todos') query = query.eq('estado', estado)

  const { data, error } = await query
  if (error) throw error

  let rows = data ?? []
  const qq = q.trim().toLowerCase()
  if (qq) {
    rows = rows.filter((r) => {
      const c = r.clientes
      const name = [c?.nombre, c?.alias, c?.telefono].filter(Boolean).join(' ').toLowerCase()
      return (
        name.includes(qq) ||
        String(r.id).toLowerCase().includes(qq) ||
        String(r.moneda_entrada ?? '').toLowerCase().includes(qq) ||
        String(r.moneda_salida ?? '').toLowerCase().includes(qq)
      )
    })
  }
  return rows
}

/**
 * Inserta operación, movimientos de caja (con nota opcional) y cuenta por cobrar/pagar si aplica.
 */
export async function crearOperacion(data) {
  const comisionPct = Number(data.comision_pct ?? 0)
  const comisionFija = Number(data.comision_fija ?? 0)
  const tipo = data.tipo
  const observacion = data.observacion?.trim() || null
  const nota = notaCaja(observacion)
  const modo = data.modo_operacion === 'intermediacion' ? 'intermediacion' : 'propio'

  const estado = data.estado ?? 'pendiente'
  const montoIn = Number(data.monto_entrada ?? 0)
  const montoOut = Number(data.monto_salida ?? 0)
  const pendienteOParcial = estado === 'pendiente' || estado === 'parcial'
  const conClienteParaDeuda = Boolean(data.cliente_id)

  const comisionMoneda =
    modo === 'intermediacion' && (data.comision_moneda === 'USDT' || data.comision_moneda === 'USD')
      ? data.comision_moneda
      : null

  const comisionNeta = comisionNetaDesdeMontos({
    tipo,
    montoEntrada: montoIn,
    montoSalida: montoOut,
    monedaEntrada: data.moneda_entrada,
    monedaSalida: data.moneda_salida,
    comisionPct,
    comisionFija,
    ventaUsdtFijoSalida:
      modo !== 'intermediacion' &&
      !!data.cambio_auto_fijo_salida &&
      tipo === 'venta' &&
      String(data.moneda_entrada ?? '').toUpperCase() === 'USD' &&
      String(data.moneda_salida ?? '').toUpperCase() === 'USDT',
    compraUsdFijoSalida:
      modo !== 'intermediacion' &&
      !!data.cambio_auto_fijo_salida &&
      tipo === 'compra' &&
      String(data.moneda_entrada ?? '').toUpperCase() === 'USDT' &&
      String(data.moneda_salida ?? '').toUpperCase() === 'USD',
    tasa: data.tasa,
  })

  let costoReal
  let ingresoReal
  let ganancia

  if (modo === 'intermediacion') {
    if (!comisionMoneda) {
      throw new Error('En intermediación elige la moneda en la que recibes la comisión (USD o USDT).')
    }
    if (!Number.isFinite(comisionNeta) || comisionNeta <= 0) {
      throw new Error('En intermediación la comisión neta debe ser mayor que 0 (usa % o comisión fija).')
    }
    costoReal = 0
    ingresoReal = comisionNeta
    ganancia = comisionNeta
  } else {
    const calc = calcularOperacion({
      monto: montoParaCalculo(data),
      comisionPct,
      comisionFija,
      tipo,
      moneda_entrada: data.moneda_entrada,
      moneda_salida: data.moneda_salida,
      monto_entrada: montoIn,
      monto_salida: montoOut,
      cambio_auto_fijo_salida: !!data.cambio_auto_fijo_salida,
      tasa: data.tasa,
    })
    costoReal = calc.costoReal
    ingresoReal = calc.ingresoReal
    ganancia = calc.ganancia
  }

  const row = {
    cliente_id: data.cliente_id ?? null,
    tipo,
    moneda_entrada: data.moneda_entrada,
    moneda_salida: data.moneda_salida,
    monto_entrada: montoIn,
    monto_salida: montoOut,
    tasa: data.tasa != null ? Number(data.tasa) : null,
    comision_pct: comisionPct,
    comision_fija: comisionFija,
    costo_real: costoReal,
    ingreso_real: ingresoReal,
    ganancia,
    estado,
    observacion,
    modo_operacion: modo,
    ...(modo === 'intermediacion' ? { comision_moneda: comisionMoneda } : { comision_moneda: null }),
  }

  const { data: inserted, error } = await supabase
    .from('operaciones')
    .insert([row])
    .select('id')
    .single()

  if (error) throw error

  const opId = inserted.id

  const movBase = {
    operacion_id: opId,
  }

  let movimientos
  if (modo === 'intermediacion') {
    const partes = ['Comisión intermediación']
    if (nota) partes.push(nota)
    movimientos = [
      {
        ...movBase,
        tipo: 'ingreso',
        moneda: comisionMoneda,
        monto: comisionNeta,
        nota: partes.join(' · '),
      },
    ]
  } else {
    // Con deuda en libros: lo pendiente no entra en caja hasta abonos (evita “USD en calle” en saldo caja).
    const callePorCobrar = pendienteOParcial && conClienteParaDeuda && tipo === 'venta' && montoIn > 0
    const callePorPagar = pendienteOParcial && conClienteParaDeuda && tipo === 'compra' && montoOut > 0

    movimientos = []
    if (!callePorCobrar && montoIn > 0) {
      movimientos.push({
        ...movBase,
        tipo: 'ingreso',
        moneda: data.moneda_entrada,
        monto: montoIn,
        ...(nota ? { nota } : {}),
      })
    }
    if (!callePorPagar && montoOut > 0) {
      movimientos.push({
        ...movBase,
        tipo: 'egreso',
        moneda: data.moneda_salida,
        monto: montoOut,
        ...(nota ? { nota } : {}),
      })
    }
  }

  if (movimientos.length > 0) {
    const { error: errCaja } = await supabase.from('movimientos_caja').insert(movimientos)
    if (errCaja) throw errCaja
  }

  // Intermediación: el principal no pasa por tu caja; no crear CXC/CXP automáticas desde montos brutos.
  if (modo !== 'intermediacion' && pendienteOParcial && data.cliente_id) {
    if (tipo === 'venta' && montoIn > 0) {
      const { error: eCxc } = await supabase.from('cuentas_por_cobrar').insert([
        {
          cliente_id: data.cliente_id,
          operacion_id: opId,
          moneda: data.moneda_entrada,
          monto_total: montoIn,
          monto_pagado: 0,
          saldo: montoIn,
          estado,
        },
      ])
      if (eCxc) throw eCxc
    }
    if (tipo === 'compra' && montoOut > 0) {
      const { error: eCxp } = await supabase.from('cuentas_por_pagar').insert([
        {
          cliente_id: data.cliente_id,
          operacion_id: opId,
          moneda: data.moneda_salida,
          monto_total: montoOut,
          monto_pagado: 0,
          saldo: montoOut,
          estado,
        },
      ])
      if (eCxp) throw eCxp
    }
  }

  return inserted
}
