-- Transactional stock event processing; server-only, entity-scoped.
create table if not exists inventory_processed_events (
 entity_id uuid not null,
 source text not null,
 event_id text not null,
 processed_at timestamptz not null default now(),
 primary key (entity_id, source, event_id)
);
create or replace function inventory_reserve_order(
 p_entity uuid,p_variant uuid,p_order text,p_quantity integer,
 p_source text,p_event text
) returns text language plpgsql as $$
declare v inventory_variants%rowtype;
begin
 if p_quantity is null or p_quantity <= 0 then raise exception 'Invalid quantity'; end if;
 insert into inventory_processed_events(entity_id,source,event_id)
 values(p_entity,p_source,p_event) on conflict do nothing;
 if not found then return 'duplicate'; end if;
 select * into v from inventory_variants where entity_id=p_entity and id=p_variant for update;
 if not found then raise exception 'Variant not found'; end if;
 if v.on_hand-v.reserved < p_quantity then raise exception 'Insufficient stock'; end if;
 insert into inventory_reservations(entity_id,variant_id,order_id,quantity,status)
 values(p_entity,p_variant,p_order,p_quantity,'held');
 update inventory_variants set reserved=reserved+p_quantity where id=p_variant;
 return 'reserved';
end $$;
create or replace function inventory_close_reservation(
 p_entity uuid,p_variant uuid,p_order text,p_action text,
 p_source text,p_event text
) returns text language plpgsql as $$
declare r inventory_reservations%rowtype;
begin
 if p_action not in ('fulfill','cancel') then raise exception 'Invalid action'; end if;
 insert into inventory_processed_events(entity_id,source,event_id)
 values(p_entity,p_source,p_event) on conflict do nothing;
 if not found then return 'duplicate'; end if;
 select * into r from inventory_reservations
 where entity_id=p_entity and variant_id=p_variant and order_id=p_order for update;
 if not found or r.status <> 'held' then raise exception 'No held reservation'; end if;
 update inventory_variants
 set reserved=reserved-r.quantity,
 on_hand=on_hand-case when p_action='fulfill' then r.quantity else 0 end
 where entity_id=p_entity and id=p_variant;
 update inventory_reservations set status=case when p_action='fulfill' then 'fulfilled' else 'released' end where id=r.id;
 insert into inventory_movements(entity_id,variant_id,delta,reason,reference_id)
 values(p_entity,p_variant,case when p_action='fulfill' then -r.quantity else 0 end,p_action,p_source||':'||p_event);
 return p_action;
end $$;
-- Deployment gate: validate tenant RLS, function privileges, and authorization before applying.
revoke all on function inventory_reserve_order(uuid,uuid,text,integer,text,text) from public;
revoke all on function inventory_close_reservation(uuid,uuid,text,text,text,text) from public;
