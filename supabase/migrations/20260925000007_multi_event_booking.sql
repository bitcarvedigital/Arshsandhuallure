-- Migration 7: multi-event bookings.
--   * events + itemised line items (services / fees / discounts) per event
--   * per-event timelines (brick builder), published independently
--   * payments become a light ledger (retainer + final + received installments)
--   * invoices with a frozen snapshot and ASA-YYYY-NNNN numbers
--   * autofill markers + events-attending on party_members
--   * service-aware prep-guide reveal
-- The flat event/amount columns on `clients` stay, but are now DERIVED by
-- refresh_client_booking() — every existing reader keeps working, and nothing
-- should write those columns directly any more.
-- Photo consent (agreement terms v1 §7, agreements.photo_consent) is untouched.

-- ---------------------------------------------------------------------------
-- 1. events
-- ---------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  sort_order int not null default 0,
  name text not null default '' check (char_length(name) <= 120),
  event_type text not null default 'Wedding' check (char_length(event_type) <= 60),
  event_date date,
  start_time time,            -- artist arrival / start
  ready_time time,            -- everyone ready by
  address text not null default '' check (char_length(address) <= 500),
  party_size int check (party_size between 0 and 200),
  client_note text not null default '' check (char_length(client_note) <= 2000), -- visible to the client
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, client_id)      -- target for composite foreign keys
);
create index events_client_idx on public.events (client_id, event_date);
create trigger events_touch before update on public.events
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 2. event_line_items — composite FK means a line can never claim another
--    client's event, which is what makes the denormalised client_id safe.
-- ---------------------------------------------------------------------------
create table public.event_line_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  client_id uuid not null,
  foreign key (event_id, client_id) references public.events (id, client_id) on delete cascade,
  kind text not null check (kind in ('service', 'fee', 'discount')),
  code text check (char_length(code) <= 60),
  label text not null check (char_length(label) between 1 and 160),
  qty numeric(8,2) not null default 1 check (qty >= 0),
  unit_price numeric(10,2) not null default 0 check (unit_price >= 0), -- discounts stored positive
  service text check (service in ('hair', 'makeup', 'both')),
  for_bride boolean not null default false,
  minutes int check (minutes between 0 and 600),  -- default brick length per person
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind = 'service' or (service is null and not for_bride))
);
create index event_line_items_client_idx on public.event_line_items (client_id);
create index event_line_items_event_idx on public.event_line_items (event_id);
create trigger event_line_items_touch before update on public.event_line_items
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 3. event_timelines — one per event; clients only ever see published ones
-- ---------------------------------------------------------------------------
create table public.event_timelines (
  event_id uuid primary key,
  client_id uuid not null,
  foreign key (event_id, client_id) references public.events (id, client_id) on delete cascade,
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  visible boolean not null default false,
  published_at timestamptz,
  updated_at timestamptz not null default now()
);
create index event_timelines_client_idx on public.event_timelines (client_id);
create trigger event_timelines_touch before update on public.event_timelines
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 4. invoices — number assigned by trigger; snapshot is what was sent
-- ---------------------------------------------------------------------------
create sequence public.invoice_seq;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  seq bigint unique,
  number text unique,
  issued_on date not null default ((now() at time zone 'America/Toronto')::date),
  due_on date,
  note text not null default '' check (char_length(note) <= 2000),
  snapshot jsonb not null,
  status text not null default 'issued' check (status in ('issued', 'void')),
  sent_to text,
  sent_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index invoices_client_idx on public.invoices (client_id, created_at desc);

create or replace function public.assign_invoice_number()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  new.seq := nextval('public.invoice_seq');
  new.number := 'ASA-' || to_char(new.issued_on, 'YYYY') || '-' || lpad(new.seq::text, 4, '0');
  return new;
end;
$$;

create trigger invoices_number before insert on public.invoices
  for each row execute function public.assign_invoice_number();

-- ---------------------------------------------------------------------------
-- 5. payments → light ledger. Retainer + final stay single rows; any number of
--    received installments ("Mehndi balance · cash") can be recorded.
-- ---------------------------------------------------------------------------
alter table public.payments drop constraint if exists payments_client_id_kind_key;
alter table public.payments drop constraint if exists payments_kind_check;
alter table public.payments add constraint payments_kind_check
  check (kind in ('retainer', 'final', 'installment'));
create unique index payments_one_retainer_final_idx on public.payments (client_id, kind)
  where kind in ('retainer', 'final');
