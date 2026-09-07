-- Notify Arsh by email whenever a client submits something.
-- The trigger POSTs to /api/hooks/submission-created, which sends the mail.
-- Config lives in a private table (RLS on, zero policies) so the shared secret
-- is readable only by the service role and this security-definer function —
-- never by admins, never by clients, and never committed to git.

create extension if not exists pg_net with schema extensions;

create table if not exists public.private_config (
  key text primary key,
  value text not null
);
alter table public.private_config enable row level security;
-- deliberately no policies: service role + security definer functions only

create or replace function public.notify_submission_webhook()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text;
  v_secret text;
begin
  select value into v_url from public.private_config where key = 'webhook_url';
  select value into v_secret from public.private_config where key = 'webhook_secret';
  if v_url is null or v_secret is null then
    return new; -- not configured yet; never block the write
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'submissions',
      'record', to_jsonb(new)
    ),
    timeout_milliseconds := 5000
  );
  return new;
exception when others then
  -- email is a courtesy, never a gate: a webhook failure must not roll back
  -- a client's submission
  return new;
end;
$$;

drop trigger if exists submissions_notify on public.submissions;
create trigger submissions_notify
  after insert on public.submissions
  for each row execute function public.notify_submission_webhook();
