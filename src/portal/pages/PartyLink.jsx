import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../AuthProvider'
import { generatePartyToken } from '../lib/data'
import PortalShell from '../../shared/PortalShell'
import { Btn, Spinner, StatusChip, DiamondRule, SectionHeading, MicroLabel } from '../../shared/ui'

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
    const expires = client.event_date
      ? new Date(new Date(`${client.event_date}T00:00:00`).getTime() + 30 * 86400000)
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
      <SectionHeading eyebrow="Your Party Link" title="Let everyone fill in their own" className="mb-2" />
      <p className="text-sm text-[#7A6355] max-w-lg">
        Share one link with your bridal party — each person fills in their own details and photos, and their
        profile lands in your intake automatically. No accounts, no passwords.
      </p>
      <DiamondRule className="my-8" />

      {token === undefined ? (
        <Spinner />
      ) : token ? (
        <div className="border border-[#C8B8AC] bg-[#FBF8F4] p-6">
          <MicroLabel className="mb-3">Your live link</MicroLabel>
          <input
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
            className="w-full bg-transparent border-b border-[#A89080] py-2 text-sm text-dark focus:outline-none"
          />
          <div className="flex flex-wrap gap-3 mt-5">
            <Btn onClick={copy}>{copied ? 'Copied ✓' : 'Copy link'}</Btn>
            <Btn variant="danger" onClick={revoke} disabled={busy}>
              Turn off link
            </Btn>
          </div>
          <p className="text-xs text-[#8A7A70] mt-4">
            Active until {new Date(token.expires_at).toLocaleDateString('en-CA')}. You can turn it off anytime;
            a new link can always be made.
          </p>
        </div>
      ) : (
        <div className="border border-dashed border-[#C8B8AC] p-8 text-center">
          <p className="text-sm text-[#7A6355] mb-5">No active link right now.</p>
          <Btn onClick={generate} disabled={busy}>
            {busy ? 'Creating…' : 'Create my party link'}
          </Btn>
        </div>
      )}

      <div className="mt-10">
        <MicroLabel className="mb-4">Submitted through your link ({submitted.length})</MicroLabel>
        <div className="flex flex-col gap-3">
          {submitted.length === 0 && (
            <p className="text-sm text-[#A89080]">No submissions yet — they’ll appear here the moment someone finishes.</p>
          )}
          {submitted.map((m) => (
            <Link
              key={m.id}
              to={`/portal/intake/member/${m.id}`}
              className="flex items-center justify-between gap-3 border border-[#C8B8AC] bg-[#FBF8F4] hover:border-gold transition-colors p-4"
            >
              <div className="min-w-0">
                <h3 className="font-heading text-base text-dark truncate">{m.name}</h3>
                <p className="text-xs text-[#8A7A70]">{m.relation || '—'}</p>
              </div>
              <StatusChip status={m.status} />
            </Link>
          ))}
        </div>
      </div>
    </PortalShell>
  )
}