alter table public.payments
  add column label text check (char_length(label) <= 160),
  add column note text check (char_length(note) <= 500),
  add column event_id uuid;
alter table public.payments add constraint payments_event_fk
  foreign key (event_id, client_id) references public.events (id, client_id) on delete set null (event_id);
alter table public.payments add constraint payments_installment_received
  check (kind <> 'installment' or (status = 'received' and amount > 0));
alter table public.payments add constraint payments_method_check
  check (method in ('etransfer', 'cash', 'cheque', 'card', 'other'));

-- ---------------------------------------------------------------------------
-- 6. party_members: autofill markers + which events each person attends
--    autofill: { field: 'new' | 'saved' } — key removed once the person checks it
-- ---------------------------------------------------------------------------
alter table public.party_members
  add column autofill jsonb not null default '{}'::jsonb check (jsonb_typeof(autofill) = 'object'),
  add column event_ids uuid[] not null default '{}';

-- ---------------------------------------------------------------------------
-- 7. price list (admin-only via the existing app_settings policies)
-- ---------------------------------------------------------------------------
insert into public.app_settings (key, value) values ('price_list', '[
  {"code":"bridal_hm","label":"Bridal Hair & Makeup","kind":"service","service":"both","for_bride":true,"minutes":150,"price":null},
  {"code":"bridal_makeup","label":"Bridal Makeup","kind":"service","service":"makeup","for_bride":true,"minutes":90,"price":null},
  {"code":"bridal_hair","label":"Bridal Hair","kind":"service","service":"hair","for_bride":true,"minutes":60,"price":null},
  {"code":"party_hm","label":"Party Hair & Makeup","kind":"service","service":"both","for_bride":false,"minutes":90,"price":null},
  {"code":"party_makeup","label":"Party Makeup","kind":"service","service":"makeup","for_bride":false,"minutes":45,"price":null},
  {"code":"party_hair","label":"Party Hair","kind":"service","service":"hair","for_bride":false,"minutes":45,"price":null},
  {"code":"fg_makeup","label":"Flower Girl Makeup","kind":"service","service":"makeup","for_bride":false,"minutes":20,"price":null},
  {"code":"fg_hair","label":"Flower Girl Hair","kind":"service","service":"hair","for_bride":false,"minutes":20,"price":null},
  {"code":"draping","label":"Dupatta / Saree Draping","kind":"service","service":null,"for_bride":false,"minutes":15,"price":null},
  {"code":"early_start","label":"Early-start fee","kind":"fee","service":null,"for_bride":false,"minutes":null,"price":null},
  {"code":"travel","label":"Travel","kind":"fee","service":null,"for_bride":false,"minutes":null,"price":null},
  {"code":"parking","label":"Parking","kind":"fee","service":null,"for_bride":false,"minutes":null,"price":null},
  {"code":"toll","label":"Toll","kind":"fee","service":null,"for_bride":false,"minutes":null,"price":null},
  {"code":"other_fee","label":"Other fee","kind":"fee","service":null,"for_bride":false,"minutes":null,"price":null},
  {"code":"discount","label":"Discount","kind":"discount","service":null,"for_bride":false,"minutes":null,"price":null}
]')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 8. helpers
-- ---------------------------------------------------------------------------

-- Does this client's booking include hair / makeup? Falls back to the legacy
-- flat `services` column (and to "yes") when nothing is itemised.
create or replace function public.client_has_service(p_client_id uuid, p_service text)
returns boolean
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_itemised boolean;
  v_has boolean;
  v_legacy text;
begin
  select coalesce(bool_or(service is not null), false),
         coalesce(bool_or(service in (p_service, 'both') and qty > 0), false)
    into v_itemised, v_has
    from public.event_line_items
   where client_id = p_client_id and kind = 'service';
  if v_itemised then
    return v_has;
  end if;
  select services into v_legacy from public.clients where id = p_client_id;
  return coalesce(v_legacy in (p_service, 'both'), true);
end;
$$;

