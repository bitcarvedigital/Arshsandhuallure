import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../AuthProvider'
import { uploadMemberPhoto, signedPhotoUrl } from '../lib/data'
import PortalShell from '../../shared/PortalShell'
import MemberProfileForm from '../../shared/MemberProfileForm'
import { Btn, ErrorNote, Spinner, StatusChip, DiamondRule, SectionHeading } from '../../shared/ui'

const NAV = [
  { to: '/portal', label: 'Journey' },
  { to: '/portal/docs', label: 'Documents' },
  { to: '/portal/settings', label: 'Settings' },
]

export default function MemberEdit() {
  const { memberId } = useParams()
  const { client, signOut } = useAuth()
  const navigate = useNavigate()
  const [member, setMember] = useState(undefined)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase
      .from('party_members')
      .select('*')
      .eq('id', memberId)
      .maybeSingle()
      .then(({ data }) => setMember(data || null))
  }, [memberId])

  async function save() {
    setError('')
    if (!member.name?.trim()) return setError('Please add a name.')
    setBusy(true)
    const { id, client_id, is_bride, source, status, submitted_at, created_at, updated_at, ...fields } = member
    const { error: err } = await supabase.from('party_members').update(fields).eq('id', id)
    setBusy(false)
    if (err) {
      setError('We couldn’t save — please try again.')
      return
    }
    navigate('/portal/intake')
  }

  async function remove() {
    if (!window.confirm(`Remove ${member.name || 'this person'} from your party?`)) return
    await supabase.from('party_members').delete().eq('id', member.id)
    navigate('/portal/intake')
  }

  if (member === undefined) {
    return (
      <PortalShell title="Profile" nav={NAV} onSignOut={signOut}>
        <Spinner />
      </PortalShell>
    )
  }
  if (!member) {
    return (
      <PortalShell title="Profile" nav={NAV} onSignOut={signOut}>
        <p className="text-sm text-[#7A6355]">
          This profile no longer exists.{' '}
          <Link to="/portal/intake" className="text-gold underline">
            Back to your intake
          </Link>
        </p>
      </PortalShell>
    )
  }

  return (
    <PortalShell title={member.is_bride ? 'Your Profile' : member.name || 'Party Profile'} nav={NAV} onSignOut={signOut}>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <SectionHeading
          eyebrow={member.is_bride ? 'Your Profile' : 'Party Profile'}
          title={member.is_bride ? 'Your look' : member.name || 'New person'}
        />
        <StatusChip status={member.status} />
      </div>
      <p className="text-sm text-[#7A6355] max-w-lg">
        The more you share, the more perfectly we prepare — photos help the most.
      </p>
      {member.status === 'approved' && (
        <p className="text-xs text-[#8A7A70] mt-3">
          This profile is confirmed — saving changes sends it back to Arsh for a quick re-check.
        </p>
      )}
      <DiamondRule className="my-8" />
      <MemberProfileForm
        value={member}
        onChange={setMember}
        hideRelation={member.is_bride}
        uploadFile={(slot, file) => uploadMemberPhoto(client.id, member.id, slot, file)}
        resolveUrl={signedPhotoUrl}
      />
      <ErrorNote>{error}</ErrorNote>
      <div className="flex flex-wrap gap-3 mt-8 pb-4">
        <Btn onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save profile'}
        </Btn>
        <Link to="/portal/intake">
          <Btn variant="outline">Cancel</Btn>
        </Link>
        {!member.is_bride && (
          <Btn variant="danger" onClick={remove}>
            Remove
          </Btn>
        )}
      </div>
    </PortalShell>
  )
}
