-- Weekly automated backups: a private bucket (service role only — no
-- storage.objects policies on purpose) and the address the copy is emailed to.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('backups', 'backups', false, 52428800, array['application/json'])
on conflict (id) do nothing;

insert into public.app_settings (key, value)
values ('backup_email', 'bhanumalhi@gmail.com')
on conflict (key) do nothing;
