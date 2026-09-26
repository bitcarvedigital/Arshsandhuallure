import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../AuthProvider'
import { generatePartyToken } from '../lib/data'
import PortalShell from '../../shared/PortalShell'
import { Btn, Spinner, StatusChip, MicroLabel, rowLine, rowLink, softPanel, emptyNote, fmtShortDate } from '../../shared/ui'

const NAV = [
  { to: '/portal', label: 'Journey' },
  { to: '/portal/docs', label: 'Documents' },
  { to: '/portal/settings', label: 'Settings' },
]

export default function PartyLink() {
  const { client, signOut } = useAuth()
  const [token, setToken] = useState(undefined)
  const [submitted, setSubmitted] = useState([])
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const [{ data: tokens }, { data: members }] = await Promise.all([
      supabase
        .from('party_share_tokens')
        .select('*')
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1),
      supabase.from('party_members').select('id, name, relation, status, submitted_at').eq('source', 'party_link').order('created_at'),
    ])
    setToken((tokens || [])[0] || null)
    setSubmitted(members || [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function generate() {
    setBusy(true)
    // open until 30 days after her LAST event
    const { data: evs } = await supabase.from('events').select('event_date')
    const last = (evs || []).map((e) => e.event_date).filter(Boolean).sort().pop() || client.event_date
    const expires = last
      ? new Date(new Date(`${last}T00:00:00`).getTime() + 30 * 86400000)
      : new Date(Date.now() + 90 * 86400000)
    const { data } = await supabase
      .from('party_share_tokens')
      .insert({ client_id: client.id, token: generatePartyToken(), expires_at: expires.toISOString() })
      .select()
      .single()
    setToken(data || null)
    setBusy(false)
  }

  async function revoke() {
    if (!window.confirm('Turn off this link? Anyone who has it will no longer be able to submit.')) return
    setBusy(true)
    await supabase
      .from('party_share_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', token.id)
    setToken(null)
    setBusy(false)
  }

  const url = token ? `${window.location.origin}/party/${token.token}` : ''

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* older browsers: the input below is selectable */
    }
  }

  return (
    <PortalShell title="Party Link" nav={NAV} onSignOut={signOut}>
      <div className="mb-6 print:hidden">
        <Link to="/portal/intake" className="inline-block py-3 -my-3 text-[11px] tracking-[0.2em] uppercase text-faint hover:text-gold transition-colors">
          ← Your intake
        </Link>
      </div>
      <MicroLabel className="mb-2">Your Party Link</MicroLabel>
      <h1 className="font-heading text-3xl text-dark">Let everyone fill in their own</h1>
      <p className="text-sm text-muted max-w-lg mt-2">
        Share one link with your bridal party — each person fills in their own details and photos, and their
        profile lands in your intake automatically. No accounts, no passwords.
      </p>

      {token === undefined ? (
        <Spinner />
      ) : token ? (
        <div className={`${softPanel} px-5 py-6 sm:px-6 mt-10`}>
          <MicroLabel className="mb-3">Your live link</MicroLabel>
          <input
            aria-label="Your party link"
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
            className="w-full bg-transparent border-b border-[#A89080] py-2 text-sm text-dark focus:outline-none focus:border-gold"
          />
          <Btn onClick={copy} className="w-full sm:w-auto mt-6">{copied ? 'Copied ✓' : 'Copy link'}</Btn>
          <span role="status" aria-live="polite" className="sr-only">{copied ? 'Link copied' : ''}</span>
          <p className="text-xs text-faint mt-5 leading-relaxed">
            {/* en-CA gives the local YYYY-MM-DD, so the date shown is the bride's own day */}
            Active until {fmtShortDate(new Date(token.expires_at).toLocaleDateString('en-CA'))}. You can turn it off
            anytime; a new link can always be made.
          </p>
          <button
            type="button"
            onClick={revoke}
            disabled={busy}
            className="mt-2 min-h-[40px] text-[11px] tracking-[0.2em] uppercase text-danger hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            Turn off link
          </button>
        </div>
      ) : (
        <div className={`${emptyNote} mt-10`}>
          <p className="text-muted mb-5">No active link right now.</p>
          <Btn onClick={generate} disabled={busy}>
            {busy ? 'Creating…' : 'Create my party link'}
          </Btn>
        </div>
      )}

      <div className="mt-12">
        <MicroLabel className="mb-4">Submitted through your link ({submitted.length})</MicroLabel>
        <div className="border-t border-line">
          {submitted.length === 0 && (
            <p className="text-sm text-faint py-5">No submissions yet — they’ll appear here the moment someone finishes.</p>
          )}
          {submitted.map((m) => (
            <div key={m.id} className={rowLine}>
              <Link to={`/portal/intake/member/${m.id}`} className={rowLink}>
                <div className="min-w-0">
                  <h3 className="font-heading text-lg text-dark truncate">{m.name}</h3>
                  <p className="text-sm text-muted mt-0.5 truncate">{m.relation || '—'}</p>
                </div>
                <span className="shrink-0">
                  <StatusChip status={m.status} />
                </span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </PortalShell>
  )
}
