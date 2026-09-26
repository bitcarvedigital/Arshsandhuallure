import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, authedFetch } from '../../lib/supabaseClient'
import { useAuth } from '../AuthProvider'
import { loadPortalBundle } from '../lib/data'
import PortalShell from '../../shared/PortalShell'
import { Field, Btn, ErrorNote, Spinner, StatusChip, DiamondRule, MicroLabel, FormSection, InfoRow, money, fmtDate, fmtTime, labelClass } from '../../shared/ui'
import { summarizeBooking, paymentHistory } from '../../shared/booking/pricing.js'
import EventCards from '../../shared/booking/EventCards'
import FeeSchedule from '../../shared/booking/FeeSchedule'
import PaymentsLedger from '../../shared/booking/PaymentsLedger'

const NAV = [
  { to: '/portal', label: 'Journey' },
  { to: '/portal/docs', label: 'Documents' },
  { to: '/portal/settings', label: 'Settings' },
]

function TermsBlock({ terms }) {
  if (!terms) return null
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm leading-relaxed text-[#4A3828]">{terms.intro}</p>
      {terms.sections.map((s) => (
        <div key={s.n}>
          <h3 className="font-heading text-base text-dark mb-1">
            {s.n}. {s.title}
          </h3>
          <p className="text-sm leading-relaxed text-[#4A3828]">{s.body}</p>
        </div>
      ))}
      <p className="text-sm leading-relaxed text-[#4A3828] italic">{terms.closing}</p>
    </div>
  )
}

// Agreements signed before multi-event booking froze flat fields only.
function LegacyBooking({ snap }) {
  return (
    <>
      <FormSection title="Your booking">
        <div>
          <InfoRow label="Client name" value={snap.full_name} />
          <InfoRow label="Contact" value={[snap.phone, snap.email].filter(Boolean).join(' · ')} />
          <InfoRow label="Event" value={snap.event_type} />
          <InfoRow label="Event date" value={fmtDate(snap.event_date)} />
          <InfoRow label="Ready time" value={fmtTime(snap.ready_time)} />
          <InfoRow label="Service location" value={snap.getting_ready_address} />
          <InfoRow label="Individuals served" value={snap.party_size} />
        </div>
      </FormSection>
      <FormSection title="Fee schedule">
        <div>
          <InfoRow label="Professional services" value={money(snap.amount_services)} />
          <InfoRow label="Travel" value={money(snap.amount_travel)} />
          <InfoRow label="Total service fee" value={money(snap.amount_total)} />
          <InfoRow label="Non-refundable retainer (30%)" value={money(snap.amount_retainer)} />
          <InfoRow label="Balance due before service" value={money(snap.amount_balance)} />
        </div>
      </FormSection>
    </>
  )
}

