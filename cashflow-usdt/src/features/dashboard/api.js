import { supabase } from '../../lib/supabase.js'

const PAGE = 1000

async function fetchAllMovimientosCaja() {
  const all = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('movimientos_caja')
      .select('tipo, moneda, monto')
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

function normalizeMoneda(m) {
  if (m == null) return 'OTR'
  const u = String(m).trim().toUpperCase()
  if (u === 'VES' || u === 'BS' || u === 'BSS') return 'VES'
  if (u === 'USD') return 'USD'
  if (u === 'USDT') return 'USDT'
  return u
}

/** Saldos por moneda: ingreso suma, egreso resta, ajuste suma el monto tal cual (MVP). */
export function saldosDesdeMovimientos(rows) {
  const acc = { USD: 0, VES: 0, USDT: 0 }
  for (const r of rows) {
    const k = normalizeMoneda(r.moneda)
    const v = Number(r.monto) || 0
    let delta = 0
    if (r.tipo === 'ingreso') delta = v
    else if (r.tipo === 'egreso') delta = -v
    else if (r.tipo === 'ajuste') delta = v
    if (acc[k] === undefined) acc[k] = 0
    acc[k] += delta
  }
  return acc
}

/**
 * Métricas principales del inicio.
 * @returns {{ error: string|null, data: object|null }}
 */
export async function fetchDashboard() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const desde = start.toISOString()

  try {
    const [
      opsUltimas,
      opsHoy,
      opsPend,
      movs,
      cobrarRes,
    ] = await Promise.all([
      supabase
        .from('operaciones')
        .select('id, tipo, ganancia, estado, created_at, modo_operacion, comision_moneda')
        .order('created_at', { ascending: false })
        .limit(8),
      supabase.from('operaciones').select('ganancia').gte('created_at', desde),
      supabase
        .from('operaciones')
        .select('id', { count: 'exact', head: true })
        .in('estado', ['pendiente', 'parcial']),
      fetchAllMovimientosCaja(),
      supabase.from('cuentas_por_cobrar').select('saldo').gt('saldo', 0),
    ])

    if (opsUltimas.error) return { error: opsUltimas.error.message, data: null }

    const rows = opsUltimas.data ?? []
    const totUltimas = rows.reduce((a, r) => a + Number(r.ganancia ?? 0), 0)
    const gananciaDia = opsHoy.error
      ? null
      : (opsHoy.data ?? []).reduce((a, r) => a + Number(r.ganancia ?? 0), 0)
    const opsPendientes = opsPend.error ? null : opsPend.count ?? 0

    const caja = saldosDesdeMovimientos(movs)
    const cajaUsd = caja.USD ?? 0
    const cajaUsdt = caja.USDT ?? 0
    /** Suma numérica USD + USDT (referencia 1:1; no es tipo de cambio de mercado). */
    const cajaUsdUsdtNominal = cajaUsd + cajaUsdt

    const totalPorCobrar = cobrarRes.error
      ? null
      : (cobrarRes.data ?? []).reduce((a, r) => a + Number(r.saldo ?? 0), 0)

    return {
      error: null,
      data: {
        rows,
        totGananciaUltimas: totUltimas,
        gananciaDia,
        errorDia: opsHoy.error?.message ?? null,
        cajaUsd,
        cajaUsdt,
        cajaUsdUsdtNominal,
        totalPorCobrar,
        errorCobrar: cobrarRes.error?.message ?? null,
        opsPendientes,
        errorOpsPend: opsPend.error?.message ?? null,
      },
    }
  } catch (e) {
    return { error: e?.message ?? String(e), data: null }
  }
}
