-- Migration 3/4: behavioral triggers — column guards, status-transition rules,
-- auto-created rows, and the submissions review spine.

-- "privileged" = service role / direct SQL (auth.uid() is null) or an admin.
create or replace function public.is_privileged()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select auth.uid() is null or public.is_admin();
$$;

-- ---------------------------------------------------------------------------
-- clients: non-admin owners may only change phone + email
-- ---------------------------------------------------------------------------
create or replace function public.guard_client_update()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if public.is_privileged() then
    return new;
  end if;
  if new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.full_name is distinct from old.full_name
    or new.event_type is distinct from old.event_type
    or new.event_date is distinct from old.event_date
    or new.ready_time is distinct from old.ready_time
    or new.booked_time is distinct from old.booked_time
    or new.getting_ready_address is distinct from old.getting_ready_address
    or new.services is distinct from old.services
    or new.party_size is distinct from old.party_size
    or new.amount_services is distinct from old.amount_services
    or new.amount_travel is distinct from old.amount_travel
    or new.amount_total is distinct from old.amount_total
    or new.amount_retainer is distinct from old.amount_retainer
    or new.amount_balance is distinct from old.amount_balance
    or new.referral_source is distinct from old.referral_source
    or new.status is distinct from old.status
    or new.archived_at is distinct from old.archived_at
    or new.created_at is distinct from old.created_at
  then
    raise exception 'clients: only phone and email may be changed';
  end if;
  return new;
end;
$$;

create trigger clients_guard before update on public.clients
  for each row execute function public.guard_client_update();

-- ---------------------------------------------------------------------------
-- party_share_tokens: bride may only revoke (set revoked_at)
-- ---------------------------------------------------------------------------
create or replace function public.guard_party_token_update()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if public.is_privileged() then
    return new;
  end if;
  if new.id is distinct from old.id
    or new.client_id is distinct from old.client_id
    or new.token is distinct from old.token
    or new.expires_at is distinct from old.expires_at
    or new.created_at is distinct from old.created_at
  then
    raise exception 'party_share_tokens: only revoked_at may be changed';
  end if;
  return new;
end;
$$;

create trigger party_tokens_guard before update on public.party_share_tokens
  for each row execute function public.guard_party_token_update();

-- ---------------------------------------------------------------------------
-- party_members: status rules for non-admin writers
--   * inserts are forced to source='bride', is_bride=false, status draft/pending
--   * updates may only move status between draft/pending; editing an
--     approved or changes_requested profile automatically re-queues it
-- ---------------------------------------------------------------------------
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
      elsif old.status in ('approved', 'changes_requested') then
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

create trigger party_members_guard before insert or update on public.party_members
  for each row execute function public.guard_party_member_write();

-- ---------------------------------------------------------------------------
-- intakes: server-computed version, transition stamps
-- ---------------------------------------------------------------------------
create or replace function public.guard_intake_write()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.version := coalesce((select max(version) from public.intakes where client_id = new.client_id), 0) + 1;
    if not public.is_privileged() and new.status <> 'draft' then
      new.status := 'draft';
    end if;
  else
    if not public.is_privileged() then
      if new.client_id is distinct from old.client_id
        or new.version is distinct from old.version
        or new.review_message is distinct from old.review_message
        or new.reviewed_at is distinct from old.reviewed_at
        or new.reviewed_by is distinct from old.reviewed_by
      then
        raise exception 'intakes: protected columns may not be changed';
      end if;
    end if;
    if new.status = 'pending' and old.status is distinct from new.status then
      new.submitted_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger intakes_guard before insert or update on public.intakes
  for each row execute function public.guard_intake_write();

-- a new intake version supersedes earlier drafts / change-requests
create or replace function public.supersede_old_intakes()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  update public.intakes
     set status = 'superseded'
   where client_id = new.client_id
     and id <> new.id
     and status in ('draft', 'changes_requested');
  return new;
end;
$$;

create trigger intakes_supersede after insert on public.intakes
  for each row execute function public.supersede_old_intakes();

