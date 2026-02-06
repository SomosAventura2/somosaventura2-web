-- Añadir método de pago a la tabla payments (BS = pago móvil, USD = efectivo/zelle, USDT = usdt)
alter table payments
add column if not exists payment_method text;
