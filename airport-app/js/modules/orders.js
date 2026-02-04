/**
 * AIRPORT - Módulo de Pedidos (lista, crear/editar, detalle)
 * Mobile-first, delegación de eventos, integración con payments.
 */

import { OrdersService } from '../services/orders.service.js';
import { formatCurrency, formatDate } from '../utils.js';
import { showLoading, hideLoading } from '../utils.js';
import { openModal, closeModal } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import { navigateTo } from '../router.js';

const STATUS_LABELS = {
  agendado: 'Agendado',
  en_produccion: 'En producción',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || '—';
}

/** Badge HTML con color según estado */
function getStatusBadge(status) {
  const label = getStatusLabel(status);
  const slug = (status || '').replace('_', '-');
  return `<span class="order-card-status order-card-status--${slug}">${escapeHtml(label)}</span>`;
}

/** Calcula total del pedido: suma items - descuento */
function calculateOrderTotal(items, discount = 0) {
  const subtotal = (items || []).reduce(
    (s, it) => s + (Number(it.quantity) || 0) * (Number(it.price_eur) || 0),
    0
  );
  return { subtotal, total: Math.max(0, subtotal - (Number(discount) || 0)) };
}

function escapeHtml(text) {
  if (text == null) return '';
  const d = document.createElement('div');
  d.textContent = String(text);
  return d.innerHTML;
}

