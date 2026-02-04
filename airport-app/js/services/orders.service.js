/**
 * AIRPORT - Servicio de pedidos
 * CRUD y lógica de negocio con Supabase (orders, order_items, payments).
 */

import { supabase } from '../supabase.js';
import { getUserId } from '../modules/auth.js';

const STATUS_VALUES = ['agendado', 'en_produccion', 'listo', 'entregado', 'cancelado'];

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
    const discountEur = Number(orderData.discount_eur) || 0;
    const { subtotal_eur, total_eur } = calculateTotals(items, discountEur);

    const orderPayload = {
      order_number: orderData.order_number || generateOrderNumber(),
      order_date: orderData.order_date || new Date().toISOString().slice(0, 10),
      customer_name: (orderData.customer_name || '').trim() || null,
      customer_contact: (orderData.customer_contact || '').trim() || null,
      status: orderData.status || 'agendado',
      total_eur: total_eur,
      subtotal_eur: subtotal_eur,
      discount_eur: discountEur,
      notes: (orderData.notes || '').trim() || null,
      source: (orderData.source || '').trim() || null,
      delivery_date: orderData.delivery_date || null,
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
        subtotal_eur: (Number(it.quantity) || 1) * (Number(it.price_eur) || 0),
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
    const discountEur = Number(orderData.discount_eur) || 0;
    const { subtotal_eur, total_eur } = calculateTotals(items, discountEur);

    const { error: orderError } = await supabase
      .from('orders')
      .update({
        order_date: orderData.order_date || new Date().toISOString().slice(0, 10),
        customer_name: (orderData.customer_name || '').trim() || null,
        customer_contact: (orderData.customer_contact || '').trim() || null,
        status: orderData.status,
        total_eur: total_eur,
        subtotal_eur: subtotal_eur,
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
        subtotal_eur: (Number(it.quantity) || 1) * (Number(it.price_eur) || 0),
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

    const totalPaid = (payments || []).reduce((s, p) => s + (Number(p.amount_eur) || 0), 0);
    const balance = Math.max(0, (Number(order.total_eur) || 0) - totalPaid);
    const paidPercentage =
      (Number(order.total_eur) || 0) > 0 ? (totalPaid / (Number(order.total_eur) || 0)) * 100 : 0;

    return {
      ...order,
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

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data || [], count: count ?? 0 };
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
