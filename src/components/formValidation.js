// Field rules shared by the booking and review forms. Each rule returns '' when
// the value is fine, otherwise a short message a bride can act on.
const NAME_RE = /^[\p{L}][\p{L}\s'.-]*$/u
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const rules = {
  name: (v) => {
    const s = String(v ?? '').trim()
    if (s.length < 2) return 'Please enter a name.'
    return NAME_RE.test(s) ? '' : 'Names can only contain letters, spaces, hyphens and apostrophes.'
  },
  phone: (v) => {
    const d = String(v ?? '').replace(/\D/g, '')
    const ok = d.length === 10 || (d.length === 11 && d.startsWith('1'))
    return ok ? '' : 'Enter a 10-digit phone number, for example 437 221 0004.'
  },
  email: (v) => (EMAIL_RE.test(String(v ?? '').trim()) ? '' : 'Enter a valid email address, like name@example.com.'),
  required: (v) => (String(v ?? '').trim() ? '' : 'Please choose an option.'),
  text: (v) => (String(v ?? '').trim().length >= 2 ? '' : 'Please fill this in.'),
  time: (v) => (v ? '' : 'Please choose a time.'),
  futureDate: (v) => {
    if (!v) return 'Please choose a date.'
    const d = new Date(`${v}T00:00:00`)
    if (Number.isNaN(d.getTime())) return 'Please choose a valid date.'
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return d < today ? 'That date has already passed.' : ''
  },
  count: (min) => (v) => {
    if (String(v ?? '').trim() === '') return 'Please enter a number.'
    const n = Number(v)
    return Number.isInteger(n) && n >= min ? '' : `Enter a whole number of ${min} or more.`
  },
  minLength: (n) => (v) => (String(v ?? '').trim().length >= n ? '' : `Please write at least ${n} characters.`),
}

// "4372210004", "437-221-0004", "+1 437 221 0004" → "+1 (437) 221-0004"
export function formatPhone(v) {
  const d = String(v ?? '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')
  return d.length === 10 ? `+1 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : String(v ?? '').trim()
}

// Local YYYY-MM-DD (not UTC) so a bride in Toronto at 11pm can still pick today.
export function todayISO() {
  return new Date().toLocaleDateString('en-CA')
}

// Run a {field: rule} map against values; returns {field: message} for failures only.
export function validate(values, ruleMap) {
  const errors = {}
  for (const [field, rule] of Object.entries(ruleMap)) {
    const msg = rule(values[field])
    if (msg) errors[field] = msg
  }
  return errors
}

// Scroll the first invalid field into view and focus it.
export function focusFirstError(formEl, errors) {
  const first = Object.keys(errors)[0]
  const el = first && formEl?.querySelector(`[name="${first}"]`)
  if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => el.focus({ preventScroll: true }), 250) }
}
