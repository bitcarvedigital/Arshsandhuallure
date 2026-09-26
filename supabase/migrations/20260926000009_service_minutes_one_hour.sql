-- Every service is one hour on the getting-ready timeline (Bhagesh, 2026-09-26).
-- The price list's service entries and the service lines already on bookings
-- move to 60 minutes. Arsh can still change a service's minutes in Settings →
-- Price list, or any single person's time in the timeline builder.
-- Published timelines keep their saved brick times until she rebuilds them.

update public.app_settings
set value = (
  select jsonb_agg(
           case when e->>'kind' = 'service' then jsonb_set(e, '{minutes}', '60'::jsonb) else e end
           order by ord
         )::text
  from jsonb_array_elements(value::jsonb) with ordinality as t(e, ord)
)
where key = 'price_list'
  and jsonb_typeof(value::jsonb) = 'array';

-- minutes never change a total, so refresh_client_booking finds nothing to rewrite
update public.event_line_items
set minutes = 60
where kind = 'service'
  and minutes is distinct from 60;
