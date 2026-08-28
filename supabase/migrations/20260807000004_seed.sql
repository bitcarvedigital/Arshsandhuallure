-- Migration 4/4: seed data + storage bucket & policies.
-- Admin users are seeded separately (scripts/seed-local.mjs locally; SQL editor
-- in prod after creating the auth users) — never from a migration.

insert into public.app_settings (key, value) values
  ('etransfer_email', 'arshsandhuallure@gmail.com'),
  ('notification_email', 'arshsandhuallure@gmail.com'),
  ('current_terms_version', '1')
on conflict (key) do nothing;

insert into public.agreement_terms (version, body) values (1, '{
  "intro": "This Service Agreement (\"Agreement\") is entered into between Arsh Sandhu Allure (\"Artist\") and the undersigned client (\"Client\") for the provision of professional hair and/or makeup services on the date(s) indicated below.",
  "sections": [
    {"n": 1, "title": "Booking & Retainer Fee", "body": "A non-refundable retainer fee of 30% of the total service fee is required to confirm your booking. Your date will not be secured until the retainer has been received. The retainer is applied toward the final balance of your service."},
    {"n": 2, "title": "Travel & Accommodation", "body": "A travel fee, based on the distance from the Artist''s location to the service location, is added to the final invoice. For events that require the Artist to travel beyond the Greater Toronto Area, all travel and accommodation arrangements and costs are the responsibility of the Client."},
    {"n": 3, "title": "Face & Hair Preparation", "body": "Clients must ensure their face and/or hair is clean, product-free, dry, and blow-dried prior to the service, unless a blow-dry has been explicitly booked. Failure to do so may result in an additional charge based on the time and effort required on the day of the event."},
    {"n": 4, "title": "Final Payment", "body": "The remaining balance must be paid in full on or before the day of the scheduled service, prior to the commencement of services. Accepted payment methods are cash or e-transfer (details provided upon request)."},
    {"n": 5, "title": "Rescheduling, Ready-Time Changes & Cancellations", "body": "The Client may change the event date or ready time at no cost, provided the request is made at least four (4) weeks before the booked service date and is subject to the Artist''s availability. A request made within four (4) weeks of the event may incur a rescheduling fee of $100 CAD. Ready-time changes are generally permitted at no charge, unless the change is significant enough to require the Artist to adjust their overall schedule, in which case additional fees may apply. All changes are subject to availability and are not guaranteed. Cancellation within seven (7) days of the event requires full payment."},
    {"n": 6, "title": "Client Responsibility & Timeliness", "body": "The Client is responsible for ensuring that all individuals receiving services are ready and present at the agreed time. Any delays caused by the Client may result in reduced service time or additional charges."},
    {"n": 7, "title": "Photography & Promotion Consent", "body": "The Client agrees or does not agree (as selected below) to allow photographs of the final hair and/or makeup look to be used for the Artist''s professional portfolio, website, and social media."},
    {"n": 8, "title": "Allergies & Liability Release", "body": "The Client must inform the Artist in advance of any allergies or sensitivities. If the Artist is not informed, the Artist holds no liability for any resulting reaction. The Artist is not liable for circumstances beyond their reasonable control."}
  ],
  "closing": "By signing below, the Client confirms that they have read, understood, and agreed to the terms and conditions outlined in this Agreement, and acknowledges that it is binding upon signature."
}'::jsonb)
on conflict (version) do nothing;

-- ---------------------------------------------------------------------------
-- Storage: one private bucket for all client uploads
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-uploads', 'client-uploads', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do nothing;

-- Path convention: {client_id}/members/{member_id}/{slot}/{uuid}.{ext}
-- Admin: everything. Client: her own folder tree. Anon: nothing — party-link
-- uploads use short-lived signed upload URLs minted by /api/party/upload-url.
create policy uploads_admin_all on storage.objects
  for all using (bucket_id = 'client-uploads' and public.is_admin())
  with check (bucket_id = 'client-uploads' and public.is_admin());

create policy uploads_client_select on storage.objects
  for select using (
    bucket_id = 'client-uploads'
    and (storage.foldername(name))[1] = public.my_client_id()::text
  );

create policy uploads_client_insert on storage.objects
  for insert with check (
    bucket_id = 'client-uploads'
    and (storage.foldername(name))[1] = public.my_client_id()::text
  );

create policy uploads_client_delete on storage.objects
  for delete using (
    bucket_id = 'client-uploads'
    and (storage.foldername(name))[1] = public.my_client_id()::text
  );
