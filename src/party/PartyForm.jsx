import { useEffect, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, publicFetch } from '../lib/supabaseClient'
import MemberProfileForm from '../shared/MemberProfileForm'
import { Btn, ErrorNote, Spinner, DiamondRule, MicroLabel, fmtDate } from '../shared/ui'

const BUCKET = 'client-uploads'

export default function PartyForm() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [info, setInfo] = useState(undefined)
  const [member, setMember] = useState({ name: '', photos: {} })
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
      setError('Please add your name.')
      window.scrollTo({ top: 0 })
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
    <div className="min-h-screen bg-beige font-body text-dark">
      <Helmet>
        <title>Wedding Party Details | Arsh Sandhu Allure</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="max-w-2xl mx-auto px-5 py-14">
        <div className="text-center mb-10">
          <p className="font-heading text-2xl">Arsh Sandhu Allure</p>
          <MicroLabel className="mt-3">Hair & Makeup — Wedding Party Details</MicroLabel>
          <DiamondRule className="mt-6" />
        </div>

        {info === undefined ? (
          <Spinner />
        ) : !info.valid ? (
          <p className="text-center text-sm text-[#7A6355] leading-relaxed max-w-sm mx-auto">
            This link is no longer active. Please check with your bride for a fresh one.
          </p>
        ) : (
          <>
            <p className="text-center text-sm text-[#7A6355] leading-relaxed max-w-md mx-auto mb-2">
              You’re part of <span className="font-heading italic text-dark">{info.brideFirstName}</span>’s
              celebration{info.eventDate ? ` on ${fmtDate(info.eventDate)}` : ''} — how lovely. Tell us about
              your look below; it takes about three minutes.
            </p>
            <p className="text-center text-xs text-[#8A7A70] mb-10">
              Your details go only to {info.brideFirstName} and the Arsh Sandhu Allure team.
            </p>

            <MemberProfileForm
              value={member}
              onChange={setMember}
              uploadFile={uploadFile}
              resolveUrl={async (path) => previews.current[path] || ''}
            />

            <div className="mt-10 border-t border-[#E0D2C2] pt-8 text-center">
              <p className="text-xs text-[#8A7A70] max-w-md mx-auto mb-5 leading-relaxed">
                By submitting, you agree that the details and photos above are shared with the bride and used
                by Arsh Sandhu Allure solely to prepare your hair and makeup services. You can ask for them to
                be removed at any time — see our{' '}
                <Link to="/privacy" className="underline hover:text-gold">
                  privacy policy
                </Link>
                .
              </p>
              <ErrorNote>{error}</ErrorNote>
              <Btn onClick={submit} disabled={busy}>
                {busy ? 'Sending…' : 'Send My Details'}
              </Btn>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
