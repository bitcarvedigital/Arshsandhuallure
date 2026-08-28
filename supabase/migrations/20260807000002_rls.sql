-- Migration 2/4: row-level security — enabled everywhere, default-deny.
-- Token tables and admin_notes deliberately have no client/anon policies;
-- public party-link flows only ever go through /api with the service role.

alter table public.admins enable row level security;
alter table public.clients enable row level security;
alter table public.admin_notes enable row level security;
alter table public.invite_tokens enable row level security;
alter table public.party_share_tokens enable row level security;
alter table public.party_members enable row level security;
alter table public.intakes enable row level security;
alter table public.agreement_terms enable row level security;
alter table public.agreements enable row level security;
alter table public.client_documents enable row level security;
alter table public.payments enable row level security;
alter table public.submissions enable row level security;
alter table public.app_settings enable row level security;

-- admins: a signed-in user may check their own membership; writes are
-- SQL-editor / service-role only.
create policy admins_select_self on public.admins
  for select using (user_id = auth.uid());

-- clients
create policy clients_admin_all on public.clients
  for all using (public.is_admin()) with check (public.is_admin());
create policy clients_select_own on public.clients
  for select using (user_id = auth.uid());
-- column restriction (phone/email only) enforced by trigger in migration 3
create policy clients_update_own on public.clients
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- admin_notes: admin only, ever.
create policy admin_notes_admin_all on public.admin_notes
  for all using (public.is_admin()) with check (public.is_admin());

-- invite_tokens: admin may read status (hash is useless without the raw
-- token); minting/consuming is service-role only.
create policy invite_tokens_admin_select on public.invite_tokens
  for select using (public.is_admin());

-- party_share_tokens: the bride manages her own share link.
create policy party_tokens_admin_all on public.party_share_tokens
  for all using (public.is_admin()) with check (public.is_admin());
create policy party_tokens_select_own on public.party_share_tokens
  for select using (client_id = public.my_client_id());
create policy party_tokens_insert_own on public.party_share_tokens
  for insert with check (client_id = public.my_client_id());
-- revoke only — trigger in migration 3 restricts which columns may change
create policy party_tokens_update_own on public.party_share_tokens
  for update using (client_id = public.my_client_id())
  with check (client_id = public.my_client_id());

-- party_members: bride has full CRUD over her party; anon has nothing
-- (party-link submissions arrive via /api/party/submit with service role).
create policy party_members_admin_all on public.party_members
  for all using (public.is_admin()) with check (public.is_admin());
create policy party_members_select_own on public.party_members
  for select using (client_id = public.my_client_id());
create policy party_members_insert_own on public.party_members
  for insert with check (client_id = public.my_client_id());
create policy party_members_update_own on public.party_members
  for update using (client_id = public.my_client_id())
  with check (client_id = public.my_client_id());
create policy party_members_delete_own on public.party_members
  for delete using (client_id = public.my_client_id());

-- intakes: client drafts and submits; status transitions guarded by trigger.
create policy intakes_admin_all on public.intakes
  for all using (public.is_admin()) with check (public.is_admin());
create policy intakes_select_own on public.intakes
  for select using (client_id = public.my_client_id());
create policy intakes_insert_own on public.intakes
  for insert with check (client_id = public.my_client_id() and status = 'draft');
create policy intakes_update_own on public.intakes
  for update using (client_id = public.my_client_id() and status in ('draft', 'changes_requested'))
  with check (client_id = public.my_client_id() and status in ('draft', 'pending'));

-- agreement_terms: any signed-in user may read the terms they are signing.
create policy agreement_terms_admin_all on public.agreement_terms
  for all using (public.is_admin()) with check (public.is_admin());
create policy agreement_terms_select_authed on public.agreement_terms
  for select to authenticated using (true);

-- agreements: client reads own signed record; writes only via /api/sign-agreement.
create policy agreements_admin_all on public.agreements
  for all using (public.is_admin()) with check (public.is_admin());
create policy agreements_select_own on public.agreements
  for select using (client_id = public.my_client_id());

-- client_documents: visible-toggle gate for clients.
create policy client_documents_admin_all on public.client_documents
  for all using (public.is_admin()) with check (public.is_admin());
create policy client_documents_select_own_visible on public.client_documents
  for select using (client_id = public.my_client_id() and visible = true);

-- payments
create policy payments_admin_all on public.payments
  for all using (public.is_admin()) with check (public.is_admin());
create policy payments_select_own on public.payments
  for select using (client_id = public.my_client_id());

-- submissions: clients see their own review states; only admin reviews.
create policy submissions_admin_all on public.submissions
  for all using (public.is_admin()) with check (public.is_admin());
create policy submissions_select_own on public.submissions
  for select using (client_id = public.my_client_id());

-- app_settings: clients may read the e-transfer address only.
create policy app_settings_admin_all on public.app_settings
  for all using (public.is_admin()) with check (public.is_admin());
create policy app_settings_select_etransfer on public.app_settings
  for select to authenticated using (key = 'etransfer_email');
