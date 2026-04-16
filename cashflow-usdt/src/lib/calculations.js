/**
 * Venta USD → USDT: USDT neto a enviar. Bruto USDT = USD × tasa (USDT por 1 USD; si no hay tasa = 1).
 * El % se descuenta del bruto: neto = bruto × (100 − %) / 100.
 * @returns {number|null} null si faltan datos o % inválido
 */
export function calcularUsdtNetoVentaUsd({ montoUsd, comisionPct, tasa }) {
  const usd = Number(montoUsd) || 0
  const pct = Number(comisionPct) || 0
  const tasaNum = tasa === '' || tasa == null ? 1 : Number(tasa)
  const rate = Number.isFinite(tasaNum) && tasaNum > 0 ? tasaNum : 1
  if (usd <= 0 || pct <= 0 || pct >= 100) return null
  const brutoUsdt = usd * rate
  return (brutoUsdt * (100 - pct)) / 100
}

/**
 * Modo “fijo USDT”: el cliente recibe ese USDT neto y la comisión % va **aparte en efectivo USD**
 * sobre el nominal en USD (equiv. USDT ÷ tasa), mismo criterio que multiplicar por 1,05 para 5 % con tasa 1.
 * USD = (USDT_neto / tasa) × (100 + %) / 100  (tasa = USDT por 1 USD; vacío = 1)
 *
 * No usar net/(1−%/100): eso es “margen” sobre el bruto y da 200/0,95 ≈ 210,53.
 */
export function calcularUsdEntradaDesdeUsdtNeto({ montoUsdtNeto, comisionPct, tasa }) {
  const net = Number(montoUsdtNeto) || 0
  const pct = Number(comisionPct) || 0
  const tasaNum = tasa === '' || tasa == null ? 1 : Number(tasa)
  const rate = Number.isFinite(tasaNum) && tasaNum > 0 ? tasaNum : 1
  if (net <= 0 || pct < 0) return null
  return ((net / rate) * (100 + pct)) / 100
}

/**
 * Compra USDT → USD: el cliente entrega USDT (entrada); el % se descuenta del bruto en USD equivalente.
 * Bruto USD = USDT / tasa; USD neto a pagar = bruto × (100 − %) / 100 (tasa = USDT por 1 USD; vacío = 1).
 */
export function calcularUsdNetoCompraUsdt({ montoUsdt, comisionPct, tasa }) {
  const usdt = Number(montoUsdt) || 0
  const pct = Number(comisionPct) || 0
  const tasaNum = tasa === '' || tasa == null ? 1 : Number(tasa)
  const rate = Number.isFinite(tasaNum) && tasaNum > 0 ? tasaNum : 1
  if (usdt <= 0 || pct <= 0 || pct >= 100) return null
  const brutoUsd = usdt / rate
  return (brutoUsd * (100 - pct)) / 100
}

/**
 * Modo “fijo USD” (compra): el cliente recibe ese USD neto; la comisión % va **aparte en USDT**
 * sobre el nominal (USD × tasa), mismo criterio que multiplicar por 1,05 para 5 % con tasa 1.
 * USDT = USD_neto × tasa × (100 + %) / 100
 */
export function calcularUsdtEntradaDesdeUsdNetoCompra({ montoUsdNeto, comisionPct, tasa }) {
  const net = Number(montoUsdNeto) || 0
  const pct = Number(comisionPct) || 0
  const tasaNum = tasa === '' || tasa == null ? 1 : Number(tasa)
  const rate = Number.isFinite(tasaNum) && tasaNum > 0 ? tasaNum : 1
  if (net <= 0 || pct < 0) return null
  return (net * rate * (100 + pct)) / 100
}

/**
 * Venta típica: cobras USD, entregas USDT **neto** al cliente; el % es sobre el USDT **bruto** del pedido.
 * Ej. 5% sobre bruto 200 → envías 190; comisión = 190 × 5 / (100 − 5) = 10 (no 190 × 5%).
 */
