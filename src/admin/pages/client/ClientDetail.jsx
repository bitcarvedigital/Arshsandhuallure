import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../../lib/supabaseClient'
import { AdminShell } from '../../AdminShell'
import { Spinner, StatusChip, fmtShortDate, Pill, emptyNote } from '../../../shared/ui'
import { PageHeader } from '../../adminUi'
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
const TAB_LABELS = {
  overview: 'Overview',
  intake: 'Intake',
  agreement: 'Agreement',
  timeline: 'Timeline',
  docs: 'Docs',
  payments: 'Payments',
  notes: 'Notes',
}

export default function ClientDetail() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'overview'
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const tabsRef = useRef(null)

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

  // on a phone, keep the chosen tab in view (e.g. arriving from Review with ?tab=intake)
  useEffect(() => {
    const bar = tabsRef.current
    const el = bar?.querySelector('[aria-selected="true"]')
    if (!bar || !el) return
    if (el.offsetLeft < bar.scrollLeft || el.offsetLeft + el.offsetWidth > bar.scrollLeft + bar.clientWidth - 40) {
      bar.scrollTo({ left: Math.max(0, el.offsetLeft - 16), behavior: 'smooth' })
    }
  }, [tab, data])

  if (error) {
    return (
      <AdminShell title="Client">
        <div className={emptyNote}>
          {error}{' '}
          <Link to="/admin" className="text-dark underline underline-offset-4 hover:text-gold">
            Back to clients
          </Link>
        </div>
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
      <PageHeader
        className="!mb-0"
        back={{ to: '/admin', label: 'All clients' }}
        eyebrow="Client"
        title={
          <span className="inline-flex items-center gap-3 flex-wrap">
            {client.full_name}
            {client.status === 'archived' && (
              <span className="font-body leading-none">
                <StatusChip status="locked" label="Archived" />
              </span>
            )}
          </span>
        }
        meta={
          <>
            <p className="text-sm text-muted mt-2 flex flex-wrap gap-x-2">
              <a href={`mailto:${client.email}`} className="hover:text-gold transition-colors break-all">{client.email}</a>
              {client.phone && (
                <>
                  <span aria-hidden="true" className="text-faint">·</span>
                  <a href={`tel:${client.phone}`} className="hover:text-gold transition-colors whitespace-nowrap">{client.phone}</a>
                </>
              )}
            </p>
            {sorted.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {sorted.map((e) => (
                  <Pill key={e.id}>
                    {e.name || e.event_type} · {fmtShortDate(e.event_date)}
                  </Pill>
                ))}
              </div>
            )}
          </>
        }
      />

      {/* tabs: scroll sideways on a phone; the fade hints there are more */}
      <div className="mt-10 border-b border-line">
        <div
          role="tablist"
          aria-label="Client sections"
          ref={tabsRef}
          className="-mb-px flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,black_calc(100%_-_2.5rem),transparent)] sm:[mask-image:none]"
        >
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setSearchParams({ tab: t })}
              className={`shrink-0 px-3 sm:px-4 py-3 text-[11px] tracking-[0.2em] uppercase whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                tab === t ? 'text-dark border-gold' : 'text-faint border-transparent hover:text-dark'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
          {/* lets the last tab scroll clear of the fade */}
          <span aria-hidden="true" className="shrink-0 w-10 sm:hidden" />
        </div>
      </div>

      <div className="pt-10 pb-4">
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
