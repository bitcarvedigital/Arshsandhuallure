-- Migration 8: invoice numbers are only ever taken by the studio.
-- BEFORE INSERT triggers run before RLS, so a client's (rejected) invoice
-- insert used to consume a number from invoice_seq. Refuse non-studio callers
-- before nextval(), then restart numbering right after the last real invoice.

create or replace function public.assign_invoice_number()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if not (public.is_admin() or coalesce(auth.role(), 'service_role') = 'service_role') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  new.seq := nextval('public.invoice_seq');
  new.number := 'ASA-' || to_char(new.issued_on, 'YYYY') || '-' || lpad(new.seq::text, 4, '0');
  return new;
end;
$$;

revoke all on function public.assign_invoice_number() from public, anon, authenticated;

select setval('public.invoice_seq', coalesce((select max(seq) from public.invoices), 0) + 1, false);