-- ---------------------------------------------------------------------------
-- clients: auto-create companion rows on insert
-- ---------------------------------------------------------------------------
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
  insert into public.party_members (client_id, is_bride, name, relation, services, source)
    values (new.id, true, new.full_name, 'bride', new.services, 'admin');
  return new;
end;
$$;

create trigger clients_auto_rows after insert on public.clients
  for each row execute function public.client_after_insert();

-- keep still-due payment amounts in sync when the quote changes
create or replace function public.sync_payment_amounts()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.amount_retainer is distinct from old.amount_retainer then
    update public.payments set amount = new.amount_retainer
     where client_id = new.id and kind = 'retainer' and status = 'due';
  end if;
  if new.amount_balance is distinct from old.amount_balance then
    update public.payments set amount = new.amount_balance
     where client_id = new.id and kind = 'final' and status = 'due';
  end if;
  return new;
end;
$$;

create trigger clients_sync_payments after update on public.clients
  for each row execute function public.sync_payment_amounts();

-- ---------------------------------------------------------------------------
-- submissions spine: pending work lands in the queue automatically
-- ---------------------------------------------------------------------------
create or replace function public.enqueue_agreement()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.status = 'signed' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    insert into public.submissions (client_id, kind, ref_id) values (new.client_id, 'agreement', new.id);
    update public.client_documents set visible = true
     where client_id = new.client_id and doc_type = 'agreement';
  end if;
  return new;
end;
$$;

create trigger agreements_enqueue after insert or update on public.agreements
  for each row execute function public.enqueue_agreement();

create or replace function public.enqueue_intake()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    insert into public.submissions (client_id, kind, ref_id) values (new.client_id, 'intake', new.id);
  end if;
  return new;
end;
$$;

create trigger intakes_enqueue after insert or update on public.intakes
  for each row execute function public.enqueue_intake();

create or replace function public.enqueue_party_member()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    insert into public.submissions (client_id, kind, ref_id) values (new.client_id, 'party_member', new.id);
  end if;
  return new;
end;
$$;

create trigger party_members_enqueue after insert or update on public.party_members
  for each row execute function public.enqueue_party_member();

-- reviewing a submission stamps it and propagates to the underlying record
create or replace function public.stamp_submission_review()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status and old.status = 'pending' then
    new.reviewed_at := now();
    new.reviewed_by := coalesce(new.reviewed_by, auth.uid());
  end if;
  return new;
end;
$$;

create trigger submissions_stamp before update on public.submissions
  for each row execute function public.stamp_submission_review();

create or replace function public.propagate_submission_review()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if new.kind = 'agreement' and new.status = 'approved' then
    update public.agreements set status = 'approved' where id = new.ref_id;
  elsif new.kind = 'intake' then
    if new.status = 'approved' then
      update public.intakes
         set status = 'superseded'
       where client_id = new.client_id and id <> new.ref_id and status = 'approved';
      update public.intakes
         set status = 'approved', reviewed_at = new.reviewed_at, reviewed_by = new.reviewed_by
       where id = new.ref_id;
    elsif new.status = 'changes_requested' then
      update public.intakes
         set status = 'changes_requested', review_message = new.message,
             reviewed_at = new.reviewed_at, reviewed_by = new.reviewed_by
       where id = new.ref_id;
    end if;
  elsif new.kind = 'party_member' then
    if new.status = 'approved' then
      update public.party_members set status = 'approved' where id = new.ref_id;
    elsif new.status = 'changes_requested' then
      update public.party_members set status = 'changes_requested' where id = new.ref_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger submissions_propagate after update on public.submissions
  for each row execute function public.propagate_submission_review();

-- retainer received → prep guides become visible (Arsh can still toggle)
create or replace function public.reveal_guides_on_retainer()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.kind = 'retainer' and new.status = 'received' and old.status is distinct from new.status then
    update public.client_documents set visible = true
     where client_id = new.client_id and doc_type in ('hair_guide', 'skin_guide');
  end if;
  return new;
end;
$$;

create trigger payments_reveal_guides after update on public.payments
  for each row execute function public.reveal_guides_on_retainer();
