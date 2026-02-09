-- =============================================
-- MIGRACIÓN: Tabla customers (ejecutar si ya tienes el resto del schema)
-- =============================================

create table if not exists customers (
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

create index if not exists customers_name_idx on customers(lower(first_name), lower(last_name));
create index if not exists customers_phone_idx on customers(phone);
create index if not exists customers_email_idx on customers(email);
create index if not exists customers_last_order_idx on customers(last_order_date desc nulls last);
create index if not exists customers_total_spent_idx on customers(total_spent_eur desc);

alter table orders add column if not exists customer_id uuid references customers(id) on delete set null;
create index if not exists orders_customer_id_idx on orders(customer_id);

alter table customers enable row level security;

create policy "Users can view all customers" on customers for select to authenticated using (true);
create policy "Users can insert customers" on customers for insert to authenticated with check (true);
create policy "Users can update customers" on customers for update to authenticated using (true);
create policy "Users can delete customers" on customers for delete to authenticated using (true);