export default function Agreement() {
  const { client, signOut } = useAuth()
  const navigate = useNavigate()
  const [agreement, setAgreement] = useState(undefined) // undefined = loading
  const [terms, setTerms] = useState(null)
  const [bundle, setBundle] = useState(null)
  const [photoConsent, setPhotoConsent] = useState('')
  const [signedName, setSignedName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    async function load() {
      const b = await loadPortalBundle()
      // once signed, show the exact terms version she signed — not whatever is newest
      const termsQuery = b.agreement
        ? supabase.from('agreement_terms').select('*').eq('version', b.agreement.terms_version).maybeSingle()
        : supabase.from('agreement_terms').select('*').order('version', { ascending: false }).limit(1).maybeSingle()
      const { data: t } = await termsQuery
      setBundle(b)
      setAgreement(b.agreement || null)
      setTerms(t || null)
    }
    load()
  }, [])

  async function sign(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { agreement: ag } = await authedFetch('/api/sign-agreement', { photoConsent, signedName, agreed })
      setAgreement(ag)
      window.scrollTo({ top: 0 })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const live = bundle ? summarizeBooking(bundle.events, bundle.lines, bundle.payments) : null
  const snap = agreement?.snapshot
  const signedV2 = snap?.schema === 2
  const quoteReady = live && live.total != null && client?.amount_total != null
  const liveTotals = live && {
    ...live,
    total: client?.amount_total ?? live.total,
    retainer: client?.amount_retainer ?? live.retainer,
    balance: client?.amount_balance ?? live.balance,
  }
  const history = bundle ? paymentHistory(bundle.payments, bundle.events) : []

  return (
    <PortalShell title="Service Agreement" nav={NAV} onSignOut={signOut}>
      {agreement === undefined ? (
        <Spinner />
      ) : (
        <article className="bg-[#FBF8F4] border border-[#E5D9CC] px-6 py-10 md:px-12 md:py-12 print:border-0 print:px-0">
          <div className="text-center mb-10">
            <MicroLabel className="mb-2">Luxury Bridal Hair & Makeup</MicroLabel>
            <h1 className="font-heading text-3xl text-dark">Client Service Agreement</h1>
            {agreement && (
              <div className="mt-4">
                <StatusChip
                  status={agreement.status === 'approved' ? 'done' : 'pending'}
                  label={agreement.status === 'approved' ? 'Signed & confirmed' : 'Signed — awaiting confirmation'}
                />
              </div>
            )}
            <DiamondRule className="mt-6" />
          </div>

          {agreement && !signedV2 ? (
            <LegacyBooking snap={snap || {}} />
          ) : (
            <>
              <FormSection title="Your booking" hint={signedV2 ? null : 'Every event you’ve booked with us.'}>
                <div>
                  <InfoRow label="Client name" value={(signedV2 ? snap.full_name : client?.full_name) || '—'} />
                  <InfoRow label="Contact" value={[signedV2 ? snap.phone : client?.phone, signedV2 ? snap.email : client?.email].filter(Boolean).join(' · ')} />
                </div>
                <EventCards events={signedV2 ? snap.events : live?.events || []} />
              </FormSection>

              <FormSection title="Fee schedule" hint="What each service and fee costs, event by event.">
                <FeeSchedule events={signedV2 ? snap.events : live?.events || []} totals={signedV2 ? snap.totals : liveTotals || {}} />
              </FormSection>
            </>
          )}

          <FormSection
            title="Payments received"
            hint={agreement ? 'Kept up to date as payments arrive — not part of the signed text above.' : null}
          >
            <PaymentsLedger
              history={history}
              total={client?.amount_total}
              paid={live?.paid}
              outstanding={live?.outstanding}
              emptyText="Nothing received yet — your retainer is the first payment."
            />
          </FormSection>

          <FormSection title="Terms & conditions">
            <TermsBlock terms={terms?.body} />
          </FormSection>

          {agreement ? (
            <FormSection title="Signature record">
              <div>
                <InfoRow label="Signed by" value={<span className="font-heading italic text-lg">{agreement.signed_name}</span>} />
                <InfoRow label="Signed on" value={new Date(agreement.signed_at).toLocaleString('en-CA')} />
                <InfoRow label="Photography consent" value={agreement.photo_consent === 'agrees' ? 'Agrees' : 'Does not agree'} />
              </div>
              <div className="flex flex-wrap gap-3 justify-center print:hidden">
                <Btn variant="outline" onClick={() => window.print()}>Print / Save as PDF</Btn>
                <Btn variant="gold" onClick={() => navigate('/portal')}>Back to Journey</Btn>
              </div>
            </FormSection>
          ) : !quoteReady ? (
            <p className="text-sm text-[#7A6355] border border-dashed border-[#C8B8AC] p-6 text-center">
              Your quote is being finalised — Arsh will let you know as soon as it’s ready to sign.
            </p>
          ) : (
            <form onSubmit={sign}>
              <FormSection title="Photography & promotion consent">
                <div className="flex flex-col gap-2">
                  <span className={labelClass}>Photography & promotion consent *</span>
                  <div className="flex flex-col gap-2">
                    {[
                      { v: 'agrees', l: 'I agree — my final look may appear in the Artist’s portfolio and social media' },
                      { v: 'does_not_agree', l: 'I do not agree — please keep my photos private' },
                    ].map((o) => (
                      <label key={o.v} className="flex items-start gap-3 text-sm text-[#4A3828] cursor-pointer">
                        <input type="radio" name="photoConsent" checked={photoConsent === o.v} onChange={() => setPhotoConsent(o.v)} className="mt-1 accent-[#7A5A32]" required />
                        {o.l}
                      </label>
                    ))}
                  </div>
                </div>
              </FormSection>
              <FormSection title="Agreement & signature">
                <Field
                  label="Type your full legal name as your signature"
                  required
                  value={signedName}
                  onChange={(e) => setSignedName(e.target.value)}
                  placeholder={client?.full_name || 'Full name'}
                />
                {signedName && <p className="font-heading italic text-2xl text-dark border-b border-[#C8B8AC] pb-2">{signedName}</p>}
                <label className="flex items-start gap-3 text-sm text-[#4A3828] cursor-pointer">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 accent-[#7A5A32]" required />
                  I have read, understood, and agree to the terms and conditions above, and I understand this
                  agreement is binding upon signature.
                </label>
                <ErrorNote>{error}</ErrorNote>
                <Btn type="submit" disabled={busy || !agreed || !signedName || !photoConsent}>
                  {busy ? 'Signing…' : 'Sign Agreement'}
                </Btn>
              </FormSection>
            </form>
          )}
        </article>
      )}
    </PortalShell>
  )
}
