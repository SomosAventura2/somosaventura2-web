import { supabase } from '../../lib/supabase.js'

function notaCaja(nota) {
  if (!nota || typeof nota !== 'string') return null
  const t = nota.trim()
  if (!t) return null
  return t.length > 200 ? `${t.slice(0, 197)}…` : t
}

/**
 * Ingreso o egreso de caja sin operación (capital, gasto, retiro, etc.).
 */
export async function registrarMovimientoManual({ tipo, moneda, monto, nota }) {
  const t = tipo === 'egreso' ? 'egreso' : 'ingreso'
  const m = Number(monto)
  if (!Number.isFinite(m) || m <= 0) {
    throw new Error('El monto debe ser mayor que 0.')
  }
  if (moneda !== 'USD' && moneda !== 'USDT') {
    throw new Error('Elige USD o USDT.')
  }

  const row = {
    tipo: t,
    moneda,
    monto: m,
    operacion_id: null,
    nota: notaCaja(nota) ?? 'Ajuste manual de caja',
  }

  const { data, error } = await supabase.from('movimientos_caja').insert([row]).select('id').single()
  if (error) throw error
  return data
}

export async function fetchMovimientosCaja({ limit = 60 } = {}) {
  const { data, error } = await supabase
    .from('movimientos_caja')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}
