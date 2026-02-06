-- =============================================
-- Migración: Referencia Pago Móvil en pedidos
-- Ejecutar en Supabase → SQL Editor (si ya tienes la tabla orders)
-- =============================================

alter table orders
add column if not exists pago_movil_reference text;

comment on column orders.pago_movil_reference is 'Referencia del pago móvil (opcional, cuando payment_method = pago_movil)';