-- Recompute every derived column on `clients` from events + line items +
-- payments. Only writes when something actually changed — that is what ends
-- the payments ⇄ clients trigger chain (sync_payment_amounts).
create or replace function public.refresh_client_booking(p_client_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  c public.clients%rowtype;
  ev public.events%rowtype;
  v_names text;
  v_party int;
  v_lines int;
  v_svc numeric;
  v_fee numeric;
  v_disc numeric;
  v_hair boolean;
  v_makeup boolean;
  v_bhair boolean;
  v_bmakeup boolean;
  v_total numeric;
  v_services text;
  v_bride_svc text;
  v_ret_received boolean;
  v_ret_amount numeric;
  v_retainer numeric;
  v_inst numeric;
  v_balance numeric;
  v_new_services text;
begin
  select * into c from public.clients where id = p_client_id;
  if not found then
    return;
  end if;

  select * into ev from public.events
   where client_id = p_client_id
   order by event_date nulls last, sort_order, created_at
   limit 1;
  if not found then
    return; -- legacy client with no events yet: leave the flat columns alone
  end if;

  select string_agg(nullif(trim(name), ''), ' · ' order by event_date nulls last, sort_order, created_at),
         max(party_size)
    into v_names, v_party
    from public.events
   where client_id = p_client_id;

  select count(*),
         coalesce(sum(round(qty * unit_price, 2)) filter (where kind = 'service'), 0),
         coalesce(sum(round(qty * unit_price, 2)) filter (where kind = 'fee'), 0),
         coalesce(sum(round(qty * unit_price, 2)) filter (where kind = 'discount'), 0),
         coalesce(bool_or(service in ('hair', 'both')) filter (where kind = 'service' and qty > 0), false),
         coalesce(bool_or(service in ('makeup', 'both')) filter (where kind = 'service' and qty > 0), false),
         coalesce(bool_or(service in ('hair', 'both')) filter (where kind = 'service' and for_bride and qty > 0), false),
         coalesce(bool_or(service in ('makeup', 'both')) filter (where kind = 'service' and for_bride and qty > 0), false)
    into v_lines, v_svc, v_fee, v_disc, v_hair, v_makeup, v_bhair, v_bmakeup
    from public.event_line_items
   where client_id = p_client_id;

  v_total := case when v_lines = 0 then null else greatest(v_svc + v_fee - v_disc, 0) end;
  v_services := case when v_hair and v_makeup then 'both' when v_hair then 'hair' when v_makeup then 'makeup' end;
  v_bride_svc := case when v_bhair and v_bmakeup then 'both' when v_bhair then 'hair' when v_bmakeup then 'makeup' end;

  select status = 'received', amount into v_ret_received, v_ret_amount
    from public.payments
   where client_id = p_client_id and kind = 'retainer'
   limit 1;
  v_retainer := case
    when coalesce(v_ret_received, false) then v_ret_amount
    when v_total is null then null
    else round(v_total * 0.30, 2)
  end;

  select coalesce(sum(amount), 0) into v_inst
    from public.payments
   where client_id = p_client_id and kind = 'installment' and status = 'received';

  v_balance := case when v_total is null then null
                    else greatest(v_total - coalesce(v_retainer, 0) - v_inst, 0) end;
  v_new_services := coalesce(v_services, c.services);

  update public.clients set
    event_type = coalesce(v_names, c.event_type),
    event_date = ev.event_date,
    ready_time = ev.ready_time,
    booked_time = ev.start_time,
    getting_ready_address = nullif(ev.address, ''),
    party_size = v_party,
    services = v_new_services,
    amount_services = case when v_lines = 0 then null else v_svc - v_disc end,
    amount_travel = case when v_lines = 0 or v_fee = 0 then null else v_fee end,
    amount_total = v_total,
    amount_retainer = v_retainer,
    amount_balance = v_balance
  where id = p_client_id
    and (event_type, event_date, ready_time, booked_time, getting_ready_address, party_size, services,
         amount_services, amount_travel, amount_total, amount_retainer, amount_balance)
        is distinct from
        (coalesce(v_names, c.event_type), ev.event_date, ev.ready_time, ev.start_time, nullif(ev.address, ''),
         v_party, v_new_services,
         case when v_lines = 0 then null else v_svc - v_disc end,
         case when v_lines = 0 or v_fee = 0 then null else v_fee end,
         v_total, v_retainer, v_balance);

  -- the bride's own profile learns her booked service (flagged for her to check)
  if v_bride_svc is not null then
    update public.party_members
       set services = v_bride_svc,
           autofill = autofill || jsonb_build_object('services', 'new')
     where client_id = p_client_id and is_bride and services is null;
  end if;

  -- services changed after the retainer arrived → reveal any newly relevant guide
  if v_new_services is distinct from c.services and coalesce(v_ret_received, false) then
    update public.client_documents set visible = true
     where client_id = p_client_id
       and not visible
       and ((doc_type = 'hair_guide' and v_new_services in ('hair', 'both'))
         or (doc_type = 'skin_guide' and v_new_services in ('makeup', 'both')));
  end if;
end;
$$;

create or replace function public.trg_refresh_booking()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  perform public.refresh_client_booking(coalesce(new.client_id, old.client_id));
  return null;
end;
$$;

-- Atomic booking save for the studio: upserts events + lines by stable id
-- (timelines and intake answers stay attached), deletes whatever was removed.
create or replace function public.admin_save_booking(p_client_id uuid, p_events jsonb)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  e jsonb;
  l jsonb;
  i int := 0;
  j int;
  v_eid uuid;
  v_lid uuid;
  v_kind text;
  keep_e uuid[] := '{}';
  keep_l uuid[] := '{}';
begin
  -- admins, the service role, or direct SQL — never anon / clients
  if not (public.is_admin() or coalesce(auth.role(), 'service_role') = 'service_role') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from public.clients where id = p_client_id) then
    raise exception 'client not found';
  end if;
  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    raise exception 'events must be an array';
  end if;
  if jsonb_array_length(p_events) > 20 then
    raise exception 'at most 20 events per booking';
  end if;

  for e in select value from jsonb_array_elements(p_events) loop
    v_eid := coalesce(nullif(e ->> 'id', '')::uuid, gen_random_uuid());
    if exists (select 1 from public.events where id = v_eid and client_id <> p_client_id) then
      raise exception 'event belongs to another client';
    end if;

    insert into public.events (id, client_id, sort_order, name, event_type, event_date, start_time,
                               ready_time, address, party_size, client_note)
    values (
      v_eid, p_client_id, i,
      left(coalesce(e ->> 'name', ''), 120),
      left(coalesce(nullif(e ->> 'event_type', ''), 'Wedding'), 60),
      nullif(e ->> 'event_date', '')::date,
      nullif(e ->> 'start_time', '')::time,
      nullif(e ->> 'ready_time', '')::time,
      left(coalesce(e ->> 'address', ''), 500),
      nullif(e ->> 'party_size', '')::int,
      left(coalesce(e ->> 'client_note', ''), 2000)
    )
    on conflict (id) do update set
      sort_order = excluded.sort_order,
      name = excluded.name,
      event_type = excluded.event_type,
      event_date = excluded.event_date,
      start_time = excluded.start_time,
      ready_time = excluded.ready_time,
      address = excluded.address,
      party_size = excluded.party_size,
      client_note = excluded.client_note;
    keep_e := keep_e || v_eid;

    if e -> 'lines' is not null and jsonb_typeof(e -> 'lines') = 'array' then
      if jsonb_array_length(e -> 'lines') > 60 then
        raise exception 'at most 60 lines per event';
      end if;
      j := 0;
      for l in select value from jsonb_array_elements(e -> 'lines') loop
        v_lid := coalesce(nullif(l ->> 'id', '')::uuid, gen_random_uuid());
        if exists (select 1 from public.event_line_items where id = v_lid and client_id <> p_client_id) then
          raise exception 'line belongs to another client';
        end if;
        v_kind := l ->> 'kind';
        insert into public.event_line_items (id, event_id, client_id, kind, code, label, qty, unit_price,
                                             service, for_bride, minutes, sort_order)
        values (
          v_lid, v_eid, p_client_id, v_kind,
          nullif(left(coalesce(l ->> 'code', ''), 60), ''),
          left(coalesce(nullif(trim(l ->> 'label'), ''), 'Item'), 160),
          coalesce(nullif(l ->> 'qty', '')::numeric, 1),
          coalesce(nullif(l ->> 'unit_price', '')::numeric, 0),
          case when v_kind = 'service' then nullif(l ->> 'service', '') end,
          case when v_kind = 'service' then coalesce((l ->> 'for_bride')::boolean, false) else false end,
          nullif(l ->> 'minutes', '')::int,
          j
        )
        on conflict (id) do update set
          event_id = excluded.event_id,
          kind = excluded.kind,
          code = excluded.code,
          label = excluded.label,
          qty = excluded.qty,
          unit_price = excluded.unit_price,
          service = excluded.service,
          for_bride = excluded.for_bride,
          minutes = excluded.minutes,
          sort_order = excluded.sort_order;
        keep_l := keep_l || v_lid;
        j := j + 1;
      end loop;
    end if;
    i := i + 1;
  end loop;

  delete from public.event_line_items where client_id = p_client_id and not (id = any (keep_l));
  delete from public.events where client_id = p_client_id and not (id = any (keep_e));
  perform public.refresh_client_booking(p_client_id);
