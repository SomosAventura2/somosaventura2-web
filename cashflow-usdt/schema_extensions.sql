-- Para bases ya creadas con el SQL antiguo (sin observacion, nota, cuentas_por_pagar, etc.)
create extension if not exists pgcrypto;

-- Opción A — intermediación (solo comisión en caja; ver supabase/migrations/005_*.sql)
alter table public.operaciones
  add column if not exists modo_operacion text not null default 'propio';

alter table public.operaciones
  add column if not exists comision_moneda text;

alter table operaciones add column if not exists observacion text;

alter table movimientos_caja add column if not exists nota text;

alter table cuentas_por_cobrar add column if not exists moneda text;
alter table cuentas_por_cobrar add column if not exists operacion_id uuid;

create table if not exists cuentas_por_pagar (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id),
  monto_total numeric,
  monto_pagado numeric default 0,
  saldo numeric,
  estado text,
  moneda text,
  operacion_id uuid references operaciones(id) on delete set null,
  created_at timestamp default now()
);
