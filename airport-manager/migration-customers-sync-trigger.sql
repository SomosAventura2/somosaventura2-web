-- =============================================
-- Sincronizar stats de customers al insertar/actualizar/borrar orders
-- Ejecutar después de migration-customers.sql
-- =============================================

create or replace function sync_customer_stats_from_orders()
returns trigger as $$
declare
    cid uuid;
begin
    -- En INSERT: actualizar el customer del nuevo pedido
    if (tg_op = 'INSERT' and new.customer_id is not null) then
        cid := new.customer_id;
    end if;
    -- En UPDATE: actualizar el customer antiguo y el nuevo si cambiaron
    if (tg_op = 'UPDATE') then
        if (old.customer_id is distinct from new.customer_id) then
            if old.customer_id is not null then
                perform recalc_customer_stats(old.customer_id);
            end if;
            if new.customer_id is not null then
                cid := new.customer_id;
            end if;
        else
            if new.customer_id is not null then
                cid := new.customer_id;
            end if;
        end if;
    end if;
    -- En DELETE: actualizar el customer del pedido borrado
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

drop trigger if exists orders_sync_customer_stats on orders;
create trigger orders_sync_customer_stats
    after insert or update of customer_id, status, amount_euros, delivery_date or delete
    on orders
    for each row
    execute function sync_customer_stats_from_orders();

-- Opcional: recalcular stats de todos los clientes una vez después de crear el trigger:
-- do $$ declare r record; begin for r in select id from customers loop perform recalc_customer_stats(r.id); end loop; end $$;
