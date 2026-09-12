import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { trackEvent } from './track'
import { rules, validate, focusFirstError } from './formValidation'

const inputClass = 'w-full border border-[#B8A090] bg-transparent rounded-lg px-5 py-3.5 text-sm text-dark placeholder-[#8A7060] focus:outline-none focus:border-gold transition-colors duration-200'
const labelClass = 'block text-xs tracking-widest uppercase text-[#5A4030] mb-2'

export default function ReviewForm() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', rating: '', message: '', improvement: '', recommend: '' })
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  const RULES = { firstName: rules.name, lastName: rules.name, email: rules.email, rating: rules.required, message: rules.minLength(10) }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    if (errors[name]) setErrors((prev) => { const next = { ...prev }; delete next[name]; return next })
  }
  const handleBlur = (e) => {
    const { name, value } = e.target
    if (!RULES[name]) return
    const msg = RULES[name](value)
    setErrors((prev) => { const next = { ...prev }; if (msg) next[name] = msg; else delete next[name]; return next })
  }
  const FieldError = ({ name }) => (errors[name] ? <p role="alert" className="text-[11px] leading-relaxed text-gold mt-2">{errors[name]}</p> : null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate(form, RULES)
    if (Object.keys(errs).length) { setErrors(errs); setError('Please check the highlighted fields.'); focusFirstError(e.currentTarget, errs); return }
    setSending(true)
    setError('')
    try {
      const res = await fetch('https://formspree.io/f/mreoawvj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(`Formspree ${res.status}`)
      trackEvent('review_submitted')
      setSubmitted(true)
    } catch {
      setError('Something went wrong and your review did not send. Please try again or email arshsandhuallure@gmail.com.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section id="review-form" className="bg-beige py-32 px-6">
      <div className="max-w-2xl mx-auto">

        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="text-center mb-16">
          <p className="text-gold text-xs tracking-[0.4em] uppercase mb-4">Share Your Experience</p>
          <h2 className="font-heading text-4xl md:text-5xl font-normal">Leave a Review</h2>
        </motion.div>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div key="thank-you" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
              <svg className="mx-auto mb-6 text-gold" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="8 12 11 15 16 9" />
              </svg>
              <h3 className="font-heading text-3xl font-normal mb-3">Thank you for your review!</h3>
              <p className="text-[#5A4030] text-sm leading-relaxed">It will be reviewed and published shortly.</p>
            </motion.div>
          ) : (
            <motion.form key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit} onBlur={handleBlur} noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className={labelClass}>First Name *</label>
                  <input type="text" name="firstName" required autoComplete="given-name" aria-invalid={!!errors.firstName} placeholder="Arsh" value={form.firstName} onChange={handleChange} className={inputClass} />
                  <FieldError name="firstName" />
                </div>
                <div>
                  <label className={labelClass}>Last Name *</label>
                  <input type="text" name="lastName" required autoComplete="family-name" aria-invalid={!!errors.lastName} placeholder="Sandhu" value={form.lastName} onChange={handleChange} className={inputClass} />
                  <FieldError name="lastName" />
                </div>
              </div>
              <div className="mb-6">
                <label className={labelClass}>Email *</label>
                <input type="email" name="email" required inputMode="email" autoComplete="email" aria-invalid={!!errors.email} placeholder="you@example.com" value={form.email} onChange={handleChange} className={inputClass} />
                <FieldError name="email" />
              </div>
              <div className="mb-6">
                <label className={labelClass}>Rating *</label>
                <select name="rating" required value={form.rating} onChange={handleChange} className={inputClass}>
                  <option value="" disabled>Select a rating</option>
                  <option value="5">⭐⭐⭐⭐⭐ — 5 Stars</option>
                  <option value="4">⭐⭐⭐⭐ — 4 Stars</option>
                  <option value="3">⭐⭐⭐ — 3 Stars</option>
                  <option value="2">⭐⭐ — 2 Stars</option>
                  <option value="1">⭐ — 1 Star</option>
                </select>
                <FieldError name="rating" />
              </div>
              <div className="mb-6">
                <label className={labelClass}>Your Review *</label>
                <textarea name="message" required rows={5} placeholder="Share your experience..." value={form.message} onChange={handleChange} className={inputClass + ' resize-none'} />
                <FieldError name="message" />
              </div>

              <AnimatePresence>
                {form.rating && parseInt(form.rating) <= 4 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35 }}
                    className="mb-6"
                  >
                    <label className={labelClass}>How can we do better?</label>
                    <p className="text-[#5A4030] text-xs leading-relaxed mb-3">
                      Your feedback is truly valued — we listen to every recommendation and act on it every single day to grow, improve, and elevate the experience we give each client. Please share anything on your mind.
                    </p>
                    <textarea
                      name="improvement"
                      rows={4}
                      placeholder="Tell us what we could have done differently…"
                      value={form.improvement}
                      onChange={handleChange}
                      className={inputClass + ' resize-none'}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="mb-10">
                <label className={labelClass}>Would you recommend us?</label>
                <select name="recommend" value={form.recommend} onChange={handleChange} className={inputClass}>
                  <option value="" disabled>Select an option</option>
                  <option value="absolutely">Absolutely!</option>
                  <option value="yes">Yes</option>
                  <option value="maybe">Maybe</option>
                  <option value="notsure">Not sure</option>
                </select>
              </div>
              <p className="text-[11px] leading-relaxed text-[#5A4030] mb-5">
                By submitting you agree to our{' '}
                <Link to="/privacy" className="underline underline-offset-2 hover:text-gold transition-colors duration-300">privacy policy</Link>.
                Your name may appear with your review; your email is never published.
              </p>
              <button type="submit" disabled={sending} className="w-full bg-btn-dark text-beige rounded-full py-4 text-xs tracking-[0.25em] uppercase hover:bg-[#3D342E] transition-colors duration-300 disabled:opacity-60">
                {sending ? 'Sending…' : 'Submit Review'}
              </button>
              {error && (
                <p role="alert" className="mt-4 text-center text-xs leading-relaxed text-gold">{error}</p>
              )}
            </motion.form>
          )}
        </AnimatePresence>

      </div>
    </section>
  )
}
