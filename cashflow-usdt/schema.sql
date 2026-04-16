-- Proyecto nuevo: extensiones UUID
create extension if not exists pgcrypto;

create table clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text,
  telefono text,
  alias text,
  created_at timestamp default now()
);

create table operaciones (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id),

  tipo text,
  moneda_entrada text,
  moneda_salida text,

  monto_entrada numeric,
  monto_salida numeric,

  tasa numeric,
  comision_pct numeric,
  comision_fija numeric,

  costo_real numeric,
  ingreso_real numeric,
  ganancia numeric,

  estado text,
  observacion text,

  modo_operacion text not null default 'propio',
  comision_moneda text,

  created_at timestamp default now()
);

create table movimientos_caja (
  id uuid primary key default gen_random_uuid(),
  tipo text,
  moneda text,
  monto numeric,
  operacion_id uuid references operaciones(id) on delete set null,
  nota text,
  created_at timestamp default now()
);

create table cuentas_por_cobrar (
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

create table cuentas_por_pagar (
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

create table cierres_diarios (
  id uuid primary key default gen_random_uuid(),
  usd numeric,
  bs numeric,
  usdt numeric,
  ganancia_dia numeric,
  created_at timestamp default now()
);
