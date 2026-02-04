/**
 * AIRPORT - Módulo Dashboard
 * Resumen financiero del mes, pedidos activos, últimos pedidos.
 */

import { supabase } from '../supabase.js';
import { getUserId } from './auth.js';
import { formatCurrency, formatDate } from '../utils.js';
import { showToast } from '../ui/toast.js';

export const DashboardModule = {
  async init(container) {
    this.container = container;
    container.innerHTML = '<div class="dashboard-loading">Cargando...</div>';
    await this.loadDashboardData();
    this.setupEventListeners();
  },

  async loadDashboardData() {
    const userId = await getUserId();
    if (!userId) {
      this.container.innerHTML = '<p class="page-placeholder--error">No hay sesión.</p>';
      return;
    }

    try {
      const [summary, recentOrders] = await Promise.all([
        this.getFinancialSummary(userId),
        this.getRecentOrders(userId),
      ]);
      this.renderSummary(summary);
      this.renderRecentOrders(recentOrders);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      showToast('Error cargando dashboard', 'error');
      this.container.innerHTML = '<p class="page-placeholder--error">Error al cargar los datos.</p>';
    }
  },

  async getFinancialSummary(userId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

    const [paymentsRes, expensesRes, ordersRes] = await Promise.all([
      supabase
        .from('payments')
        .select('amount_eur')
        .eq('user_id', userId)
        .gte('payment_date', startOfMonth)
        .lte('payment_date', endOfMonth),
      supabase
        .from('expenses')
        .select('amount_eur')
        .eq('user_id', userId)
        .gte('expense_date', startOfMonth)
        .lte('expense_date', endOfMonth),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['agendado', 'en_produccion']),
    ]);

    const totalIncome = (paymentsRes.data || []).reduce((s, p) => s + (Number(p.amount_eur) || 0), 0);
    const totalExpenses = (expensesRes.data || []).reduce((s, e) => s + (Number(e.amount_eur) || 0), 0);
    const activeOrders = ordersRes.count ?? 0;
    const profit = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      activeOrders,
      profit,
    };
  },

  async getRecentOrders(userId) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) throw error;
    return data || [];
  },

  renderSummary(summary) {
    const summaryEl = document.createElement('section');
    summaryEl.className = 'dashboard-summary';
    summaryEl.innerHTML = `
      <h2 class="dashboard-section-title">Resumen del mes</h2>
      <div class="dashboard-cards">
        <div class="dashboard-card dashboard-card--income">
          <span class="dashboard-card-label">Ingresos</span>
          <span class="dashboard-card-value">${formatCurrency(summary.totalIncome)}</span>
        </div>
        <div class="dashboard-card dashboard-card--expenses">
          <span class="dashboard-card-label">Gastos</span>
          <span class="dashboard-card-value">${formatCurrency(summary.totalExpenses)}</span>
        </div>
        <div class="dashboard-card dashboard-card--profit">
          <span class="dashboard-card-label">Ganancia neta</span>
          <span class="dashboard-card-value">${formatCurrency(summary.profit)}</span>
        </div>
        <div class="dashboard-card dashboard-card--orders">
          <span class="dashboard-card-label">Pedidos activos</span>
          <span class="dashboard-card-value">${summary.activeOrders}</span>
        </div>
      </div>
    `;
    const loading = this.container.querySelector('.dashboard-loading');
    if (loading) loading.remove();
    this.container.appendChild(summaryEl);
  },

  renderRecentOrders(orders) {
    const section = document.createElement('section');
    section.className = 'dashboard-recent';
    section.innerHTML = `
      <h2 class="dashboard-section-title">Últimos pedidos</h2>
      <div class="dashboard-orders-list" id="dashboard-orders-list"></div>
    `;
    this.container.appendChild(section);

    const list = section.querySelector('#dashboard-orders-list');
    if (!orders.length) {
      list.innerHTML = '<p class="dashboard-empty">No hay pedidos recientes.</p>';
      return;
    }
    list.innerHTML = orders
      .map(
        (o) => `
      <a href="#orders" class="dashboard-order-item" data-order-id="${o.id}">
        <span class="dashboard-order-ref">#${(o.reference || o.id).toString().slice(0, 8)}</span>
        <span class="dashboard-order-date">${formatDate(o.created_at)}</span>
        <span class="dashboard-order-total">${formatCurrency(o.total_eur ?? o.total ?? 0)}</span>
        <span class="dashboard-order-status dashboard-order-status--${(o.status || '').replace('_', '-')}">${(o.status || '—').replace('_', ' ')}</span>
      </a>
    `
      )
      .join('');
  },

  setupEventListeners() {
    // Navegación a pedidos ya está en los enlaces #orders
  },
};

export default DashboardModule;
