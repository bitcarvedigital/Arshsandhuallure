// Everything priced on a client's booking, loaded with the service role.
export async function loadBooking(admin, clientId) {
  const [ev, li, pay] = await Promise.all([
    admin.from('events').select('*').eq('client_id', clientId).order('sort_order'),
    admin.from('event_line_items').select('*').eq('client_id', clientId).order('sort_order'),
    admin.from('payments').select('*').eq('client_id', clientId),
  ])
  return { events: ev.data || [], lines: li.data || [], payments: pay.data || [] }
}
