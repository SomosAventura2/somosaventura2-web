import { supabase } from '../../lib/supabase.js'

/**
 * @param {'cobrar'|'pagar'} kind
 * @param {{ estado?: string, q?: string }} filters estado: 'todo' | valor concreto
 */
export async function fetchDeudas(kind, { estado = 'todo', q = '' } = {}) {
  const table = kind === 'cobrar' ? 'cuentas_por_cobrar' : 'cuentas_por_pagar'
  let query = supabase
    .from(table)
    .select('*, clientes(nombre, alias, telefono)')
    .order('created_at', { ascending: false })

  if (estado && estado !== 'todo') {
    query = query.eq('estado', estado)
  }

  const { data, error } = await query
  if (error) throw error

  let rows = data ?? []
  const qq = q.trim().toLowerCase()
  if (qq) {
    rows = rows.filter((r) => {
      const c = r.clientes
      const name = [c?.nombre, c?.alias, c?.telefono].filter(Boolean).join(' ').toLowerCase()
      return name.includes(qq) || String(r.id).toLowerCase().includes(qq)
    })
  }
  return rows
}

/**
 * @param {object} params
 * @param {'cobrar'|'pagar'} params.kind
 * @param {object} params.deuda fila de cuentas_por_cobrar o cuentas_por_pagar
 * @param {string|number} params.montoAbono
 */
export async function registrarAbono({ kind, deuda, montoAbono }) {
  const table = kind === 'cobrar' ? 'cuentas_por_cobrar' : 'cuentas_por_pagar'
  const monto = Number(montoAbono)
  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error('El monto del abono debe ser mayor que 0.')
  }

  const saldo = Number(deuda.saldo ?? 0)
  const montoPagado = Number(deuda.monto_pagado ?? 0)
  const montoTotal = Number(deuda.monto_total ?? 0)

  if (monto > saldo + 1e-9) {
    throw new Error('El abono no puede ser mayor que el saldo pendiente.')
  }

  const montoPagadoNuevo = montoPagado + monto
  const saldoNuevo = Math.max(0, montoTotal - montoPagadoNuevo)
  const estadoNuevo = saldoNuevo <= 1e-9 ? 'cerrada' : montoPagadoNuevo > 0 ? 'parcial' : deuda.estado

  const { error: eUp } = await supabase
    .from(table)
    .update({
      monto_pagado: montoPagadoNuevo,
      saldo: saldoNuevo,
      estado: estadoNuevo,
    })
    .eq('id', deuda.id)

  if (eUp) throw eUp

  const tipoMov = kind === 'cobrar' ? 'ingreso' : 'egreso'
  const nota =
    kind === 'cobrar'
      ? `Abono cuenta por cobrar (${String(deuda.id).slice(0, 8)}…)`
      : `Abono cuenta por pagar (${String(deuda.id).slice(0, 8)}…)`

  const { error: eMov } = await supabase.from('movimientos_caja').insert([
    {
      tipo: tipoMov,
      moneda: deuda.moneda,
      monto,
      operacion_id: deuda.operacion_id ?? null,
      nota,
    },
  ])

  if (eMov) throw eMov

  if (saldoNuevo <= 1e-9 && deuda.operacion_id) {
    const { error: eOp } = await supabase
      .from('operaciones')
      .update({ estado: 'cerrada' })
      .eq('id', deuda.operacion_id)
    if (eOp) throw eOp
  }
}

/**
 * Alta manual de cuenta por cobrar o por pagar (sin operación asociada).
 * @param {'cobrar'|'pagar'} params.kind
 * @param {string} params.cliente_id
 * @param {string|number} params.monto_total
 * @param {'USD'|'USDT'} params.moneda
 */
export async function crearDeudaManual({ kind, cliente_id, monto_total, moneda }) {
  const table = kind === 'cobrar' ? 'cuentas_por_cobrar' : 'cuentas_por_pagar'
  const monto = Number(monto_total)
  if (!cliente_id) {
    throw new Error('Selecciona un cliente.')
  }
  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error('El monto total debe ser mayor que 0.')
  }
  const mon = String(moneda ?? '')
    .trim()
    .toUpperCase()
  if (mon !== 'USD' && mon !== 'USDT') {
    throw new Error('La moneda debe ser USD o USDT.')
  }

  const { error } = await supabase.from(table).insert([
    {
      cliente_id,
      monto_total: monto,
      monto_pagado: 0,
      saldo: monto,
      estado: 'pendiente',
      moneda: mon,
      operacion_id: null,
    },
  ])
  if (error) throw error
}