export const OrdersModule = {
  container: null,
  currentPage: 1,
  itemsPerPage: 20,
  currentFilters: {},

  async init(container, options = {}) {
    this.container = container;
    const { subRoute, param } = options;

    if (subRoute === 'new') {
      await this.renderOrderForm(null);
      return;
    }
    if (subRoute === 'detail' && param) {
      await this.renderOrderDetail(param);
      return;
    }
    await this.renderList();
  },

  destroy() {
    this.container = null;
  },

  async renderList() {
    const c = this.container;
    c.innerHTML = `
      <header class="orders-header">
        <h1 class="orders-title">Lista de Pedidos</h1>
        <div class="orders-toolbar">
          <input type="search" id="search-orders" class="form-input orders-search" placeholder="Buscar cliente o nº" aria-label="Buscar pedidos">
          <select id="status-filter" class="form-select orders-filter" aria-label="Filtrar por estado">
            <option value="">Todos</option>
            ${OrdersService.STATUS_VALUES.map((s) => `<option value="${s}">${getStatusLabel(s)}</option>`).join('')}
          </select>
          <input type="date" id="filter-start-date" class="form-input orders-filter-date" aria-label="Desde">
          <input type="date" id="filter-end-date" class="form-input orders-filter-date" aria-label="Hasta">
          <button type="button" id="orders-clear-filters" class="btn btn--secondary">Limpiar filtros</button>
          <a href="#orders/new" class="btn btn--primary orders-btn-new" id="new-order-btn">+ Nuevo</a>
        </div>
      </header>
      <div id="orders-container" class="orders-list"></div>
      <div id="orders-pagination" class="orders-pagination"></div>
    `;
    this.setupListListeners();
    await this.loadOrders();
  },

  async loadOrders() {
    try {
      showLoading();
      const { data, count } = await OrdersService.list({
        ...this.currentFilters,
        page: this.currentPage - 1,
        limit: this.itemsPerPage,
      });
      this.renderOrderCards(data);
      this.renderPagination(count);
    } catch (err) {
      showToast('Error cargando pedidos: ' + (err.message || ''), 'error');
      this.container.querySelector('#orders-container').innerHTML =
        '<p class="page-placeholder--error">Error al cargar.</p>';
    } finally {
      hideLoading();
    }
  },

  renderOrderCards(orders) {
    const el = this.container.querySelector('#orders-container');
    if (!el) return;
    if (!orders.length) {
      el.innerHTML = `
        <div class="orders-empty">
          <p>No hay pedidos registrados</p>
          <a href="#orders/new" class="btn btn--primary">Crear primer pedido</a>
        </div>
      `;
      return;
    }
    el.innerHTML = orders
      .map((order) => {
        const total = Number(order.total_eur) || 0;
        const num = escapeHtml(order.order_number || order.id?.slice(0, 8) || '—');
        const name = escapeHtml(order.customer_name || 'Sin nombre');
        const status = (order.status || '').replace('_', '-');
        return `
        <article class="order-card" data-order-id="${escapeHtml(order.id)}">
          <div class="order-card-header">
            <span class="order-card-number">#${num}</span>
            <span class="order-card-status order-card-status--${status}">${getStatusLabel(order.status)}</span>
          </div>
          <div class="order-card-body">
            <h3 class="order-card-customer">${name}</h3>
            <p class="order-card-meta"><span class="order-date">${formatDate(order.order_date)}</span> • <span class="order-contact">${escapeHtml(order.customer_contact || 'Sin contacto')}</span></p>
            <div class="order-totals">
              <span class="total">Total: ${formatCurrency(total)}</span>
              <span class="balance">Saldo: ${formatCurrency(order.balance ?? total)}</span>
            </div>
          </div>
          <div class="order-card-actions">
            <button type="button" class="btn btn--secondary btn--sm" data-action="view">Ver</button>
            <button type="button" class="btn btn--secondary btn--sm" data-action="edit">Editar</button>
          </div>
        </article>
      `;
      })
      .join('');
  },

  renderPagination(count) {
    const el = this.container.querySelector('#orders-pagination');
    if (!el) return;
    const totalPages = Math.ceil((count || 0) / this.itemsPerPage) || 1;
    if (totalPages <= 1) {
      el.innerHTML = '';
      return;
    }
    el.innerHTML = `
      <button type="button" class="btn btn--secondary btn--sm" id="orders-prev" ${this.currentPage <= 1 ? 'disabled' : ''}>Anterior</button>
      <span class="orders-page-info">Pág. ${this.currentPage} de ${totalPages}</span>
      <button type="button" class="btn btn--secondary btn--sm" id="orders-next" ${this.currentPage >= totalPages ? 'disabled' : ''}>Siguiente</button>
    `;
    el.querySelector('#orders-prev')?.addEventListener('click', () => {
      this.currentPage = Math.max(1, this.currentPage - 1);
      this.loadOrders();
    });
    el.querySelector('#orders-next')?.addEventListener('click', () => {
      this.currentPage = Math.min(totalPages, this.currentPage + 1);
      this.loadOrders();
    });
  },

  setupListListeners() {
    const c = this.container;
    const search = c.querySelector('#search-orders');
    const statusFilter = c.querySelector('#status-filter');
    const startDate = c.querySelector('#filter-start-date');
    const endDate = c.querySelector('#filter-end-date');
    let searchTimeout;
    const applyFilters = () => {
      this.currentFilters.search = search?.value?.trim() || null;
      this.currentFilters.status = statusFilter?.value || null;
      this.currentFilters.startDate = startDate?.value || null;
      this.currentFilters.endDate = endDate?.value || null;
      this.currentPage = 1;
      this.loadOrders();
    };
    if (search) {
      search.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(applyFilters, 300);
      });
    }
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);
    if (startDate) startDate.addEventListener('change', applyFilters);
    if (endDate) endDate.addEventListener('change', applyFilters);
    c.querySelector('#orders-clear-filters')?.addEventListener('click', () => {
      this.currentFilters = {};
      if (search) search.value = '';
      if (statusFilter) statusFilter.value = '';
      if (startDate) startDate.value = '';
      if (endDate) endDate.value = '';
      this.currentPage = 1;
      this.loadOrders();
    });
    c.querySelector('#new-order-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('orders', 'new');
    });
    c.addEventListener('click', (e) => {
      const card = e.target.closest('.order-card');
      if (!card) return;
      const id = card.dataset.orderId;
      const action = e.target.closest('[data-action]')?.dataset?.action;
      if (action && id) {
        e.preventDefault();
        navigateTo('orders', id);
      }
    });
  },

  async renderOrderDetail(orderId) {
    try {
      showLoading();
      const order = await OrdersService.getOrderWithDetails(orderId);
      this.container.innerHTML = await this.getDetailHTML(order);
      this.setupDetailListeners(orderId);
    } catch (err) {
      showToast('Error cargando pedido: ' + (err.message || ''), 'error');
      this.container.innerHTML = '<p class="page-placeholder--error">Pedido no encontrado.</p><a href="#orders" class="btn btn--primary">Volver a lista</a>';
    } finally {
      hideLoading();
    }
  },

  async getDetailHTML(order) {
    const itemsRows = (order.items || [])
      .map(
        (it) =>
          `<tr><td>${escapeHtml(it.description || '—')}</td><td>${it.quantity ?? 0}</td><td>${formatCurrency(it.price_eur)}</td><td>${formatCurrency(it.subtotal_eur ?? it.quantity * it.price_eur)}</td></tr>`
      )
      .join('');
    const paymentsRows = (order.payments || [])
      .map(
        (p) =>
          `<tr><td>${formatDate(p.payment_date)}</td><td>${formatCurrency(p.amount_eur)}</td><td>${escapeHtml(p.payment_method || '—')}</td></tr>`
      )
      .join('');
    const balance = order.balance ?? 0;
    const pct = order.paid_percentage ?? 0;
    return `
      <header class="orders-detail-header">
        <a href="#orders" class="orders-back">&larr; Lista</a>
        <h1 class="orders-title">#${escapeHtml(order.order_number || order.id?.slice(0, 8))}</h1>
      </header>
      <section class="orders-detail-section">
        <h2 class="orders-detail-h2">Cliente</h2>
        <p><strong>${escapeHtml(order.customer_name || '—')}</strong></p>
        <p>${escapeHtml(order.customer_contact || '—')}</p>
        <p>Origen: ${escapeHtml(order.source || '—')} · Fecha: ${formatDate(order.order_date)}</p>
        <p><span class="order-card-status order-card-status--${(order.status || '').replace('_', '-')}">${getStatusLabel(order.status)}</span></p>
        ${order.notes ? `<p class="orders-notes">${escapeHtml(order.notes)}</p>` : ''}
      </section>
      <section class="orders-detail-section">
        <h2 class="orders-detail-h2">Items (${(order.items || []).length})</h2>
        <div class="orders-detail-table-wrap">
          <table class="orders-table">
            <thead><tr><th>Descripción</th><th>Cant.</th><th>P. unit.</th><th>Subtotal</th></tr></thead>
            <tbody>${itemsRows || '<tr><td colspan="4">Sin items</td></tr>'}</tbody>
          </table>
        </div>
        <p class="orders-detail-total">Total: <strong>${formatCurrency(order.total_eur)}</strong></p>
      </section>
      <section class="orders-detail-section">
        <h2 class="orders-detail-h2">Pagos</h2>
        <div class="orders-detail-table-wrap">
          <table class="orders-table">
            <thead><tr><th>Fecha</th><th>Monto</th><th>Método</th></tr></thead>
            <tbody>${paymentsRows || '<tr><td colspan="3">Sin pagos</td></tr>'}</tbody>
          </table>
        </div>
        <p class="orders-detail-balance">Saldo: <strong>${formatCurrency(balance)}</strong> (${pct.toFixed(0)}% pagado)</p>
        <button type="button" class="btn btn--primary" id="btn-add-payment" data-order-id="${order.id}">+ Registrar pago</button>
      </section>
      <div class="orders-detail-actions">
        <a href="#orders/new" class="btn btn--secondary" id="btn-edit-order" data-order-id="${order.id}">Editar (form)</a>
        <button type="button" class="btn btn--secondary" id="btn-change-status" data-order-id="${order.id}">Cambiar estado</button>
      </div>
    `;
  },

  setupDetailListeners(orderId) {
    const c = this.container;
    c.querySelector('#btn-add-payment')?.addEventListener('click', () => {
      import('./payments.js').then(({ PaymentsModule }) => {
        PaymentsModule.showPaymentForm(orderId, () => this.renderOrderDetail(orderId));
      });
    });
    c.querySelector('#btn-edit-order')?.addEventListener('click', async (e) => {
      e.preventDefault();
      await this.renderOrderForm(orderId);
    });
    c.querySelector('#btn-change-status')?.addEventListener('click', async () => {
      const order = await OrdersService.getById(orderId);
      const current = order.status;
      const options = OrdersService.STATUS_VALUES.map(
        (s) => `<option value="${s}" ${s === current ? 'selected' : ''}>${getStatusLabel(s)}</option>`
      ).join('');
      const html = `
        <form id="status-form">
          <label class="form-label">Nuevo estado</label>
          <select name="status" class="form-select">${options}</select>
          <button type="submit" class="btn btn--primary">Guardar</button>
        </form>
      `;
      openModal(html, {
        title: 'Cambiar estado',
        onClose: () => this.renderOrderDetail(orderId),
      });
      document.getElementById('status-form')?.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const form = ev.target;
        const status = form.status.value;
        try {
          await OrdersService.updateStatus(orderId, status);
          showToast('Estado actualizado', 'success');
          closeModal();
          this.renderOrderDetail(orderId);
        } catch (err) {
          showToast(err.message || 'Error', 'error');
        }
      });
    });
  },

  async renderOrderForm(orderId) {
    const isEdit = !!orderId;
    let order = null;
    showLoading();
    let categories = [];
    try {
      const [cats, orderData] = await Promise.all([
        OrdersService.getCategories(),
        isEdit ? OrdersService.getOrderWithDetails(orderId) : Promise.resolve(null),
      ]);
      categories = cats || [];
      order = orderData;
    } catch (err) {
      showToast('Error cargando datos', 'error');
      navigateTo('orders');
      return;
    } finally {
      hideLoading();
    }
    const catOptions = (catId) =>
      categories
        .map(
          (c) =>
            `<option value="${c.id}" ${catId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
        )
        .join('');
    const items = order?.items || [];
    const itemsHtml = items.length
      ? items
          .map(
            (it, i) => `
        <div class="order-form-item" data-index="${i}">
          <select name="item_category_${i}" class="form-select"><option value="">—</option>${catOptions(it.category_id)}</select>
          <input type="text" name="item_description_${i}" value="${escapeHtml(it.description || '')}" placeholder="Descripción *" class="form-input">
          <input type="text" name="item_size_${i}" value="${escapeHtml(it.size || '')}" placeholder="Talla/Color" class="form-input">
          <input type="number" name="item_quantity_${i}" value="${it.quantity ?? 1}" min="1" placeholder="Cant *" class="form-input">
          <input type="number" name="item_price_${i}" value="${it.price_eur ?? 0}" min="0" step="0.01" placeholder="Precio € *" class="form-input">
          <span class="order-form-item-subtotal">${formatCurrency((it.quantity ?? 0) * (it.price_eur ?? 0))}</span>
          <button type="button" class="btn btn--secondary btn--sm order-form-remove-item">−</button>
        </div>
      `
          )
          .join('')
      : '';

    this.container.innerHTML = `
      <header class="orders-detail-header">
        <a href="#orders" class="orders-back">&larr; Lista</a>
        <h1 class="orders-title">${isEdit ? 'Editar pedido' : 'Nuevo pedido'}</h1>
      </header>
      <form id="order-form" class="order-form">
        <section class="orders-detail-section">
          <h2 class="orders-detail-h2">Datos cliente</h2>
          <div class="form-group">
            <label class="form-label">Fecha pedido</label>
            <input type="date" name="order_date" class="form-input" value="${order?.order_date ? order.order_date.slice(0, 10) : new Date().toISOString().slice(0, 10)}">
          </div>
          <div class="form-group">
            <label class="form-label">Nombre</label>
            <input type="text" name="customer_name" class="form-input" value="${escapeHtml(order?.customer_name || '')}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Contacto</label>
            <input type="text" name="customer_contact" class="form-input" value="${escapeHtml(order?.customer_contact || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Origen</label>
            <input type="text" name="source" class="form-input" value="${escapeHtml(order?.source || '')}" placeholder="Instagram, WhatsApp...">
          </div>
          <div class="form-group">
            <label class="form-label">Notas</label>
            <textarea name="notes" class="form-textarea" rows="2">${escapeHtml(order?.notes || '')}</textarea>
          </div>
        </section>
        <section class="orders-detail-section">
          <h2 class="orders-detail-h2">Items del pedido</h2>
          <div id="order-form-items">${itemsHtml}</div>
          <button type="button" class="btn btn--secondary" id="order-form-add-item">+ Agregar item</button>
          <div class="order-form-totals order-summary">
            <div class="summary-row"><span>Subtotal:</span><span id="subtotal-display">0.00 €</span></div>
            <div class="summary-row"><label class="form-label">Descuento (€)</label><input type="number" name="discount_eur" value="${order?.discount_eur ?? 0}" min="0" step="0.01" class="form-input" id="order-form-discount"></div>
            <div class="summary-row total"><span>Total:</span><span id="order-form-total">0.00 €</span></div>
          </div>
        </section>
        <section class="orders-detail-section">
          <div class="form-group">
            <label class="form-label">Fecha entrega</label>
            <input type="date" name="delivery_date" class="form-input" value="${order?.delivery_date ? order.delivery_date.slice(0, 10) : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Estado</label>
            <select name="status" class="form-select">
              ${OrdersService.STATUS_VALUES.map((s) => `<option value="${s}" ${(order?.status === s) ? 'selected' : ''}>${getStatusLabel(s)}</option>`).join('')}
            </select>
          </div>
        </section>
        <div class="orders-detail-actions">
          <a href="#orders" class="btn btn--secondary">Cancelar</a>
          <button type="submit" class="btn btn--primary">Guardar</button>
        </div>
      </form>
    `;

    if (isEdit) {
      this.container.querySelector('form').insertAdjacentHTML('afterbegin', `<input type="hidden" name="order_id" value="${order.id}">`);
    }

    this.setupFormListeners(orderId);
    this.updateFormTotal();
  },

  setupFormListeners(orderId) {
    const form = this.container.querySelector('#order-form');
    const itemsContainer = this.container.querySelector('#order-form-items');
    if (!form || !itemsContainer) return;

    let itemIndex = (form.querySelectorAll('.order-form-item')).length;

    const catOpts = categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    const addItem = () => {
      const div = document.createElement('div');
      div.className = 'order-form-item';
      div.dataset.index = itemIndex;
      div.innerHTML = `
        <select name="item_category_${itemIndex}" class="form-select"><option value="">—</option>${catOpts}</select>
        <input type="text" name="item_description_${itemIndex}" placeholder="Descripción *" class="form-input">
        <input type="text" name="item_size_${itemIndex}" placeholder="Talla/Color" class="form-input">
        <input type="number" name="item_quantity_${itemIndex}" value="1" min="1" placeholder="Cant *" class="form-input">
        <input type="number" name="item_price_${itemIndex}" value="0" min="0" step="0.01" placeholder="Precio € *" class="form-input">
        <span class="order-form-item-subtotal">0.00 €</span>
        <button type="button" class="btn btn--secondary btn--sm order-form-remove-item">−</button>
      `;
      itemsContainer.appendChild(div);
      itemIndex++;
      div.querySelector('.order-form-remove-item').addEventListener('click', () => {
        if (itemsContainer.querySelectorAll('.order-form-item').length > 1) div.remove();
        else showToast('Debe haber al menos un item', 'warning');
        this.updateFormTotal();
      });
      [...div.querySelectorAll('input'), ...div.querySelectorAll('select')].forEach((el) =>
        el.addEventListener('input', () => this.updateFormTotal())
      );
    };

    this.container.querySelector('#order-form-add-item')?.addEventListener('click', addItem);
    itemsContainer.querySelectorAll('.order-form-remove-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        btn.closest('.order-form-item')?.remove();
        this.updateFormTotal();
      });
    });
    form.querySelectorAll('input[type="number"], input[type="text"]').forEach((inp) => {
      inp.addEventListener('input', () => this.updateFormTotal());
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const items = [];
      // Recolectar ítems solo con campos permitidos (NO subtotal, subtotal_eur ni calculados)
      itemsContainer.querySelectorAll('.order-form-item').forEach((row) => {
        const desc = row.querySelector('input[name^="item_description"]')?.value?.trim();
        const q = Number(row.querySelector('input[name^="item_quantity"]')?.value) || 0;
        const p = Number(row.querySelector('input[name^="item_price"]')?.value) || 0;
        const catId = row.querySelector('select[name^="item_category"]')?.value?.trim() || null;
        const size = row.querySelector('input[name^="item_size"]')?.value?.trim() || '';
        items.push({
          category_id: catId || null,
          description: desc || '',
          size: size || null,
          color: '',
          quantity: q,
          price_eur: p,
        });
      });
      const validItems = items.filter((it) => (it.description && it.description.length) || it.quantity > 0 || it.price_eur > 0);
      const data = {
        order_date: form.querySelector('[name="order_date"]')?.value || new Date().toISOString().slice(0, 10),
        customer_name: form.querySelector('[name="customer_name"]')?.value,
        customer_contact: form.querySelector('[name="customer_contact"]')?.value,
        source: form.querySelector('[name="source"]')?.value,
        notes: form.querySelector('[name="notes"]')?.value,
        delivery_date: form.querySelector('[name="delivery_date"]')?.value || null,
        discount_eur: form.querySelector('[name="discount_eur"]')?.value || 0,
        status: form.querySelector('[name="status"]')?.value,
        items: validItems,
      };
      if (!data.customer_name?.trim()) {
        showToast('El nombre del cliente es obligatorio', 'warning');
        return;
      }
      if (!validItems.length) {
        showToast('Debe agregar al menos un item', 'warning');
        return;
      }
      const { total } = calculateOrderTotal(validItems, data.discount_eur);
      if (total <= 0) {
        showToast('El total debe ser mayor que 0', 'warning');
        return;
      }
      try {
        showLoading();
        if (orderId) {
          await OrdersService.update(orderId, data);
          showToast('Pedido actualizado', 'success');
        } else {
          await OrdersService.create(data);
          showToast('Pedido creado', 'success');
        }
        navigateTo('orders');
      } catch (err) {
        showToast(err.message || 'Error al guardar', 'error');
      } finally {
        hideLoading();
      }
    });
  },

  updateFormTotal() {
    const c = this.container;
    if (!c) return;
    const items = [];
    c.querySelectorAll('.order-form-item').forEach((row) => {
      const q = Number(row.querySelector('input[name^="item_quantity"]')?.value) || 0;
      const p = Number(row.querySelector('input[name^="item_price"]')?.value) || 0;
      const sub = q * p;
      items.push({ quantity: q, price_eur: p });
      const subEl = row.querySelector('.order-form-item-subtotal');
      if (subEl) subEl.textContent = formatCurrency(sub);
    });
    const discount = Number(c.querySelector('input[name="discount_eur"]')?.value) || 0;
    const { subtotal, total } = calculateOrderTotal(items, discount);
    const subDisplay = c.querySelector('#subtotal-display');
    if (subDisplay) subDisplay.textContent = formatCurrency(subtotal);
    const totalEl = c.querySelector('#order-form-total');
    if (totalEl) totalEl.textContent = formatCurrency(total);
  },
};

export default OrdersModule;
