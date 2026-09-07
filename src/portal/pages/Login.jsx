import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { Field, Btn, ErrorNote, DiamondRule, MicroLabel, PasswordField } from '../../shared/ui'

export default function Login({ admin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  async function submit(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (err) {
      setError('That email and password don’t match — please try again.')
      return
    }
    navigate(location.state?.from || (admin ? '/admin' : '/portal'), { replace: true })
  }

  async function forgot() {
    setError('')
    if (!email.trim()) {
      setError('Enter your email above first, then tap “Forgot password”.')
      return
    }
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/portal/reset`,
    })
    if (err) setError('We couldn’t send the reset email — please try again.')
    else setNotice('Check your inbox — we’ve emailed you a link to reset your password.')
  }

  return (
    <div className="min-h-screen bg-beige flex items-center justify-center px-5 font-body">
      <Helmet>
        <title>{admin ? 'Studio Login' : 'Client Login'} | Arsh Sandhu Allure</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Link to="/" className="font-heading text-2xl text-dark">Arsh Sandhu Allure</Link>
          <MicroLabel className="mt-3">{admin ? 'Studio' : 'Client Portal'}</MicroLabel>
          <DiamondRule className="mt-6" />
        </div>
        <form onSubmit={submit} className="flex flex-col gap-6">
          <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" autoComplete="email" />
          <PasswordField label="Password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          <ErrorNote>{error}</ErrorNote>
          {notice && <p className="text-gold text-sm">{notice}</p>}
          <Btn type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign In'}</Btn>
          <button type="button" onClick={forgot} className="text-xs tracking-[0.15em] uppercase text-[#8A7A70] hover:text-gold transition-colors cursor-pointer">
            Forgot password?
          </button>
        </form>
        <div className="mt-10 pt-6 border-t border-[#E0D2C2] text-center">
          <p className="text-[10px] tracking-[0.25em] uppercase text-[#8A7A70] mb-3">
            {admin ? 'Not the studio?' : 'Part of the studio?'}
          </p>
          <Link
            to={admin ? '/portal/login' : '/admin/login'}
            className="inline-block border border-[#A89080] text-dark text-xs tracking-[0.25em] uppercase px-8 py-3 hover:border-gold hover:text-gold transition-colors duration-300"
          >
            {admin ? 'Client Login' : 'Studio Login'}
          </Link>
        </div>
      </div>
    </div>
  )
}