end;
$$;

-- Timeline publishing keeps the journey's "timeline" document in step. Acts on
-- transitions only, so saving a draft never hides anything.
create or replace function public.sync_timeline_doc()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_client uuid := coalesce(new.client_id, old.client_id);
  v_event uuid := coalesce(new.event_id, old.event_id);
  v_was boolean := case when tg_op = 'INSERT' then false else old.visible end;
  v_now boolean := case when tg_op = 'DELETE' then false else new.visible end;
begin
  if v_now and not v_was then
    update public.client_documents set visible = true
     where client_id = v_client and doc_type = 'timeline';
  elsif v_was and not v_now then
    if not exists (select 1 from public.event_timelines
                    where client_id = v_client and visible and event_id <> v_event) then
      update public.client_documents set visible = false
       where client_id = v_client and doc_type = 'timeline';
    end if;
  end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. replaced behaviour (create or replace keeps the existing trigger bindings)
-- ---------------------------------------------------------------------------

-- clients: an ALLOWLIST now — owners may change phone + email and nothing else,
-- including any column added in future.
create or replace function public.guard_client_update()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if public.is_privileged() then
    return new;
  end if;
  if (to_jsonb(new) - array['phone', 'email', 'updated_at'])
     is distinct from (to_jsonb(old) - array['phone', 'email', 'updated_at']) then
    raise exception 'clients: only phone and email may be changed';
  end if;
  return new;