function comisionVentaUsdtNetoContraUsd({
  monedaEntrada,
  monedaSalida,
  montoSalidaNeto,
  comisionPct,
  comisionFija,
}) {
  const me = String(monedaEntrada ?? '').toUpperCase()
  const ms = String(monedaSalida ?? '').toUpperCase()
  const net = Number(montoSalidaNeto) || 0
  const pct = Number(comisionPct) || 0
  const fija = Number(comisionFija) || 0
  if (pct > 0 && pct < 100 && me === 'USD' && ms === 'USDT') {
    return (net * pct) / (100 - pct) + fija
  }
  return (net * pct) / 100 + fija
}

/**
 * Comisión neta (%, fija).
 * Compra: % sobre monto entrada.
 * Venta: si USD→USDT con `ventaUsdtFijoSalida`, % sobre nominal USD (USDT÷tasa) aparte; si no, USD→USDT
 * usa bruto inferido desde USDT neto; resto % sobre monto salida.
 * Compra: si USDT→USD con `compraUsdFijoSalida`, % sobre nominal USDT (USD×tasa) aparte; si no, % sobre entrada.
 */
export function comisionNetaDesdeMontos({
  tipo,
  montoEntrada = 0,
  montoSalida = 0,
  monedaEntrada,
  monedaSalida,
  comisionPct = 0,
  comisionFija = 0,
  ventaUsdtFijoSalida = false,
  compraUsdFijoSalida = false,
  tasa,
}) {
  const pct = Number(comisionPct) || 0
  const fija = Number(comisionFija) || 0
  const me = String(monedaEntrada ?? '').toUpperCase()
  const ms = String(monedaSalida ?? '').toUpperCase()

  /** USD neto fijo (compra): comisión % sobre el nominal en USDT (USD×tasa), aparte. */
  if (tipo === 'compra' && compraUsdFijoSalida && me === 'USDT' && ms === 'USD') {
    const usdNet = Number(montoSalida) || 0
    const tasaNum = tasa === '' || tasa == null ? 1 : Number(tasa)
    const rate = Number.isFinite(tasaNum) && tasaNum > 0 ? tasaNum : 1
    return usdNet * rate * (pct / 100) + fija
  }

  /** USDT neto fijo: comisión % sobre el nominal en USD (equiv. USDT/rate), aparte en efectivo. */
  if (tipo === 'venta' && ventaUsdtFijoSalida && me === 'USD' && ms === 'USDT') {
    const net = Number(montoSalida) || 0
    const tasaNum = tasa === '' || tasa == null ? 1 : Number(tasa)
    const rate = Number.isFinite(tasaNum) && tasaNum > 0 ? tasaNum : 1
    return (net / rate) * (pct / 100) + fija
  }

  if (tipo === 'venta') {
    return comisionVentaUsdtNetoContraUsd({
      monedaEntrada,
      monedaSalida,
      montoSalidaNeto: montoSalida,
      comisionPct,
      comisionFija: fija,
    })
  }

  const base = Number(montoEntrada) || 0
  return (base * pct) / 100 + fija
}

/**
 * @param {object} params
 * @param {number} params.monto
 * @param {number} [params.comisionPct]
 * @param {number} [params.comisionFija]
 * @param {'compra'|'venta'} params.tipo
 * @param {string} [params.moneda_entrada]
 * @param {string} [params.moneda_salida]
 * @param {number} [params.monto_entrada]
 * @param {number} [params.monto_salida]
 * @param {boolean} [params.cambio_auto_fijo_salida] fijar USDT en venta USD→USDT o USD en compra USDT→USD
 * @param {string|number} [params.tasa]
 */
