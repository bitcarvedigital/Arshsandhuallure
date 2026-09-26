import { useEffect, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, publicFetch } from '../lib/supabaseClient'
import MemberProfileForm from '../shared/MemberProfileForm'
import { Btn, ErrorNote, Spinner, fmtDate } from '../shared/ui'

const BUCKET = 'client-uploads'

export default function PartyForm() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [info, setInfo] = useState(undefined)
  const [member, setMember] = useState({ name: '', photos: {}, event_ids: [] })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const draftId = useRef(crypto.randomUUID())
  const previews = useRef({})

  useEffect(() => {
    publicFetch('/api/party/info', { token })
      .then(setInfo)
      .catch(() => setInfo({ valid: false }))
  }, [token])

  async function uploadFile(slot, file) {
    const { path, token: uploadToken } = await publicFetch('/api/party/upload-url', {
      token,
      memberId: draftId.current,
      slot,
      mime: file.type,
      size: file.size,
    })
    const { error: upErr } = await supabase.storage.from(BUCKET).uploadToSignedUrl(path, uploadToken, file)
    if (upErr) throw new Error('Upload failed — please try again')
    previews.current[path] = URL.createObjectURL(file)
    return { path }
  }

  async function submit() {
    setError('')
    if (!member.name?.trim()) {
      // the error shows here by the button, so say where the name goes rather than jumping away from it
      setError('Please add your name — it’s the first question at the top.')
      return
    }
    if (!member.services) {
      setError('Please choose the service you’re booked for.')
      return
    }
    setBusy(true)
    try {
      const { photos, ...profile } = member
      await publicFetch('/api/party/submit', {
        token,
        memberId: draftId.current,
        profile,
        photos: photos || {},
      })
      navigate(`/party/${token}/done`, { state: { bride: info.brideFirstName } })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="portal-ui min-h-screen bg-beige font-body text-dark">
      <Helmet>
        <title>Wedding Party Details | Arsh Sandhu Allure</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="max-w-2xl mx-auto px-5 py-14">
        {/* same header as the Login page */}
        <header className="text-center">
          <Link
            to="/"
            className="inline-block font-heading text-[20px] leading-tight tracking-[0.08em] pl-[0.08em] text-dark hover:text-gold transition-colors duration-300"
          >
            Arsh Sandhu Allure
          </Link>
          <h1 className="font-heading text-[2.6rem] leading-none text-dark mt-0">
            <em className="text-gold">Party</em> Details
          </h1>
        </header>

        {info === undefined ? (
          <Spinner />
        ) : !info.valid ? (
          <p className="text-center text-sm text-muted leading-relaxed max-w-sm mx-auto mt-8">
            This link is no longer active. Please check with your bride for a fresh one.
          </p>
        ) : (
          <>
            <p className="text-center text-sm text-muted leading-relaxed max-w-md mx-auto mt-8">
              You’re part of <span className="font-heading italic text-dark">{info.brideFirstName}</span>’s
              celebration{info.eventDate ? ` on ${fmtDate(info.eventDate)}` : ''} — how lovely. Tell us about
              your look below; it takes about three minutes.
            </p>
            <p className="text-center text-xs text-faint mt-2 mb-12">
              Your details go only to {info.brideFirstName} and the Arsh Sandhu Allure team.
            </p>

            <MemberProfileForm
              value={member}
              onChange={setMember}
              allowedServices={info.allowedServices?.length ? info.allowedServices : undefined}
              events={info.events || []}
              showEvents
              uploadFile={uploadFile}
              resolveUrl={async (path) => previews.current[path] || ''}
            />

            <div className="text-center">
              <p className="text-xs text-faint max-w-md mx-auto mb-6 leading-relaxed">
                By submitting, you agree that the details and photos above are shared with the bride and used
                by Arsh Sandhu Allure solely to prepare your hair and makeup services. You can ask for them to
                be removed at any time — see our{' '}
                <Link to="/privacy" className="underline hover:text-gold">
                  privacy policy
                </Link>
                .
              </p>
              <div role="status" aria-live="polite" className="empty:hidden mb-2">
                <ErrorNote>{error}</ErrorNote>
              </div>
              <Btn onClick={submit} disabled={busy} className="w-full sm:w-auto">
                {busy ? 'Sending…' : 'Send my details'}
              </Btn>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
