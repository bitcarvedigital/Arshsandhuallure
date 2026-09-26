-- Booking invariants for migration 7. Runs in ONE transaction and rolls back —
-- safe on a local DB that holds real-shaped data. Any failure aborts with an
-- exception naming the broken rule.
--   docker exec -i supabase_db_arshsandhuallure psql -U postgres -d postgres -v ON_ERROR_STOP=1 < scripts/booking-invariants.sql
begin;

create temp table t_ids (k text primary key, v uuid) on commit drop;
grant all on t_ids to authenticated, anon;

-- 1. a new client gets companion rows + the bride's name flagged as auto-filled
do $$
declare v_client uuid;
begin
  insert into public.clients (full_name, email) values ('Invariant Bride', 'invariant-bride@example.test')
    returning id into v_client;
  insert into t_ids values ('client', v_client);
  if (select count(*) from public.payments where client_id = v_client) <> 2 then
    raise exception 'FAIL 1: companion payments not created';
  end if;
  if (select autofill from public.party_members where client_id = v_client and is_bride) <> '{"name":"new"}'::jsonb then
    raise exception 'FAIL 1: bride autofill not seeded';
  end if;
  raise notice 'PASS 1 companion rows + bride autofill';
end $$;

-- 2. three-event save → derived totals
do $$
declare
  v_client uuid := (select v from t_ids where k = 'client');
  m uuid := gen_random_uuid(); j uuid := gen_random_uuid(); w uuid := gen_random_uuid();
  c public.clients%rowtype;
begin
  insert into t_ids values ('mehndi', m), ('jaggo', j), ('wedding', w);
  perform public.admin_save_booking(v_client, jsonb_build_array(
    jsonb_build_object('id', m, 'name', 'Mehndi', 'event_type', 'Mehndi', 'event_date', '2027-06-10',
      'start_time', '15:00', 'ready_time', '18:00', 'address', '1 Home St', 'party_size', 4, 'lines', jsonb_build_array(
        jsonb_build_object('kind', 'service', 'label', 'Party Makeup', 'qty', 3, 'unit_price', 80, 'service', 'makeup', 'minutes', 45),
        jsonb_build_object('kind', 'fee', 'label', 'Early-start fee', 'qty', 1, 'unit_price', 50),
        jsonb_build_object('kind', 'fee', 'label', 'Parking', 'qty', 1, 'unit_price', 20))),
    jsonb_build_object('id', j, 'name', 'Jaggo', 'event_type', 'Jaggo', 'event_date', '2027-06-11', 'lines', jsonb_build_array(
        jsonb_build_object('kind', 'service', 'label', 'Party Hair & Makeup', 'qty', 2, 'unit_price', 150, 'service', 'both'),
        jsonb_build_object('kind', 'fee', 'label', 'Travel', 'qty', 1, 'unit_price', 60))),
    jsonb_build_object('id', w, 'name', 'Wedding', 'event_type', 'Wedding', 'event_date', '2027-06-12',
      'ready_time', '10:00', 'party_size', 6, 'lines', jsonb_build_array(
        jsonb_build_object('kind', 'service', 'label', 'Bridal Hair & Makeup', 'qty', 1, 'unit_price', 900, 'service', 'both', 'for_bride', true),
        jsonb_build_object('kind', 'service', 'label', 'Party Hair', 'qty', 2, 'unit_price', 90, 'service', 'hair'),
        jsonb_build_object('kind', 'service', 'label', 'Flower Girl Makeup', 'qty', 1, 'unit_price', 40, 'service', 'makeup'),
        jsonb_build_object('kind', 'fee', 'label', 'Toll', 'qty', 1, 'unit_price', 15),
        jsonb_build_object('kind', 'discount', 'label', 'Discount', 'qty', 1, 'unit_price', 50)))
  ));
  select * into c from public.clients where id = v_client;
  if c.amount_total <> 1755 or c.amount_retainer <> 526.50 or c.amount_balance <> 1228.50 then
    raise exception 'FAIL 2: totals % / % / %', c.amount_total, c.amount_retainer, c.amount_balance;
  end if;
  if c.amount_services <> 1610 or c.amount_travel <> 145 then
    raise exception 'FAIL 2: services/fees split % / %', c.amount_services, c.amount_travel;
  end if;
  if c.event_date <> '2027-06-10' or c.event_type <> 'Mehndi · Jaggo · Wedding' or c.party_size <> 6 or c.services <> 'both' then
    raise exception 'FAIL 2: derived event fields % % % %', c.event_date, c.event_type, c.party_size, c.services;
  end if;
  if (select amount from public.payments where client_id = v_client and kind = 'retainer') <> 526.50
     or (select amount from public.payments where client_id = v_client and kind = 'final') <> 1228.50 then
    raise exception 'FAIL 2: due payments not synced';
  end if;
  if (select services from public.party_members where client_id = v_client and is_bride) <> 'both'
     or (select autofill ->> 'services' from public.party_members where client_id = v_client and is_bride) <> 'new' then
    raise exception 'FAIL 2: bride service not learned from bridal line';
  end if;
  raise notice 'PASS 2 three-event totals, derived fields, payment sync, bride service';
