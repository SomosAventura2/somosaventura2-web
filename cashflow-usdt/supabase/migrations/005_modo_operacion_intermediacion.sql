-- Opción A — intermediación: solo la comisión genera movimiento en caja.
-- Idempotente: solo añade la columna si no existe.

alter table public.operaciones
  add column if not exists modo_operacion text not null default 'propio';

alter table public.operaciones
  add column if not exists comision_moneda text;

-- Valores permitidos: propio | intermediacion (validación también en la app)
comment on column public.operaciones.modo_operacion is
  'propio: ingreso+egreso del principal en caja. intermediacion: un solo ingreso = comisión neta; montos como registro.';

comment on column public.operaciones.comision_moneda is
  'Si intermediacion: moneda en la que ingresó la comisión a caja (USD o USDT).';
