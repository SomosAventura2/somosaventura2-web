import { supabase } from '../../lib/supabase.js'

const PAGE = 1000

/** Lunes 00:00 local (semana calendario común en negocio). */
function inicioSemanaLunes(isoOrDate) {
  const d = new Date(isoOrDate)
  if (Number.isNaN(d.getTime())) return null
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function weekStartTs(isoOrDate) {
  const d = inicioSemanaLunes(isoOrDate)
  return d ? d.getTime() : 0
}

function etiquetaSemana(inicioLunes) {
  if (!inicioLunes) return '—'
  const fin = new Date(inicioLunes)
  fin.setDate(fin.getDate() + 6)
  const opt = { day: 'numeric', month: 'short' }
  return `${inicioLunes.toLocaleDateString('es-VE', opt)} – ${fin.toLocaleDateString('es-VE', opt)}`
}

async function fetchAllOperacionesReporte() {
  const all = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('operaciones')
      .select(
        'id, cliente_id, tipo, estado, modo_operacion, comision_moneda, ganancia, monto_entrada, monto_salida, created_at, clientes(id, nombre, alias)',
      )
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!data?.length) break
    all.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

function buildFromRows(rows) {
  /** @type {Map<number, { weekStart: Date, count: number, ganancia: number, ventas: number, compras: number, otras: number }>} */
  const porSemana = new Map()
  /** @type {Map<string, { cliente_id: string, nombre: string, ops: number, ganancia: number }>} */
  const porCliente = new Map()

  let gananciaTotal = 0
  let opsPropias = 0
  let opsInter = 0
  const porEstado = { pendiente: 0, parcial: 0, cerrada: 0, otro: 0 }
  const porTipo = { venta: 0, compra: 0, otro: 0 }

  for (const r of rows) {
    const g = Number(r.ganancia) || 0
    gananciaTotal += g

    const tipo = String(r.tipo ?? '').toLowerCase()
    if (tipo === 'venta') porTipo.venta += 1
    else if (tipo === 'compra') porTipo.compra += 1
    else porTipo.otro += 1

    const est = String(r.estado ?? '').toLowerCase()
    if (est in porEstado) porEstado[est] += 1
    else porEstado.otro += 1

    if (r.modo_operacion === 'intermediacion') opsInter += 1
    else opsPropias += 1

    const ts = weekStartTs(r.created_at)
    if (ts) {
      if (!porSemana.has(ts)) {
        porSemana.set(ts, {
          weekStart: inicioSemanaLunes(r.created_at),
          count: 0,
          ganancia: 0,
          ventas: 0,
          compras: 0,
        })
      }
      const w = porSemana.get(ts)
      w.count += 1
      w.ganancia += g
      if (tipo === 'venta') w.ventas += 1
      else if (tipo === 'compra') w.compras += 1
    }

    const cid = r.cliente_id
    if (cid) {
      const c = r.clientes
      const nombre = [c?.nombre, c?.alias].filter(Boolean).join(' · ') || 'Cliente'
      if (!porCliente.has(cid)) {
        porCliente.set(cid, { cliente_id: cid, nombre, ops: 0, ganancia: 0 })
      }
      const pc = porCliente.get(cid)
      pc.ops += 1
      pc.ganancia += g
    }
  }

  const semanas = Array.from(porSemana.values())
    .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime())
    .map((w) => ({
      ...w,
      etiqueta: etiquetaSemana(w.weekStart),
    }))

  const clientesArr = Array.from(porCliente.values())
  const topClientesGanancia = [...clientesArr].sort((a, b) => b.ganancia - a.ganancia).slice(0, 20)
  const topClientesOps = [...clientesArr].sort((a, b) => b.ops - a.ops).slice(0, 20)

  return {
    totalOperaciones: rows.length,
    gananciaTotal,
    porTipo,
    porEstado,
    opsPropias,
    opsInter,
    semanas,
    topClientesGanancia,
    topClientesOps,
    clientesConOperacion: clientesArr.length,
  }
}

/**
 * @returns {{ error: string|null, data: object|null }}
 */
export async function fetchReportesResumen() {
  try {
    const [rows, countCli] = await Promise.all([
      fetchAllOperacionesReporte(),
      supabase.from('clientes').select('id', { count: 'exact', head: true }),
    ])

    const built = buildFromRows(rows)
    const totalClientes = countCli.error ? null : countCli.count ?? 0

    return {
      error: null,
      data: {
        ...built,
        totalClientes,
        errorClientes: countCli.error?.message ?? null,
      },
    }
  } catch (e) {
    return { error: e?.message ?? String(e), data: null }
  }
}