end $$;

-- 3. retainer received with a custom amount, then an installment
do $$
declare v_client uuid := (select v from t_ids where k = 'client');
begin
  update public.payments set status = 'received', amount = 500, received_at = now()
   where client_id = v_client and kind = 'retainer';
  if (select amount_retainer from public.clients where id = v_client) <> 500
     or (select amount_balance from public.clients where id = v_client) <> 1255
     or (select amount from public.payments where client_id = v_client and kind = 'final') <> 1255 then
    raise exception 'FAIL 3: retainer received did not re-derive balance';
  end if;
  if (select count(*) from public.client_documents where client_id = v_client and doc_type in ('hair_guide', 'skin_guide') and visible) <> 2 then
    raise exception 'FAIL 3: both guides should reveal for hair+makeup';
  end if;
  insert into public.payments (client_id, kind, amount, status, received_at, method, label, event_id)
  values (v_client, 'installment', 300, 'received', now(), 'cash', 'Mehndi balance', (select v from t_ids where k = 'mehndi'));
  if (select amount_balance from public.clients where id = v_client) <> 955
     or (select amount from public.payments where client_id = v_client and kind = 'final') <> 955 then
    raise exception 'FAIL 3: installment not deducted from the balance';
  end if;
  begin
    insert into public.payments (client_id, kind, amount, status) values (v_client, 'installment', 10, 'due');
    raise exception 'FAIL 3: a due installment was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.payments (client_id, kind, amount) values (v_client, 'retainer', 1);
    raise exception 'FAIL 3: a second retainer was accepted';
  exception when unique_violation then null;
  end;
  raise notice 'PASS 3 retainer override, installment ledger, one retainer/final';
end $$;

-- 4. remove the Jaggo, then the Mehndi (installment keeps its money, loses its event)
do $$
declare
  v_client uuid := (select v from t_ids where k = 'client');
  v_events jsonb;
begin
  select jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name, 'event_type', e.event_type, 'event_date', e.event_date,
           'lines', (select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'kind', l.kind, 'label', l.label, 'qty', l.qty,
                      'unit_price', l.unit_price, 'service', l.service, 'for_bride', l.for_bride) order by l.sort_order), '[]')
                     from public.event_line_items l where l.event_id = e.id)) order by e.event_date)
    into v_events
    from public.events e where e.client_id = v_client and e.id <> (select v from t_ids where k = 'jaggo');
  perform public.admin_save_booking(v_client, v_events);
  if (select amount_total from public.clients where id = v_client) <> 1395
     or (select amount_balance from public.clients where id = v_client) <> 595 then
    raise exception 'FAIL 4: totals after removing Jaggo % / %',
      (select amount_total from public.clients where id = v_client), (select amount_balance from public.clients where id = v_client);
  end if;
  delete from public.events where id = (select v from t_ids where k = 'mehndi');
  if (select event_id from public.payments where client_id = v_client and kind = 'installment') is not null then
    raise exception 'FAIL 4: installment still points at a deleted event';
  end if;
  if (select amount_total from public.clients where id = v_client) <> 1085 or (select event_date from public.clients where id = v_client) <> '2027-06-12' then
    raise exception 'FAIL 4: totals after deleting Mehndi';
  end if;
  raise notice 'PASS 4 event removal re-derives, installment survives with event nulled';
end $$;

-- 5. a hair-only booking reveals only the hair guide
do $$
declare v_c2 uuid;
begin
  insert into public.clients (full_name, email) values ('Hair Only', 'hair-only@example.test') returning id into v_c2;
  insert into t_ids values ('hair_client', v_c2);
  perform public.admin_save_booking(v_c2, jsonb_build_array(jsonb_build_object('name', 'Wedding', 'event_date', '2027-08-01',
    'lines', jsonb_build_array(jsonb_build_object('kind', 'service', 'label', 'Bridal Hair', 'qty', 1, 'unit_price', 400, 'service', 'hair', 'for_bride', true)))));
  update public.payments set status = 'received', received_at = now() where client_id = v_c2 and kind = 'retainer';
  if not (select visible from public.client_documents where client_id = v_c2 and doc_type = 'hair_guide')
     or (select visible from public.client_documents where client_id = v_c2 and doc_type = 'skin_guide') then
    raise exception 'FAIL 5: guide reveal ignored services';
  end if;
  raise notice 'PASS 5 hair-only reveals only the hair guide';
end $$;

