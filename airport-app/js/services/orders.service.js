/**
 * AIRPORT - Servicio de pedidos
 * CRUD, items, pagos y cálculos con Supabase (orders, order_items, payments).
 */

import { supabase } from '../supabase.js';
import { getUserId } from '../modules/auth.js';

const STATUS_VALUES = ['agendado', 'en_produccion', 'listo', 'entregado', 'cancelado'];

/** Flujo de estados permitidos (para validación en UI) */
export const STATUS_FLOW = {
  agendado: ['en_produccion', 'cancelado'],
  en_produccion: ['listo', 'cancelado'],
  listo: ['entregado', 'cancelado'],
  entregado: [],
  cancelado: [],
};

/**
 * Genera número de pedido (ej. ORD-20240115-001).
 */
function generateOrderNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const r = Math.floor(Math.random() * 1000);
  return `ORD-${y}${m}${d}-${String(r).padStart(3, '0')}`;
}

/**
 * Calcula subtotal y total a partir de items y descuento.
 */
function calculateTotals(items = [], discountEur = 0) {
  const subtotal = (items || []).reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.price_eur) || 0),
    0
  );
  const total = Math.max(0, subtotal - (Number(discountEur) || 0));
  return { subtotal_eur: subtotal, total_eur: total };
}

export const OrdersService = {
  STATUS_VALUES,

  async create(orderData) {
    const userId = await getUserId();
    if (!userId) throw new Error('No hay sesión');

    const items = orderData.items || [];
    const customerName = (orderData.customer_name || '').trim();
    if (!customerName) throw new Error('El nombre del cliente es obligatorio');
    if (!items.length) throw new Error('Debe agregar al menos un item al pedido');

    const discountEur = Number(orderData.discount_eur) || 0;
    const { subtotal_eur, total_eur } = calculateTotals(items, discountEur);
    if (total_eur <= 0) throw new Error('El total debe ser mayor que 0');

    const orderPayload = {
      order_number: orderData.order_number || generateOrderNumber(),
      order_date: orderData.order_date || new Date().toISOString().slice(0, 10),
      customer_name: customerName,
      customer_contact: (orderData.customer_contact || '').trim() || null,
      status: orderData.status || 'agendado',
      delivery_date: orderData.delivery_date || null,
      discount_eur: discountEur,
      notes: (orderData.notes || '').trim() || null,
      source: (orderData.source || '').trim() || null,
      user_id: userId,
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderPayload)
      .select()
      .single();

    if (orderError) throw orderError;

    if (items.length > 0) {
      const rows = items.map((it) => ({
        order_id: order.id,
        category_id: it.category_id || null,
        description: (it.description || '').trim() || null,
        size: (it.size || '').trim() || null,
        color: (it.color || '').trim() || null,
        quantity: Number(it.quantity) || 1,
        price_eur: Number(it.price_eur) || 0,
      }));
      const { error: itemsError } = await supabase.from('order_items').insert(rows);
      if (itemsError) throw itemsError;
    }

    return order;
  },

  async update(orderId, orderData) {
    const userId = await getUserId();
    if (!userId) throw new Error('No hay sesión');

    const items = orderData.items || [];
    const customerName = (orderData.customer_name || '').trim();
    if (!customerName) throw new Error('El nombre del cliente es obligatorio');
    if (!items.length) throw new Error('Debe haber al menos un item');

    const discountEur = Number(orderData.discount_eur) || 0;
    const { subtotal_eur, total_eur } = calculateTotals(items, discountEur);

    const { error: orderError } = await supabase
      .from('orders')
      .update({
        order_date: orderData.order_date || new Date().toISOString().slice(0, 10),
        customer_name: (orderData.customer_name || '').trim() || null,
        customer_contact: (orderData.customer_contact || '').trim() || null,
        status: orderData.status,
        discount_eur: discountEur,
        notes: (orderData.notes || '').trim() || null,
        source: (orderData.source || '').trim() || null,
        delivery_date: orderData.delivery_date || null,
      })
      .eq('id', orderId)
      .eq('user_id', userId);

    if (orderError) throw orderError;

    await supabase.from('order_items').delete().eq('order_id', orderId);

    if (items.length > 0) {
      const rows = items.map((it) => ({
        order_id: orderId,
        category_id: it.category_id || null,
        description: (it.description || '').trim() || null,
        size: (it.size || '').trim() || null,
        color: (it.color || '').trim() || null,
        quantity: Number(it.quantity) || 1,
        price_eur: Number(it.price_eur) || 0,
      }));
      const { error: itemsError } = await supabase.from('order_items').insert(rows);
      if (itemsError) throw itemsError;
    }

    return this.getOrderWithDetails(orderId);
  },

  async getById(orderId) {
    return this.getOrderWithDetails(orderId);
  },

  async getOrderWithDetails(orderId) {
    const userId = await getUserId();
    if (!userId) throw new Error('No hay sesión');

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (orderError || !order) throw orderError || new Error('Pedido no encontrado');

    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('id', { ascending: true });

    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('payment_date', { ascending: false });

    let totalEur = Number(order.total_eur);
    if (totalEur == null || Number.isNaN(totalEur) || totalEur === 0) {
      const fromItems = (items || []).reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.price_eur) || 0), 0);
      const discount = Number(order.discount_eur) || 0;
      totalEur = Math.max(0, fromItems - discount);
    }
    const totalPaid = (payments || []).reduce((s, p) => s + (Number(p.amount_eur) || 0), 0);
    const balance = Math.max(0, totalEur - totalPaid);
    const paidPercentage = totalEur > 0 ? (totalPaid / totalEur) * 100 : 0;

    return {
      ...order,
      total_eur: totalEur,
      items: items || [],
      payments: payments || [],
      total_paid: totalPaid,
      balance,
      paid_percentage: paidPercentage,
    };
  },

  async list(filters = {}) {
    const userId = await getUserId();
    if (!userId) throw new Error('No hay sesión');

    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('order_date', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.startDate) query = query.gte('order_date', filters.startDate);
    if (filters.endDate) query = query.lte('order_date', filters.endDate);
    if (filters.search) {
      query = query.or(
        `customer_name.ilike.%${filters.search}%,order_number.ilike.%${filters.search}%`
      );
    }

    const page = filters.page ?? 0;
    const limit = filters.limit ?? 20;
    const from = page * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: orders, error, count } = await query;
    if (error) throw error;
    const list = orders || [];

    // Enriquecer con saldo (total_paid, balance) por pedido
    if (list.length > 0) {
      const orderIds = list.map((o) => o.id);
      const { data: payments } = await supabase
        .from('payments')
        .select('order_id, amount_eur')
        .eq('user_id', userId)
        .in('order_id', orderIds);
      const paidByOrder = {};
      (payments || []).forEach((p) => {
        paidByOrder[p.order_id] = (paidByOrder[p.order_id] || 0) + (Number(p.amount_eur) || 0);
      });
      const data = list.map((o) => {
        const total_paid = paidByOrder[o.id] || 0;
        const balance = Math.max(0, (Number(o.total_eur) || 0) - total_paid);
        return { ...o, total_paid, balance };
      });
      return { data, count: count ?? 0 };
    }
    return { data: list, count: count ?? 0 };
  },

  async addItem(orderId, itemData) {
    const userId = await getUserId();
    if (!userId) throw new Error('No hay sesión');
    const q = Number(itemData.quantity) || 1;
    const p = Number(itemData.price_eur) || 0;
    if (q <= 0 || p < 0) throw new Error('Cantidad y precio deben ser positivos');
    const { data: item, error } = await supabase
      .from('order_items')
      .insert({
        order_id: orderId,
        category_id: itemData.category_id || null,
        description: (itemData.description || '').trim() || null,
        size: (itemData.size || '').trim() || null,
        color: (itemData.color || '').trim() || null,
        quantity: q,
        price_eur: p,
      })
      .select()
      .single();
    if (error) throw error;
    await this.recalculateOrderTotal(orderId, userId);
    return item;
  },

  async updateItem(itemId, itemData) {
    const userId = await getUserId();
    if (!userId) throw new Error('No hay sesión');
    const q = Number(itemData.quantity) || 1;
    const p = Number(itemData.price_eur) || 0;
    if (q <= 0 || p < 0) throw new Error('Cantidad y precio deben ser positivos');
    const { data: item, error } = await supabase
      .from('order_items')
      .update({
        category_id: itemData.category_id || null,
        description: (itemData.description || '').trim() || null,
        size: (itemData.size || '').trim() || null,
        color: (itemData.color || '').trim() || null,
        quantity: q,
        price_eur: p,
      })
      .eq('id', itemId)
      .select()
      .single();
    if (error) throw error;
    const { data: o } = await supabase.from('order_items').select('order_id').eq('id', itemId).single();
    if (o?.order_id) await this.recalculateOrderTotal(o.order_id, userId);
    return item;
  },

  async deleteItem(itemId) {
    const userId = await getUserId();
    if (!userId) throw new Error('No hay sesión');
    const { data: row } = await supabase.from('order_items').select('order_id').eq('id', itemId).single();
    const { error } = await supabase.from('order_items').delete().eq('id', itemId);
    if (error) throw error;
    if (row?.order_id) await this.recalculateOrderTotal(row.order_id, userId);
  },

  async recalculateOrderTotal(orderId, userId) {
  },

  async getPayments(orderId) {
    const userId = await getUserId();
    if (!userId) throw new Error('No hay sesión');
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .eq('user_id', userId)
      .order('payment_date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async addPayment(orderId, paymentData) {
    const { PaymentsService } = await import('./payments.service.js');
    const balance = await this.getBalance(orderId);
    const amount = Number(paymentData.amount_eur) || 0;
    if (amount <= 0) throw new Error('El monto debe ser mayor que 0');
    if (amount > balance) throw new Error('El monto no puede superar el saldo pendiente');
    return PaymentsService.create(orderId, paymentData);
  },

  async getOrderSummary(orderId) {
    return this.getOrderWithDetails(orderId);
  },

  async calculateBalance(orderId) {
    return this.getBalance(orderId);
  },

  /** Categorías de producto para select en items */
  async getCategories() {
    await getUserId();
    const { data, error } = await supabase.from('product_categories').select('id, name').order('name');
    if (error) return [];
    return data || [];
  },

  async delete(orderId) {
    const userId = await getUserId();
    if (!userId) throw new Error('No hay sesión');
    await supabase.from('order_items').delete().eq('order_id', orderId);
    await supabase.from('payments').delete().eq('order_id', orderId);
    const { error } = await supabase.from('orders').delete().eq('id', orderId).eq('user_id', userId);
    if (error) throw error;
  },

  async updateStatus(orderId, status) {
    const userId = await getUserId();
    if (!userId) throw new Error('No hay sesión');
    if (!STATUS_VALUES.includes(status)) throw new Error('Estado no válido');
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getBalance(orderId) {
    const full = await this.getOrderWithDetails(orderId);
    return full.balance;
  },
};