export function calcularOperacion({
  monto,
  comisionPct = 0,
  comisionFija = 0,
  tipo,
  moneda_entrada,
  moneda_salida,
  monto_entrada,
  monto_salida,
  cambio_auto_fijo_salida,
  tasa,
}) {
  const me = String(moneda_entrada ?? '').toUpperCase()
  const ms = String(moneda_salida ?? '').toUpperCase()
  const ventaUsdtFijoSalida = tipo === 'venta' && !!cambio_auto_fijo_salida && me === 'USD' && ms === 'USDT'
  const compraUsdFijoSalida = tipo === 'compra' && !!cambio_auto_fijo_salida && me === 'USDT' && ms === 'USD'
  let costoReal = 0
  let ingresoReal = 0

  if (tipo === 'compra') {
    costoReal = monto + (monto * comisionPct) / 100 + comisionFija
  }

  if (tipo === 'venta') {
    const comision = comisionNetaDesdeMontos({
      tipo: 'venta',
      montoEntrada: monto_entrada ?? 0,
      montoSalida: monto_salida ?? monto,
      monedaEntrada: moneda_entrada,
      monedaSalida: moneda_salida,
      comisionPct,
      comisionFija,
      ventaUsdtFijoSalida,
      compraUsdFijoSalida,
      tasa,
    })
    ingresoReal = comision
    costoReal = 0
    return {
      costoReal,
      ingresoReal,
      ganancia: comision,
    }
  }

  const ganancia = ingresoReal - costoReal

  return {
    costoReal,
    ingresoReal,
    ganancia,
  }
}

/** Coherente con `montoParaCalculo` en la API (compra → entrada, venta → salida). */
export function armarVistaPrevia(form) {
  const modo = form.modo_operacion === 'intermediacion' ? 'intermediacion' : 'propio'
  const comisionPct = Number(form.comision_pct) || 0
  const comisionFija = Number(form.comision_fija) || 0
  const tipo = form.tipo
  const montoEntrada = Number(form.monto_entrada) || 0
  const montoSalida = Number(form.monto_salida) || 0

  const comisionNeta = comisionNetaDesdeMontos({
    tipo,
    montoEntrada,
    montoSalida,
    monedaEntrada: form.moneda_entrada,
    monedaSalida: form.moneda_salida,
    comisionPct,
    comisionFija,
    ventaUsdtFijoSalida:
      modo !== 'intermediacion' &&
      !!form.cambio_auto_fijo_salida &&
      tipo === 'venta' &&
      String(form.moneda_entrada ?? '').toUpperCase() === 'USD' &&
      String(form.moneda_salida ?? '').toUpperCase() === 'USDT',
    compraUsdFijoSalida:
      modo !== 'intermediacion' &&
      !!form.cambio_auto_fijo_salida &&
      tipo === 'compra' &&
      String(form.moneda_entrada ?? '').toUpperCase() === 'USDT' &&
      String(form.moneda_salida ?? '').toUpperCase() === 'USD',
    tasa: form.tasa,
  })

  if (modo === 'intermediacion') {
    return {
      modo,
      montoEntrada,
      montoSalida,
      comisionNeta,
      costoReal: 0,
      ingresoReal: comisionNeta,
      ganancia: comisionNeta,
    }
  }

  const monto = tipo === 'compra' ? montoEntrada : montoSalida

  const { costoReal, ingresoReal, ganancia } = calcularOperacion({
    monto,
    comisionPct,
    comisionFija,
    tipo,
    moneda_entrada: form.moneda_entrada,
    moneda_salida: form.moneda_salida,
    monto_entrada: montoEntrada,
    monto_salida: montoSalida,
    cambio_auto_fijo_salida:
      modo !== 'intermediacion' &&
      !!form.cambio_auto_fijo_salida &&
      ((tipo === 'venta' &&
        String(form.moneda_entrada ?? '').toUpperCase() === 'USD' &&
        String(form.moneda_salida ?? '').toUpperCase() === 'USDT') ||
        (tipo === 'compra' &&
          String(form.moneda_entrada ?? '').toUpperCase() === 'USDT' &&
          String(form.moneda_salida ?? '').toUpperCase() === 'USD')),
    tasa: form.tasa,
  })

  return {
    modo,
    montoEntrada,
    montoSalida,
    comisionNeta,
    costoReal,
    ingresoReal,
    ganancia,
  }
}