-- 6. timeline publish / hide transitions drive the journey document
do $$
declare
  v_client uuid := (select v from t_ids where k = 'client');
  w uuid := (select v from t_ids where k = 'wedding');
  x uuid;
begin
  update public.client_documents set visible = false where client_id = v_client and doc_type = 'timeline';
  insert into public.event_timelines (event_id, client_id, content) values (w, v_client, '{"bricks":[]}');
  if (select visible from public.client_documents where client_id = v_client and doc_type = 'timeline') then
    raise exception 'FAIL 6: a draft timeline published the document';
  end if;
  update public.event_timelines set visible = true where event_id = w;
  if not (select visible from public.client_documents where client_id = v_client and doc_type = 'timeline') then
    raise exception 'FAIL 6: publishing did not show the document';
  end if;
  insert into public.events (client_id, name) values (v_client, 'Reception') returning id into x;
  insert into public.event_timelines (event_id, client_id, visible) values (x, v_client, true);
  update public.event_timelines set visible = false where event_id = w;
  if not (select visible from public.client_documents where client_id = v_client and doc_type = 'timeline') then
    raise exception 'FAIL 6: hiding one of two published timelines hid the document';
  end if;
  update public.event_timelines set visible = false where event_id = x;
  if (select visible from public.client_documents where client_id = v_client and doc_type = 'timeline') then
    raise exception 'FAIL 6: hiding the last published timeline left the document visible';
  end if;
  raise notice 'PASS 6 timeline transitions';
end $$;

-- 7. invoice numbering
do $$
declare v_num text;
begin
  insert into public.invoices (client_id, snapshot, issued_on) values ((select v from t_ids where k = 'client'), '{}', '2027-01-15')
    returning number into v_num;
  if v_num !~ '^ASA-2027-\d{4}$' then
    raise exception 'FAIL 7: invoice number %', v_num;
  end if;
  raise notice 'PASS 7 invoice number %', v_num;
end $$;

-- 8. as a signed-in CLIENT (an existing bride with a user login)
insert into t_ids
select 'bride_user', c.user_id from public.clients c
 where c.user_id is not null and exists (select 1 from public.party_members m where m.client_id = c.id and m.status = 'approved')
 limit 1;

select set_config('request.jwt.claims',
  json_build_object('sub', (select v from t_ids where k = 'bride_user'), 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare v_mine uuid := public.my_client_id(); v_member uuid;
begin
  if v_mine is null then
    raise notice 'SKIP 8: no registered client with an approved profile in this database';
    return;
  end if;
  update public.clients set phone = '+1 000 000 0000' where id = v_mine;
  begin
    update public.clients set amount_total = 1 where id = v_mine;
    raise exception 'FAIL 8: client changed amount_total';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  select id into v_member from public.party_members where client_id = v_mine and status = 'approved' limit 1;
  update public.party_members set autofill = '{}'::jsonb where id = v_member;
  if (select status from public.party_members where id = v_member) <> 'approved' then
    raise exception 'FAIL 8: ticking an autofill marker re-queued an approved profile';
  end if;
  update public.party_members set likes = likes || ' (edited)' where id = v_member;
  if (select status from public.party_members where id = v_member) <> 'pending' then
    raise exception 'FAIL 8: a real edit did not re-queue the profile';
  end if;
  begin
    perform public.admin_save_booking(v_mine, '[]'::jsonb);
    raise exception 'FAIL 8: a client ran admin_save_booking';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.refresh_client_booking(v_mine);
    raise exception 'FAIL 8: a client ran refresh_client_booking';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.payments (client_id, kind, amount, status) values (v_mine, 'installment', 5, 'received');
    raise exception 'FAIL 8: a client recorded a payment';
  exception when insufficient_privilege then null;
  end;
  if exists (select 1 from public.event_timelines where not visible) then
    raise exception 'FAIL 8: a client can see an unpublished timeline';
  end if;
  if exists (select 1 from public.events where client_id <> v_mine) then
    raise exception 'FAIL 8: a client can see another client''s events';
  end if;
  raise notice 'PASS 8 client guards (phone ok, amounts blocked, autofill tick stays approved, admin RPCs denied, drafts hidden)';
end $$;

reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
do $$
begin
  begin
    perform public.admin_save_booking(gen_random_uuid(), '[]'::jsonb);
    raise exception 'FAIL 9: anon ran admin_save_booking';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.events limit 1;
    raise exception 'FAIL 9: anon can read events';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS 9 anon denied';
end $$;

reset role;
-- 10. deleting a client with linked installments cascades cleanly
do $$
begin
  delete from public.clients where id = (select v from t_ids where k = 'client');
  delete from public.clients where id = (select v from t_ids where k = 'hair_client');
  raise notice 'PASS 10 client delete cascades through events, lines, timelines, installments';
end $$;

rollback;
