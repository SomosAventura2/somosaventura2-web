-- =============================================
-- AIRPORT MANAGER - DATABASE SCHEMA
-- Para ejecutar en Supabase SQL Editor
-- =============================================
-- Uso:
-- 1) Base nueva: ejecutar todo el script.
-- 2) Base ya creada y solo faltar Realtime: ejecutar solo el bloque
--    "REALTIME (Supabase)" al final.
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
    pago_movil_reference text,
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
    payment_method text,
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
-- TABLA: customers (Clientes)
-- =============================================
-- Al menos un contacto: phone o email
create table customers (
    id uuid default uuid_generate_v4() primary key,
    first_name text not null,
    last_name text not null,
    phone text,
    email text,
    tags text[] default '{}',
    preferred_payment_method text,
    preferred_size text,
    preferred_products jsonb default '[]'::jsonb,
    total_orders integer default 0 not null,
    total_spent_eur numeric(10,2) default 0 not null,
    avg_order_value numeric(10,2) default 0 not null,
    last_order_date date,
    first_order_date date,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    is_active boolean default true not null,
    constraint customers_contact_check check (
        (phone is not null and trim(phone) <> '') or (email is not null and trim(email) <> '')
    )
);

create index customers_name_idx on customers(lower(first_name), lower(last_name));
create index customers_phone_idx on customers(phone);
create index customers_email_idx on customers(email);
create index customers_last_order_idx on customers(last_order_date desc nulls last);
create index customers_total_spent_idx on customers(total_spent_eur desc);

comment on table customers is 'Clientes: datos básicos, contacto, tags y stats auto-calculadas';

-- Vincular pedidos a cliente (opcional; customer_name se mantiene por compatibilidad)
alter table orders add column if not exists customer_id uuid references customers(id) on delete set null;
create index if not exists orders_customer_id_idx on orders(customer_id);

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
-- Sincronizar stats de customers con pedidos
-- =============================================
create or replace function recalc_customer_stats(p_customer_id uuid)
returns void as $$
begin
    update customers
    set
        total_orders = coalesce(d.cnt, 0),
        total_spent_eur = coalesce(d.tot, 0),
        avg_order_value = case when coalesce(d.cnt, 0) > 0 then coalesce(d.tot, 0) / d.cnt else 0 end,
        last_order_date = d.last_d,
        first_order_date = d.first_d
    from (
        select
            count(*)::int as cnt,
            coalesce(sum(amount_euros), 0) as tot,
            max(delivery_date) as last_d,
            min((created_at at time zone 'utc')::date) as first_d
        from orders
        where customer_id = p_customer_id
          and status is distinct from 'cancelado'
    ) d
    where id = p_customer_id;
end;
$$ language plpgsql security definer;

create or replace function sync_customer_stats_from_orders()
returns trigger as $$
declare
    cid uuid;
begin
    if (tg_op = 'INSERT' and new.customer_id is not null) then
        cid := new.customer_id;
    end if;
    if (tg_op = 'UPDATE') then
        if (old.customer_id is distinct from new.customer_id) then
            if old.customer_id is not null then
                perform recalc_customer_stats(old.customer_id);
            end if;
            if new.customer_id is not null then
                cid := new.customer_id;
            end if;
        elsif new.customer_id is not null then
            cid := new.customer_id;
        end if;
    end if;
    if (tg_op = 'DELETE' and old.customer_id is not null) then
        cid := old.customer_id;
    end if;
    if cid is not null then
        perform recalc_customer_stats(cid);
    end if;
    if tg_op = 'DELETE' then return old; end if;
    return new;
end;
$$ language plpgsql security definer;

create trigger orders_sync_customer_stats
    after insert or update of customer_id, status, amount_euros, delivery_date or delete
    on orders
    for each row
    execute function sync_customer_stats_from_orders();

-- =============================================
-- POLÍTICAS RLS (Row Level Security)
-- =============================================

-- Habilitar RLS en todas las tablas
alter table orders enable row level security;
alter table payments enable row level security;
alter table expenses enable row level security;
alter table product_categories enable row level security;
alter table customers enable row level security;

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

-- Políticas para customers
create policy "Users can view all customers" on customers
    for select to authenticated using (true);

create policy "Users can insert customers" on customers
    for insert to authenticated with check (true);

create policy "Users can update customers" on customers
    for update to authenticated using (true);

create policy "Users can delete customers" on customers
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
-- REALTIME (Supabase) - Publicación para suscripciones en vivo
-- =============================================
-- Necesario para que subscribeRealtimeTable() reciba INSERT/UPDATE/DELETE en la app.
-- Si la publicación no existe (ej. Postgres local), crea: create publication supabase_realtime;
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'orders') then
      alter publication supabase_realtime add table orders;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'payments') then
      alter publication supabase_realtime add table payments;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'expenses') then
      alter publication supabase_realtime add table expenses;
    end if;
  end if;
exception
  when others then
    raise notice 'Realtime: % (si usas Supabase Cloud, la publicación supabase_realtime ya suele existir)', sqlerrm;
end $$;

-- =============================================
-- COMENTARIOS FINALES
-- =============================================
comment on table orders is 'Tabla principal de pedidos';
comment on table payments is 'Registro de pagos recibidos';
comment on table expenses is 'Registro de gastos del negocio';
comment on table product_categories is 'Categorías de productos disponibles';
comment on table customers is 'Clientes: datos básicos, contacto, tags y stats';
