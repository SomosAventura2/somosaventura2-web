export function formatMoney(value, moneda = 'USD') {
  const n = Number(value)
  if (Number.isNaN(n)) return '—'
  if (moneda === 'USDT') {
    return `${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} USDT`
  }
  try {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: moneda === 'VES' || moneda === 'Bs' ? 'VES' : 'USD',
      maximumFractionDigits: 2,
    }).format(n)
  } catch {
    return `${n.toFixed(2)} ${moneda}`
  }
}

/** Número legible sin símbolo de moneda (vista previa / montos mixtos). */
export function formatNumber(value, maxFrac = 4) {
  const n = Number(value)
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: maxFrac })
}

export function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
