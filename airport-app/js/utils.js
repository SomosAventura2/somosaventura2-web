/**
 * AIRPORT - Utilidades compartidas
 */

const CURRENCY_SYMBOL = '€';

/**
 * Formatea un número como moneda (ej. "50.00 €").
 * @param {number} amount - Cantidad
 * @param {string} [symbol] - Símbolo (por defecto €)
 * @returns {string}
 */
export function formatCurrency(amount, symbol = CURRENCY_SYMBOL) {
  if (amount == null || Number.isNaN(Number(amount))) return `0.00 ${symbol}`;
  const n = Number(amount);
  return `${n.toFixed(2)} ${symbol}`;
}

/**
 * Formatea una fecha como DD/MM/YYYY.
 * @param {string|Date} date - Fecha ISO o Date
 * @returns {string}
 */
export function formatDate(date) {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formatea una fecha con hora (DD/MM/YYYY HH:mm).
 * @param {string|Date} date - Fecha ISO o Date
 * @returns {string}
 */
export function formatDateTime(date) {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${h}:${m}`;
}

/**
 * Calcula el saldo pendiente de un pedido (total - pagos).
 * @param {object} order - Pedido con total_eur o similar
 * @param {Array<{ amount_eur: number }>} payments - Lista de pagos
 * @returns {number} - Saldo pendiente (>= 0)
 */
export function calculateOrderBalance(order, payments = []) {
  const total = Number(order?.total_eur ?? order?.total ?? 0) || 0;
  const paid = (payments || []).reduce((sum, p) => sum + (Number(p.amount_eur) || 0), 0);
  return Math.max(0, total - paid);
}

/** Referencia al overlay de loading global (se crea en showLoading) */
let loadingEl = null;

/**
 * Muestra un overlay de carga global.
 */
export function showLoading() {
  if (loadingEl) return;
  loadingEl = document.createElement('div');
  loadingEl.className = 'app-loading-overlay';
  loadingEl.setAttribute('aria-hidden', 'true');
  loadingEl.innerHTML = `
    <div class="app-loading-spinner" aria-hidden="true"></div>
    <p class="app-loading-text">Cargando...</p>
  `;
  document.body.appendChild(loadingEl);
}

/**
 * Oculta el overlay de carga global.
 */
export function hideLoading() {
  if (loadingEl?.parentNode) {
    loadingEl.parentNode.removeChild(loadingEl);
    loadingEl = null;
  }
}
