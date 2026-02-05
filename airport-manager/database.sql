-- =============================================
-- AIRPORT MANAGER - DATABASE SCHEMA
-- Para ejecutar en Supabase SQL Editor
-- =============================================

-- Habilitar extensiones necesarias
create extension if not exists "uuid-ossp";

-- =============================================
-- TABLA: orders (Pedidos)
-- =============================================
create table orders (
    id uuid default uuid_generate_v4() primary key,
    order_number serial unique not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    customer_name text not null,
    items jsonb not null default '[]'::jsonb,
    amount_euros numeric(10,2) not null,
    first_payment_percentage integer not null check (first_payment_percentage in (50, 100)),
    payment_amount numeric(10,2) not null,
    payment_currency text not null check (payment_currency in ('BS', 'USD', 'USDT')),
    payment_method text not null,
    status text not null default 'agendado' check (status in ('agendado', 'en_produccion', 'listo', 'entregado', 'cancelado')),
    delivery_date date not null,
    calendar_date date not null,
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Índices para orders
create index orders_status_idx on orders(status);
create index orders_delivery_date_idx on orders(delivery_date);
create index orders_calendar_date_idx on orders(calendar_date);
create index orders_created_at_idx on orders(created_at desc);
create index orders_customer_name_idx on orders(customer_name);

-- =============================================
-- TABLA: payments (Pagos)
-- =============================================
create table payments (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    order_id uuid references orders(id) on delete cascade,
    concept text not null,
    payment_type text not null check (payment_type in ('inicial_50', 'restante_50')),
    amount numeric(10,2) not null,
    currency text not null check (currency in ('BS', 'USD', 'USDT')),
    reference text
);

-- Índices para payments
create index payments_order_id_idx on payments(order_id);
create index payments_created_at_idx on payments(created_at desc);

-- =============================================
-- TABLA: expenses (Gastos)
-- =============================================
create table expenses (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    order_id uuid references orders(id) on delete set null,
    concept text not null,
    expense_type text not null check (expense_type in ('orden_especifico', 'general')),
    amount numeric(10,2) not null,
    currency text not null check (currency in ('BS', 'USD')),
    reference text
);

-- Índices para expenses
create index expenses_order_id_idx on expenses(order_id);
create index expenses_created_at_idx on expenses(created_at desc);
create index expenses_expense_type_idx on expenses(expense_type);

-- =============================================
-- TABLA: product_categories (Categorías de Productos)
-- =============================================
create table product_categories (
    id uuid default uuid_generate_v4() primary key,
    name text not null unique,
    active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insertar categorías por defecto
insert into product_categories (name) values
    ('Franela'),
    ('Hoodie'),
    ('Cortaviento'),
    ('Estampado/Bordado'),
    ('Tote Bag'),
    ('Otro');

-- =============================================
-- FUNCIONES: Auto-actualizar updated_at
-- =============================================
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

-- Trigger para orders
create trigger update_orders_updated_at
    before update on orders
    for each row
    execute function update_updated_at_column();

-- =============================================
-- POLÍTICAS RLS (Row Level Security)
-- =============================================

-- Habilitar RLS en todas las tablas
alter table orders enable row level security;
alter table payments enable row level security;
alter table expenses enable row level security;
alter table product_categories enable row level security;

-- Políticas para orders (todos los usuarios autenticados pueden hacer todo)
create policy "Users can view all orders" on orders
    for select to authenticated using (true);

create policy "Users can insert orders" on orders
    for insert to authenticated with check (true);

create policy "Users can update orders" on orders
    for update to authenticated using (true);

create policy "Users can delete orders" on orders
    for delete to authenticated using (true);

-- Políticas para payments
create policy "Users can view all payments" on payments
    for select to authenticated using (true);

create policy "Users can insert payments" on payments
    for insert to authenticated with check (true);

create policy "Users can update payments" on payments
    for update to authenticated using (true);

create policy "Users can delete payments" on payments
    for delete to authenticated using (true);

-- Políticas para expenses
create policy "Users can view all expenses" on expenses
    for select to authenticated using (true);

create policy "Users can insert expenses" on expenses
    for insert to authenticated with check (true);

create policy "Users can update expenses" on expenses
    for update to authenticated using (true);

create policy "Users can delete expenses" on expenses
    for delete to authenticated using (true);

-- Políticas para product_categories
create policy "Users can view all categories" on product_categories
    for select to authenticated using (true);

create policy "Users can insert categories" on product_categories
    for insert to authenticated with check (true);

create policy "Users can update categories" on product_categories
    for update to authenticated using (true);

create policy "Users can delete categories" on product_categories
    for delete to authenticated using (true);

-- =============================================
-- VISTAS ÚTILES (Opcionales)
-- =============================================

-- Vista de pedidos con totales de pagos
create or replace view orders_with_payments as
select 
    o.*,
    coalesce(sum(p.amount), 0) as total_paid,
    o.amount_euros - coalesce(sum(p.amount), 0) as remaining_balance
from orders o
left join payments p on o.id = p.order_id
group by o.id;

-- Vista de resumen financiero mensual
create or replace view monthly_financial_summary as
select 
    date_trunc('month', created_at) as month,
    sum(case when currency = 'BS' then amount else 0 end) as total_bs,
    sum(case when currency in ('USD', 'USDT') then amount else 0 end) as total_usd
from payments
group by date_trunc('month', created_at)
order by month desc;

-- =============================================
-- COMENTARIOS FINALES
-- =============================================
comment on table orders is 'Tabla principal de pedidos';
comment on table payments is 'Registro de pagos recibidos';
comment on table expenses is 'Registro de gastos del negocio';
comment on table product_categories is 'Categorías de productos disponibles';
