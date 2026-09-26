import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth, resolveRole } from '../AuthProvider'
import { Field, Btn, ErrorNote, PasswordField } from '../../shared/ui'

// One page, two doors. The studio login only accepts studio accounts and the
// client login only accepts client accounts — a wrong-kind account gets an
// error (and is signed straight back out), never the other portal.

// Clears the session even when the sign-out call can't reach the server, so a
// wrong-kind login never lingers in the browser.
async function dropSession() {
  const { error } = await supabase.auth.signOut()
  if (error) await supabase.auth.signOut({ scope: 'local' })
}

export default function Login({ admin }) {
  const { session, client, isAdmin, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [wrongDoor, setWrongDoor] = useState(false) // right password, wrong login page
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const home = admin ? '/admin' : '/portal'
  const otherLogin = admin ? '/portal/login' : '/admin/login'
  const rightRole = admin ? isAdmin : !!client

  // already signed in with the right kind of account → straight in
  useEffect(() => {
    if (!loading && !busy && session && rightRole) navigate(location.state?.from || home, { replace: true })
  }, [loading, busy, session, rightRole]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    setWrongDoor(false)
    setBusy(true)
    const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (err) {
      setBusy(false)
      setError('That email and password don’t match — please try again.')
      return
    }
    const role = await resolveRole(data.user?.id)
    const allowed = admin ? role.isAdmin : !!role.client
    if (!allowed) {
      await dropSession()
      setWrongDoor(true)
      setBusy(false)
      setPassword('')
      setError(
        admin
          ? 'This isn’t a studio account. Brides and bridal parties sign in on the Client Login.'
          : 'This email isn’t a client account. Part of the studio? Please use the Studio Login.',
      )
      return
    }
    setBusy(false)
    navigate(location.state?.from || home, { replace: true })
  }

  async function forgot() {
    setError('')
    setWrongDoor(false)
    if (!email.trim()) {
      setError('Enter your email above first, then tap “Forgot password”.')
      return
    }
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}${admin ? '/admin/reset' : '/portal/reset'}`,
    })
    if (err) setError('We couldn’t send the reset email — please try again.')
    else setNotice('Check your inbox — we’ve emailed you a link to reset your password.')
  }

  const wrongSession = !loading && !busy && session && !rightRole

  return (
    <div className="min-h-screen bg-beige font-body flex flex-col items-center justify-center px-6 py-14">
      <Helmet>
        <title>{admin ? 'Studio Login' : 'Client Login'} | Arsh Sandhu Allure</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="w-full max-w-[360px]">
        <header className="text-center">
          <Link to="/" className="font-heading text-[1.35rem] tracking-[0.06em] text-dark hover:text-gold transition-colors duration-300">
            Arsh Sandhu Allure
          </Link>
          <span aria-hidden="true" className="block w-1.5 h-1.5 border border-gold rotate-45 mx-auto mt-6" />
          <h1 className="font-heading text-[2.6rem] leading-tight text-dark mt-6">
            <em className="text-gold">{admin ? 'Studio' : 'Client'}</em> Login
          </h1>
          <p className="text-sm text-[#6B5D53] mt-2">
            {admin ? 'For Arsh and the studio team.' : 'For brides and their bridal party.'}
          </p>
        </header>

        {wrongSession && (
          <div className="border-l-2 border-gold bg-beige-card px-4 py-3 mt-10 text-sm text-[#5A4030]">
            {admin
              ? 'You’re signed in with a client account, which can’t open the studio.'
              : 'You’re signed in with a studio account, which can’t open a client portal.'}{' '}
            Sign out to use a different account here.
            <button
              type="button"
              onClick={dropSession}
              className="block mt-2 text-[10px] tracking-[0.2em] uppercase text-gold hover:underline cursor-pointer"
            >
              Sign out
            </button>
          </div>
        )}

        <form onSubmit={submit} className="mt-12 flex flex-col gap-7">
          <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" autoComplete="username" />
          <PasswordField label="Password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          {(error || notice) && (
            <div className="-my-2" role="status" aria-live="polite">
              <ErrorNote>{error}</ErrorNote>
              {error && wrongDoor && (
                <Link to={otherLogin} className="text-[10px] tracking-[0.2em] uppercase text-gold hover:underline">
                  Go to the {admin ? 'Client' : 'Studio'} Login →
                </Link>
              )}
              {notice && <p className="text-gold text-sm py-2">{notice}</p>}
            </div>
          )}
          <Btn type="submit" disabled={busy} className="w-full mt-1">
            {busy ? 'Signing in…' : 'Sign in'}
          </Btn>
          <button type="button" onClick={forgot} className="-mt-2 self-center text-[11px] tracking-[0.15em] uppercase text-[#8A7A70] hover:text-gold transition-colors cursor-pointer">
            Forgot password?
          </button>
        </form>

        <p className="mt-14 text-center text-[11px] tracking-[0.15em] uppercase text-[#8A7A70]">
          {admin ? 'Not the studio?' : 'Part of the studio?'}
          <Link to={otherLogin} className="ml-2 text-gold border-b border-gold/40 hover:border-gold pb-0.5 transition-colors">
            {admin ? 'Client Login' : 'Studio Login'}
          </Link>
        </p>
      </div>
    </div>
  )
}
