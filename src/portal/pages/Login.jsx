import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth, resolveRole } from '../AuthProvider'
import { Field, Btn, ErrorNote, DiamondRule, PasswordField } from '../../shared/ui'

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
    <div className="min-h-screen bg-beige flex items-center justify-center px-5 py-16 font-body">
      {/* colour-coded strip: dark = studio, gold = client */}
      <div className={`fixed top-0 inset-x-0 h-1.5 ${admin ? 'bg-btn-dark' : 'bg-gold'}`} />
      <Helmet>
        <title>{admin ? 'Studio Login' : 'Client Login'} | Arsh Sandhu Allure</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Link to="/" className="font-heading text-xl text-dark">Arsh Sandhu Allure</Link>
          <DiamondRule className="mt-5" />
          <h1 className="font-heading text-4xl text-dark mt-7">
            <em className="text-gold">{admin ? 'Studio' : 'Client'}</em> Login
          </h1>
          <p className="text-sm text-[#6B5D53] mt-2">
            {admin ? 'For Arsh and the studio team.' : 'For brides and their bridal party.'}
          </p>
        </div>

        {wrongSession && (
          <div className="border-l-2 border-gold bg-beige-card px-4 py-3 mb-8 text-sm text-[#5A4030]">
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

        <form onSubmit={submit} className="flex flex-col gap-6">
          <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" autoComplete="email" />
          <PasswordField label="Password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          <ErrorNote>{error}</ErrorNote>
          {error && (
            <Link to={otherLogin} className="-mt-4 text-[10px] tracking-[0.2em] uppercase text-gold hover:underline">
              Go to the {admin ? 'Client' : 'Studio'} Login →
            </Link>
          )}
          {notice && <p className="text-gold text-sm">{notice}</p>}
          <Btn type="submit" disabled={busy}>{busy ? 'Signing in…' : admin ? 'Sign in to the Studio' : 'Sign in to my portal'}</Btn>
          <button type="button" onClick={forgot} className="text-xs tracking-[0.15em] uppercase text-[#8A7A70] hover:text-gold transition-colors cursor-pointer">
            Forgot password?
          </button>
        </form>
        <div className="mt-10 pt-6 border-t border-[#E0D2C2] text-center">
          <p className="text-[10px] tracking-[0.25em] uppercase text-[#8A7A70] mb-3">
            {admin ? 'Not the studio?' : 'Part of the studio?'}
          </p>
          <Link
            to={otherLogin}
            className="inline-block border border-[#A89080] text-dark text-xs tracking-[0.25em] uppercase px-8 py-3 hover:border-gold hover:text-gold transition-colors duration-300"
          >
            {admin ? 'Client Login' : 'Studio Login'}
          </Link>
        </div>
      </div>
    </div>
  )
}
