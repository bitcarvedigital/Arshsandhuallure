import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../../lib/supabaseClient'
import { AdminShell } from '../../AdminShell'
import { Spinner, StatusChip, fmtShortDate } from '../../../shared/ui'
import { parsePriceList } from '../../../shared/booking/services.js'
import { sortEvents } from '../../../shared/booking/pricing.js'
import OverviewTab from './OverviewTab'
import IntakeTab from './IntakeTab'
import AgreementTab from './AgreementTab'
import TimelineTab from './TimelineTab'
import DocsTab from './DocsTab'
import PaymentsTab from './PaymentsTab'
import NotesTab from './NotesTab'

const TABS = ['overview', 'intake', 'agreement', 'timeline', 'docs', 'payments', 'notes']

export default function ClientDetail() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'overview'
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [client, notes, intakes, members, agreement, docs, payments, events, lines, timelines, invoices, settings] =
      await Promise.all([
        supabase.from('clients').select('*').eq('id', id).maybeSingle(),
        supabase.from('admin_notes').select('*').eq('client_id', id).maybeSingle(),
        supabase.from('intakes').select('*').eq('client_id', id).neq('status', 'superseded').order('version', { ascending: false }).limit(1),
        supabase.from('party_members').select('*').eq('client_id', id).order('is_bride', { ascending: false }).order('created_at'),
        supabase.from('agreements').select('*').eq('client_id', id).in('status', ['signed', 'approved']).order('version', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('client_documents').select('*').eq('client_id', id),
        supabase.from('payments').select('*').eq('client_id', id).order('created_at'),
        supabase.from('events').select('*').eq('client_id', id).order('sort_order'),
        supabase.from('event_line_items').select('*').eq('client_id', id).order('sort_order'),
        supabase.from('event_timelines').select('*').eq('client_id', id),
        supabase.from('invoices').select('*').eq('client_id', id).order('created_at', { ascending: false }),
        supabase.from('app_settings').select('key, value').in('key', ['price_list', 'etransfer_email']),
      ])
    if (!client.data) {
      setError('Client not found.')
      return
    }
    const setting = (k) => (settings.data || []).find((r) => r.key === k)?.value
    setData({
      client: client.data,
      notes: notes.data,
      intake: (intakes.data || [])[0] || null,
      members: members.data || [],
      agreement: agreement.data || null,
      docs: docs.data || [],
      payments: payments.data || [],
      events: events.data || [],
      lines: lines.data || [],
      timelines: timelines.data || [],
      invoices: invoices.data || [],
      priceList: parsePriceList(setting('price_list')),
      etransferEmail: setting('etransfer_email') || '',
    })
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (error) {
    return (
      <AdminShell title="Client">
        <p className="text-sm text-[#7A6355]">{error} <Link to="/admin" className="text-gold underline">Back to clients</Link></p>
      </AdminShell>
    )
  }
  if (!data) {
    return (
      <AdminShell title="Client">
        <Spinner />
      </AdminShell>
    )
  }

  const { client } = data
  const sorted = sortEvents(data.events)
  const props = { ...data, reload: load }
  // remount the editor whenever the saved booking changes, so new rows pick up their DB ids
  const bookingKey = [client.updated_at, ...data.events.map((e) => e.id + e.updated_at), ...data.lines.map((l) => l.id + l.updated_at)].join('|')

  return (
    <AdminShell title={client.full_name} wide={tab === 'timeline'}>
      <div className="mb-2">
        <Link to="/admin" className="text-xs tracking-[0.2em] uppercase text-[#8A7A70] hover:text-gold">
          ← All clients
        </Link>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="font-heading text-3xl text-dark">{client.full_name}</h1>
        {client.status === 'archived' && <StatusChip status="locked" label="Archived" />}
      </div>
      <p className="text-sm text-[#7A6355] mt-1">{client.email}</p>
      {sorted.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {sorted.map((e) => (
            <span key={e.id} className="text-[10px] tracking-[0.15em] uppercase border border-[#C8B8AC] px-2.5 py-1 text-dark">
              {e.name || e.event_type} · {fmtShortDate(e.event_date)}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-1 mt-8 border-b border-[#C8B8AC] overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setSearchParams({ tab: t })}
            className={`px-4 py-3 text-[11px] tracking-[0.2em] uppercase whitespace-nowrap transition-colors cursor-pointer ${
              tab === t ? 'text-gold border-b-2 border-gold -mb-px' : 'text-[#8A7A70] hover:text-dark'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="py-8">
        {tab === 'overview' && <OverviewTab key={bookingKey} {...props} />}
        {tab === 'intake' && <IntakeTab {...props} />}
        {tab === 'agreement' && <AgreementTab {...props} />}
        {tab === 'timeline' && <TimelineTab {...props} />}
        {tab === 'docs' && <DocsTab {...props} />}
        {tab === 'payments' && <PaymentsTab key={data.payments.map((p) => `${p.id}${p.status}${p.amount}`).join()} {...props} />}
        {tab === 'notes' && <NotesTab notes={data.notes} clientId={client.id} />}
      </div>
    </AdminShell>
  )
}
