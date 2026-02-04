/**
 * AIRPORT - Módulo de pagos
 * Modal para registrar pago (validando saldo), historial y cálculos.
 */

import { OrdersService } from '../services/orders.service.js';
import { formatCurrency, formatDate } from '../utils.js';
import { openModal, closeModal } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';

const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Zelle', 'PayPal', 'Pago móvil', 'Otro'];

function escapeHtml(text) {
  if (text == null) return '';
  const d = document.createElement('div');
  d.textContent = String(text);
  return d.innerHTML;
}

/** Calcula saldo pendiente y porcentaje pagado */
function calculateBalance(orderTotal, payments = []) {
  const total = Number(orderTotal) || 0;
  const totalPaid = (payments || []).reduce((s, p) => s + (Number(p.amount_eur) || 0), 0);
  const balance = Math.max(0, total - totalPaid);
  const paidPercentage = total > 0 ? (totalPaid / total) * 100 : 0;
  return { balance, totalPaid, paidPercentage };
}

export const PaymentsModule = {
  calculateBalance,

  /**
   * Abre el modal para registrar un pago al pedido.
   * Valida: monto > 0 y monto <= saldo pendiente (vía OrdersService.addPayment).
   */
  async showPaymentForm(orderId, onSaved) {
    let balance = 0;
    try {
      balance = await OrdersService.calculateBalance(orderId);
    } catch (e) {
      showToast('No se pudo cargar el saldo', 'error');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const formHtml = `
      <form id="payment-form" class="payment-form">
        <p class="payment-form-balance">Saldo pendiente: <strong>${formatCurrency(balance)}</strong></p>
        <div class="form-group">
          <label class="form-label">Monto (€) *</label>
          <input type="number" name="amount_eur" step="0.01" min="0.01" max="${balance}" required class="form-input" placeholder="0.00">
        </div>
        <div class="form-group">
          <label class="form-label">Fecha</label>
          <input type="date" name="payment_date" value="${today}" class="form-input">
        </div>
        <div class="form-group">
          <label class="form-label">Método de pago</label>
          <select name="payment_method" class="form-select">
            <option value="">—</option>
            ${PAYMENT_METHODS.map((m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Moneda original (opcional)</label>
          <input type="text" name="original_currency" class="form-input" placeholder="USD, VES...">
        </div>
        <div class="form-group">
          <label class="form-label">Monto original (opcional)</label>
          <input type="number" name="original_amount" step="0.01" class="form-input" placeholder="0.00">
        </div>
        <div class="form-group">
          <label class="form-label">Referencia / Notas</label>
          <input type="text" name="reference" class="form-input" placeholder="Nº referencia, concepto...">
        </div>
        <div class="form-group">
          <label class="form-label">Notas adicionales</label>
          <textarea name="notes" class="form-textarea" rows="2"></textarea>
        </div>
        <div class="payment-form-actions">
          <button type="button" class="btn btn--secondary" id="payment-form-cancel">Cancelar</button>
          <button type="submit" class="btn btn--primary">Registrar pago</button>
        </div>
      </form>
    `;

    openModal(formHtml, {
      title: 'Registrar pago',
      onClose: () => {
        if (typeof onSaved === 'function') onSaved();
      },
      closeOnBackdrop: true,
    });

    const form = document.getElementById('payment-form');
    if (!form) return;

    document.getElementById('payment-form-cancel')?.addEventListener('click', () => closeModal());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const payload = {
        amount_eur: fd.get('amount_eur'),
        payment_date: fd.get('payment_date'),
        payment_method: fd.get('payment_method'),
        reference: fd.get('reference'),
        notes: fd.get('notes'),
        original_currency: fd.get('original_currency'),
        original_amount: fd.get('original_amount'),
      };
      try {
        await OrdersService.addPayment(orderId, payload);
        showToast('Pago registrado', 'success');
        closeModal();
        if (typeof onSaved === 'function') onSaved();
      } catch (err) {
        showToast(err.message || 'Error al registrar pago', 'error');
      }
    });
  },

  /**
   * Renderiza el historial de pagos (HTML string) para incrustar en detalle de pedido.
   * El detalle de pedido ya usa OrdersService.getOrderWithDetails que trae payments;
   * este método es opcional para reutilizar en otros sitios.
   */
  renderPaymentHistory(payments) {
    if (!payments?.length) return '<p>Sin pagos registrados.</p>';
    const rows = payments
      .map(
        (p) =>
          `<tr><td>${formatDate(p.payment_date)}</td><td>${formatCurrency(p.amount_eur)}</td><td>${escapeHtml(p.payment_method || '—')}</td></tr>`
      )
      .join('');
    return `
      <table class="orders-table">
        <thead><tr><th>Fecha</th><th>Monto</th><th>Método</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  },
};

export default PaymentsModule;
