/**
 * AIRPORT - Servicio de pagos
 * Registrar pagos a pedidos y consultar historial.
 */

import { supabase } from '../supabase.js';
import { getUserId } from '../modules/auth.js';

export const PaymentsService = {
  async listByOrder(orderId) {
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

  async create(orderId, paymentData) {
    const userId = await getUserId();
    if (!userId) throw new Error('No hay sesión');
    const amount = Number(paymentData.amount_eur);
    if (!amount || amount <= 0) throw new Error('El monto debe ser mayor que 0');

    const payload = {
      order_id: orderId,
      user_id: userId,
      payment_date: paymentData.payment_date || new Date().toISOString().slice(0, 10),
      amount_eur: amount,
      payment_method: (paymentData.payment_method || '').trim() || null,
      reference: (paymentData.reference || '').trim() || null,
      notes: (paymentData.notes || '').trim() || null,
      original_currency: (paymentData.original_currency || '').trim() || null,
      original_amount: paymentData.original_amount != null ? Number(paymentData.original_amount) : null,
    };

    const { data, error } = await supabase.from('payments').insert(payload).select().single();
    if (error) throw error;
    return data;
  },
};