end;
$$;

-- party_members: same rules as before, except that ticking off an autofill
-- marker (no real content change) no longer sends a profile back to review.
create or replace function public.guard_party_member_write()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_privileged() then
    if tg_op = 'INSERT' then
      new.source := 'bride';
      new.is_bride := false;
      if new.status not in ('draft', 'pending') then
        new.status := 'draft';
      end if;
    else
      if new.id is distinct from old.id
        or new.client_id is distinct from old.client_id
        or new.is_bride is distinct from old.is_bride
        or new.source is distinct from old.source
        or new.created_at is distinct from old.created_at
      then
        raise exception 'party_members: protected columns may not be changed';
      end if;
      if new.status is distinct from old.status then
        if new.status not in ('draft', 'pending') then
          raise exception 'party_members: invalid status transition';
        end if;
      elsif old.status in ('approved', 'changes_requested')
        and (to_jsonb(new) - array['autofill', 'updated_at', 'status', 'submitted_at'])
            is distinct from (to_jsonb(old) - array['autofill', 'updated_at', 'status', 'submitted_at'])
      then
        -- content edited without an explicit status change → back to review
        new.status := 'pending';
      end if;
    end if;
  end if;
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    new.submitted_at := now();
  end if;
  return new;
end;
$$;

-- guides follow the booked services: hair guide only with hair, skin guide only with makeup
create or replace function public.reveal_guides_on_retainer()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.kind = 'retainer' and new.status = 'received' and old.status is distinct from new.status then
    update public.client_documents set visible = true
     where client_id = new.client_id
       and ((doc_type = 'hair_guide' and public.client_has_service(new.client_id, 'hair'))
         or (doc_type = 'skin_guide' and public.client_has_service(new.client_id, 'makeup')));
  end if;
  return new;
end;
$$;

-- companion rows on insert — unchanged, plus the bride's name is flagged as
-- auto-filled so she is asked to check it.
create or replace function public.client_after_insert()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.admin_notes (client_id) values (new.id);
  insert into public.client_documents (client_id, doc_type)
    values (new.id, 'agreement'), (new.id, 'timeline'), (new.id, 'hair_guide'), (new.id, 'skin_guide');
  insert into public.payments (client_id, kind, amount)
    values (new.id, 'retainer', new.amount_retainer), (new.id, 'final', new.amount_balance);
  insert into public.party_members (client_id, is_bride, name, relation, services, source, autofill)
    values (
      new.id, true, new.full_name, 'bride', new.services, 'admin',
      case when coalesce(new.full_name, '') <> '' then '{"name":"new"}'::jsonb else '{}'::jsonb end
    );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. backfill — one event per existing client from its flat columns, plus a
