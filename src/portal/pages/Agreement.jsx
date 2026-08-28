import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, authedFetch } from '../../lib/supabaseClient'
import { useAuth } from '../AuthProvider'
import PortalShell from '../../shared/PortalShell'
import { Field, Btn, ErrorNote, Spinner, StatusChip, DiamondRule, MicroLabel, SectionHeading, money, fmtDate, fmtTime, labelClass } from '../../shared/ui'

const NAV = [
  { to: '/portal', label: 'Journey' },
  { to: '/portal/docs', label: 'Documents' },
  { to: '/portal/settings', label: 'Settings' },
]

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-[#EFE6DA] text-sm">
      <span className="text-[#7A6355]">{label}</span>
      <span className="text-dark text-right">{value ?? '—'}</span>
    </div>
  )
}

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

export default function Agreement() {
  const { client, signOut } = useAuth()
  const navigate = useNavigate()
  const [agreement, setAgreement] = useState(undefined) // undefined = loading
  const [terms, setTerms] = useState(null)
  const [photoConsent, setPhotoConsent] = useState('')
  const [signedName, setSignedName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: ag }, { data: t }] = await Promise.all([
        supabase
          .from('agreements')
          .select('*')
          .in('status', ['signed', 'approved'])
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from('agreement_terms').select('*').order('version', { ascending: false }).limit(1).maybeSingle(),
      ])
      setAgreement(ag || null)
      setTerms(t || null)
    }
    load()
  }, [])

  async function sign(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { agreement: ag } = await authedFetch('/api/sign-agreement', {
        photoConsent,
        signedName,
        agreed,
      })
      setAgreement(ag)
      window.scrollTo({ top: 0 })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const snap = agreement?.snapshot || client || {}

  return (
    <PortalShell title="Service Agreement" nav={NAV} onSignOut={signOut}>
      {agreement === undefined ? (
        <Spinner />
      ) : (
        <article className="bg-[#FBF8F4] border border-[#E5D9CC] px-6 py-10 md:px-12 md:py-12 print:border-0 print:px-0">
          <div className="text-center mb-8">
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

          <SectionHeading eyebrow="Client Information" title="Your Booking" className="mb-4" />
          <div className="mb-8">
            <InfoRow label="Client name" value={snap.full_name} />
            <InfoRow label="Contact" value={[snap.phone, snap.email].filter(Boolean).join(' · ')} />
            <InfoRow label="Event" value={snap.event_type} />
            <InfoRow label="Event date" value={fmtDate(snap.event_date)} />
            <InfoRow label="Ready time" value={fmtTime(snap.ready_time)} />
            <InfoRow label="Service location" value={snap.getting_ready_address} />
            <InfoRow label="Individuals served" value={snap.party_size} />
          </div>

          <SectionHeading eyebrow="Services & Investment" title="Your Investment" className="mb-4" />
          <div className="mb-8">
            <InfoRow label="Professional services" value={money(snap.amount_services)} />
            <InfoRow label="Travel" value={money(snap.amount_travel)} />
            <InfoRow label="Total service fee" value={money(snap.amount_total)} />
            <InfoRow label="Non-refundable retainer (30%)" value={money(snap.amount_retainer)} />
            <InfoRow label="Balance due before service" value={money(snap.amount_balance)} />
          </div>

          <SectionHeading eyebrow="Terms & Conditions" title="The Fine Print" className="mb-4" />
          <div className="mb-10">
            <TermsBlock terms={terms?.body} />
          </div>

          {agreement ? (
            <div className="border-t border-[#E0D2C2] pt-6">
              <MicroLabel className="mb-4">Signature Record</MicroLabel>
              <InfoRow label="Signed by" value={<span className="font-heading italic text-lg">{agreement.signed_name}</span>} />
              <InfoRow label="Signed on" value={new Date(agreement.signed_at).toLocaleString('en-CA')} />
              <InfoRow
                label="Photography consent"
                value={agreement.photo_consent === 'agrees' ? 'Agrees' : 'Does not agree'}
              />
              <div className="mt-8 flex flex-wrap gap-3 justify-center print:hidden">
                <Btn variant="outline" onClick={() => window.print()}>Print / Save as PDF</Btn>
                <Btn variant="gold" onClick={() => navigate('/portal')}>Back to Journey</Btn>
              </div>
            </div>
          ) : (
            <form onSubmit={sign} className="border-t border-[#E0D2C2] pt-8 flex flex-col gap-6">
              <MicroLabel>Agreement & Acknowledgment</MicroLabel>
              <div className="flex flex-col gap-2">
                <span className={labelClass}>Photography & promotion consent *</span>
                <div className="flex flex-col gap-2">
                  {[
                    { v: 'agrees', l: 'I agree — my final look may appear in the Artist’s portfolio and social media' },
                    { v: 'does_not_agree', l: 'I do not agree — please keep my photos private' },
                  ].map((o) => (
                    <label key={o.v} className="flex items-start gap-3 text-sm text-[#4A3828] cursor-pointer">
                      <input
                        type="radio"
                        name="photoConsent"
                        checked={photoConsent === o.v}
                        onChange={() => setPhotoConsent(o.v)}
                        className="mt-1 accent-[#7A5A32]"
                        required
                      />
                      {o.l}
                    </label>
                  ))}
                </div>
              </div>
              <Field
                label="Type your full legal name as your signature"
                required
                value={signedName}
                onChange={(e) => setSignedName(e.target.value)}
                placeholder={client?.full_name || 'Full name'}
              />
              {signedName && (
                <p className="font-heading italic text-2xl text-dark border-b border-[#C8B8AC] pb-2">{signedName}</p>
              )}
              <label className="flex items-start gap-3 text-sm text-[#4A3828] cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 accent-[#7A5A32]"
                  required
                />
                I have read, understood, and agree to the terms and conditions above, and I understand this
                agreement is binding upon signature.
              </label>
              <ErrorNote>{error}</ErrorNote>
              <Btn type="submit" disabled={busy || !agreed || !signedName || !photoConsent}>
                {busy ? 'Signing…' : 'Sign Agreement'}
              </Btn>
            </form>
          )}
        </article>
      )}
    </PortalShell>
  )
}
