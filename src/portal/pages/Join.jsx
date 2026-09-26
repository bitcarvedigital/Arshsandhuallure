import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, publicFetch } from '../../lib/supabaseClient'
import { Field, Btn, ErrorNote, Spinner, PasswordField, btnClass } from '../../shared/ui'

// Invite registration: email prefilled & read-only, password entered twice.
export default function Join() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [info, setInfo] = useState(undefined)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    publicFetch('/api/invite-info', { token })
      .then(setInfo)
      .catch(() => setInfo({ valid: false }))
  }, [token])

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError('The two passwords don’t match.')
    setBusy(true)
    try {
      const { email } = await publicFetch('/api/accept-invite', { token, password })
      await supabase.auth.signInWithPassword({ email, password })
      navigate('/portal', { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="portal-ui min-h-screen bg-beige font-body flex flex-col items-center justify-center px-6 py-14">
      <Helmet>
        <title>Welcome | Arsh Sandhu Allure</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="w-full max-w-[360px]">
        {/* same header as the Login page */}
        <header className="text-center">
          <Link
            to="/"
            className="inline-block font-heading text-[20px] leading-tight tracking-[0.08em] pl-[0.08em] text-dark hover:text-gold transition-colors duration-300"
          >
            Arsh Sandhu Allure
          </Link>
          <h1 className="font-heading text-[2.6rem] leading-none text-dark mt-0">
            <em className="text-gold">Welcome</em>
          </h1>
          {info?.valid && (
            <p className="text-sm text-muted mt-8">
              Hi <span className="font-heading italic text-dark">{info.firstName}</span> — choose a password and
              your portal is ready.
            </p>
          )}
        </header>

        {info === undefined ? (
          <Spinner />
        ) : !info.valid ? (
          <div className="text-center">
            <p className="text-sm text-muted mt-8 leading-relaxed">
              {info.registered
                ? 'Your portal is already set up — you can sign in below.'
                : 'This link is no longer active. Please ask Arsh for a fresh one — it only takes her a tap.'}
            </p>
            <Link to="/portal/login" className={`${btnClass()} w-full mt-12`}>
              Go to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-12 flex flex-col gap-7">
            <Field label="Email" value={info.email} disabled />
            <PasswordField label="Choose a password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            <PasswordField label="Confirm password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            {error && (
              <div className="-my-2" role="status" aria-live="polite">
                <ErrorNote>{error}</ErrorNote>
              </div>
            )}
            <Btn type="submit" disabled={busy} className="w-full mt-1">
              {busy ? 'Setting up…' : 'Create my login'}
            </Btn>
          </form>
        )}
      </div>
    </div>
  )
}