--     services line and a travel line, then one explicit refresh. Runs before
--     the new triggers exist; totals and any received retainer stay identical.
-- ---------------------------------------------------------------------------
insert into public.events (client_id, sort_order, name, event_type, event_date, start_time, ready_time,
                           address, party_size)
select c.id, 0,
       left(coalesce(nullif(trim(c.event_type), ''), 'Wedding'), 120),
       left(coalesce(nullif(trim(c.event_type), ''), 'Wedding'), 60),
       c.event_date, c.booked_time, c.ready_time,
       left(coalesce(c.getting_ready_address, ''), 500),
       case when c.party_size between 0 and 200 then c.party_size end
  from public.clients c
 where not exists (select 1 from public.events e where e.client_id = c.id);

insert into public.event_line_items (event_id, client_id, kind, label, qty, unit_price, service, for_bride, sort_order)
select e.id, c.id, 'service', 'Professional services', 1, c.amount_services, c.services, c.services is not null, 0
  from public.clients c
  join public.events e on e.client_id = c.id
 where c.amount_services is not null and c.amount_services >= 0
   and not exists (select 1 from public.event_line_items x where x.client_id = c.id);

insert into public.event_line_items (event_id, client_id, kind, code, label, qty, unit_price, sort_order)
select e.id, c.id, 'fee', 'travel', 'Travel', 1, c.amount_travel, 1
  from public.clients c
  join public.events e on e.client_id = c.id
 where c.amount_travel > 0
   and not exists (select 1 from public.event_line_items x where x.client_id = c.id and x.kind = 'fee');

do $$
declare
  r record;
begin
  for r in select id from public.clients loop
    perform public.refresh_client_booking(r.id);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. triggers
-- ---------------------------------------------------------------------------
create trigger events_refresh after insert or update or delete on public.events
  for each row execute function public.trg_refresh_booking();
create trigger event_line_items_refresh after insert or update or delete on public.event_line_items
  for each row execute function public.trg_refresh_booking();
create trigger payments_refresh after insert or delete or update of amount, status, kind on public.payments
  for each row execute function public.trg_refresh_booking();
create trigger event_timelines_sync_doc after insert or delete or update of visible on public.event_timelines
  for each row execute function public.sync_timeline_doc();

-- ---------------------------------------------------------------------------
-- 12. row-level security + grants (default-deny; explicit grants because new
--     objects are not auto-exposed)
-- ---------------------------------------------------------------------------
alter table public.events enable row level security;
alter table public.event_line_items enable row level security;
alter table public.event_timelines enable row level security;
alter table public.invoices enable row level security;

create policy events_admin_all on public.events
  for all using (public.is_admin()) with check (public.is_admin());
create policy events_select_own on public.events
  for select using (client_id = public.my_client_id());

create policy event_line_items_admin_all on public.event_line_items
  for all using (public.is_admin()) with check (public.is_admin());
create policy event_line_items_select_own on public.event_line_items
  for select using (client_id = public.my_client_id());

create policy event_timelines_admin_all on public.event_timelines
  for all using (public.is_admin()) with check (public.is_admin());
create policy event_timelines_select_own_visible on public.event_timelines
  for select using (client_id = public.my_client_id() and visible);

create policy invoices_admin_all on public.invoices
  for all using (public.is_admin()) with check (public.is_admin());
create policy invoices_select_own on public.invoices
  for select using (client_id = public.my_client_id() and status = 'issued');

revoke all on public.events, public.event_line_items, public.event_timelines, public.invoices from anon;
grant select, insert, update, delete on public.events, public.event_line_items, public.event_timelines,
  public.invoices to authenticated;
grant all on public.events, public.event_line_items, public.event_timelines, public.invoices to service_role;

revoke all on sequence public.invoice_seq from public, anon, authenticated;
grant usage, select on sequence public.invoice_seq to service_role;

revoke all on function public.refresh_client_booking(uuid) from public, anon, authenticated;
revoke all on function public.client_has_service(uuid, text) from public, anon, authenticated;
revoke all on function public.trg_refresh_booking() from public, anon, authenticated;
revoke all on function public.sync_timeline_doc() from public, anon, authenticated;
revoke all on function public.assign_invoice_number() from public, anon, authenticated;
revoke all on function public.admin_save_booking(uuid, jsonb) from public, anon;
grant execute on function public.admin_save_booking(uuid, jsonb) to authenticated, service_role;
grant execute on function public.refresh_client_booking(uuid) to service_role;

notify pgrst, 'reload schema';
