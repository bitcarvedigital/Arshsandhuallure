import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { trackEvent } from '../components/track'
import { rules, formatPhone, todayISO, validate, focusFirstError } from '../components/formValidation'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const services = ['Bridal', 'Events', 'Editorial', 'Other']
const skinTones = ['Fair / Light', 'Light / Medium', 'Medium / Tan', 'Tan / Deep']
const hairTextureOptions = ['Straight', 'Curly', 'Coily', 'Weave / Extension']
const editorialRoles = ['Photographer', 'Stylist', 'Brand / Client', 'Creative Director', 'Other']
const editorialServices = ['Makeup Artistry', 'Hair Styling', 'Hair & Makeup', 'On-Set Touch-Ups']
const otherServices = ['Makeup Artistry', 'Hair Styling', 'Hair & Makeup']

const fieldClass = 'bg-transparent border-b border-[#A89080] py-3 text-dark placeholder-[#8A7060] text-sm focus:outline-none focus:border-gold transition-colors duration-300'
const labelClass = 'text-xs tracking-[0.2em] uppercase text-dark'

const fieldVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] },
  }),
  exit: { opacity: 0, y: -10, transition: { duration: 0.25 } },
}

function FileDropBox({ files, onChange }) {
  return (
    <label className="flex items-center gap-3 border border-dashed border-[#A89080] px-5 py-4 cursor-pointer hover:border-gold transition-colors duration-200 group">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-[#A89080] group-hover:text-gold transition-colors duration-200 flex-shrink-0">
        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
      </svg>
      <span className="text-xs text-[#7A6355] group-hover:text-dark transition-colors duration-200">
        {files && files.length > 0
          ? `${files.length} file${files.length > 1 ? 's' : ''} selected`
          : 'Upload photos — JPG, PNG, HEIC accepted'}
      </span>
      <input type="file" accept="image/*" multiple className="hidden" onChange={onChange} />
    </label>
  )
}

function MultiSelectTiles({ options, selected, onToggle }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onToggle(opt)}
          className={`py-3 px-4 text-xs tracking-[0.15em] uppercase border transition-colors duration-200 cursor-pointer text-left flex items-center gap-2 ${
            selected.includes(opt)
              ? 'border-gold bg-gold/10 text-dark'
              : 'border-[#A89080] text-[#5A4030] hover:border-gold hover:text-dark'
          }`}
        >
          <span className={`w-3.5 h-3.5 border flex-shrink-0 flex items-center justify-center transition-colors duration-200 ${selected.includes(opt) ? 'border-gold bg-gold' : 'border-[#A89080]'}`}>
            {selected.includes(opt) && (
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><polyline points="1.5 4 3.5 6 6.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            )}
          </span>
          {opt}
        </button>
      ))}
    </div>
  )
}

function SectionDivider({ label }) {
  return (
    <div className="flex items-center gap-4 pt-2">
      <div className="flex-1 h-px bg-[#C4AFA8] opacity-40" />
      <span className="text-[10px] tracking-[0.35em] uppercase text-gold">{label}</span>
      <div className="flex-1 h-px bg-[#C4AFA8] opacity-40" />
    </div>
  )
}

export default function BookingPage() {
  const navigate = useNavigate()
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    service: '',
    // Bridal
    brideName: '',
    weddingDate: '',
    weddingLocation: '',
    readyTime: '',
    hairServicesCount: '',
    makeupServicesCount: '',
    skinTones: [],
    hairTextures: [],
    bridalLook: '',
    culturalRequest: '',
    // Events
    eventDate: '',
    eventLocation: '',
    eventVision: '',
    specialRequest: '',
    // Editorial
    projectBrandName: '',
    projectRole: '',
    shootDate: '',
    shootCallTime: '',
    shootLocation: '',
    modelCount: '',
    editorialServicesRequired: [],
    creativeDirection: '',
    // Other
    serviceTypeRequested: '',
    otherBookingDate: '',
    otherReadyTime: '',
    otherLocation: '',
    otherServicesRequired: [],
    otherVision: '',
    // Generic
    message: '',
  })
  const [inspirationFiles, setInspirationFiles] = useState(null)
  const [otherVisionFiles, setOtherVisionFiles] = useState(null)
  const [moodBoardFiles, setMoodBoardFiles] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => { const next = { ...prev }; delete next[name]; return next })
  }

  // Which fields must be valid depends on the service chosen.
  const activeRules = (f) => {
    const base = { firstName: rules.name, lastName: rules.name, phone: rules.phone, email: rules.email, service: rules.required }
    const counts = { hairServicesCount: rules.count(0), makeupServicesCount: rules.count(0) }
    const byService = {
      Bridal: { brideName: rules.name, weddingDate: rules.futureDate, weddingLocation: rules.text, readyTime: rules.time, ...counts },
      Events: { eventDate: rules.futureDate, readyTime: rules.time, eventLocation: rules.text, ...counts },
      Editorial: { projectBrandName: rules.text, projectRole: rules.required, shootDate: rules.futureDate, shootCallTime: rules.time, shootLocation: rules.text, modelCount: rules.count(1) },
      Other: { serviceTypeRequested: rules.text, otherBookingDate: rules.futureDate, otherReadyTime: rules.time, otherLocation: rules.text },
    }
    return { ...base, ...(byService[f.service] || {}) }
  }

  const validateAll = (f) => {
    const errs = validate(f, activeRules(f))
    if ((f.service === 'Bridal' || f.service === 'Events') && !errs.hairServicesCount && !errs.makeupServicesCount
        && Number(f.hairServicesCount) + Number(f.makeupServicesCount) === 0) {
      errs.makeupServicesCount = 'Enter at least one hair or makeup service.'
    }
    return errs
  }

  // One blur handler on the <form>: validate whichever field was just left.
  const handleBlur = (e) => {
    const { name, value } = e.target
    if (!name) return
    const rule = activeRules(form)[name]
    if (!rule) return
    if (name === 'phone' && !rules.phone(value)) setForm((prev) => ({ ...prev, phone: formatPhone(value) }))
    const msg = rule(value)
    setErrors((prev) => { const next = { ...prev }; if (msg) next[name] = msg; else delete next[name]; return next })
  }

  const FieldError = ({ name }) => (errors[name] ? <p role="alert" className="text-[11px] leading-relaxed text-gold -mt-1">{errors[name]}</p> : null)

  const makeToggler = (key) => (value) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validateAll(form)
    if (Object.keys(errs).length) {
      setErrors(errs)
      setError('Please check the highlighted fields.')
      focusFirstError(e.currentTarget, errs)
      return
    }
    setSending(true)

    const data = new FormData()
    Object.entries(form).forEach(([key, val]) => {
      if (Array.isArray(val)) {
        data.append(key, val.join(', ') || 'None')
      } else if (val !== '') {
        data.append(key, val)
      }
    })
    ;[
      [inspirationFiles, 'inspirationImages'],
      [moodBoardFiles, 'moodBoardFiles'],
      [otherVisionFiles, 'visionImages'],
    ].forEach(([files, fieldName]) => {
      if (files) Array.from(files).forEach((f) => data.append(fieldName, f))
    })

    setError('')
    try {
      const res = await fetch('https://formspree.io/f/mnjobkyy', {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`Formspree ${res.status}`)
      trackEvent('booking_submitted', { service: form.service })
      setSubmitted(true)
    } catch {
      setError('Something went wrong and your request did not send. Please try again, or email arshsandhuallure@gmail.com and we will get right back to you.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Book a Bridal Hair &amp; Makeup Consultation | Mississauga &amp; GTA | Arsh Sandhu Allure</title>
        <meta name="description" content="Check your wedding date and book a complimentary consultation. Bridal hair and makeup across Mississauga, Brampton, Toronto and the GTA." />
        <link rel="canonical" href="https://arshsandhuallure.com/book" />
        <meta property="og:title" content="Book a Bridal Hair &amp; Makeup Consultation | Mississauga &amp; GTA | Arsh Sandhu Allure" />
        <meta property="og:description" content="Check your wedding date and book a complimentary consultation. Bridal hair and makeup across Mississauga, Brampton, Toronto and the GTA." />
        <meta property="og:url" content="https://arshsandhuallure.com/book" />
      </Helmet>
      <Navbar />
      <section className="bg-beige min-h-screen pt-36 pb-24 px-6">
        <div className="max-w-2xl mx-auto">

          <AnimatePresence>
            {!submitted && (
              <motion.div
                key="page-header"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.5 }}
              >
                {/* Heading */}
                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="text-gold text-xs tracking-[0.4em] uppercase mb-4 text-center"
                >
                  Complimentary Consultation
                </motion.p>
                <motion.h1
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="font-heading text-4xl md:text-5xl font-normal text-dark text-center mb-4"
                >
                  Book Now
                </motion.h1>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="w-10 h-px bg-gold opacity-50 mx-auto mb-8"
                />

                {/* Intro */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.25 }}
                  className="text-center mb-12"
                >
                  <p className="text-[#4A3828] text-sm leading-relaxed mb-3">
                    Hello, and thank you for your interest in Arsh Sandhu Allure.
                  </p>
                  <p className="text-[#4A3828] text-sm leading-relaxed">
                    Reservations for 2026/27 are now open. To inquire about your date or request more information, please complete the form below. All inquiries are responded to in the order they are received. Our team will be in touch within 2–3 business days. Thank you for your patience — we look forward to connecting with you.
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center py-16"
            >
              <p className="text-gold text-xs tracking-[0.4em] uppercase mb-4">Message Received</p>
              <h2 className="font-heading text-3xl text-dark mb-6">
                You're one step closer to your dream look.
              </h2>
              <p className="text-[#4A3828] text-base leading-relaxed mb-6">
                Hi lovely! Thank you so much for reaching out — it truly means the world to me. I personally go through every enquiry and I'm so excited to learn more about your vision. Whether it's your wedding day, a special event, or just a moment that deserves to feel extra beautiful — I'm here for it. I'll be in touch with you very soon to chat more and get everything planned. Can't wait to work together!
              </p>
              <p className="text-gold text-xs tracking-[0.4em] uppercase mb-8">— Arsh</p>
              <button
                onClick={() => navigate('/')}
                className="mt-8 border border-dark text-dark text-xs tracking-[0.3em] uppercase px-10 py-4 hover:bg-dark hover:text-beige transition-colors duration-300 cursor-pointer"
              >
                Back to Home
              </button>
            </motion.div>
          ) : (
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              onSubmit={handleSubmit}
              onBlur={handleBlur}
              noValidate
              className="flex flex-col gap-6"
            >
              {/* ── CONTACT INFO — always visible ── */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className={labelClass}>First Name *</label>
                  <input type="text" name="firstName" required aria-invalid={!!errors.firstName} autoComplete="given-name" value={form.firstName} onChange={handleChange} placeholder="First name" className={fieldClass} />
                  <FieldError name="firstName" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelClass}>Last Name *</label>
                  <input type="text" name="lastName" required aria-invalid={!!errors.lastName} autoComplete="family-name" value={form.lastName} onChange={handleChange} placeholder="Last name" className={fieldClass} />
                  <FieldError name="lastName" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className={labelClass}>Phone *</label>
                <input type="tel" name="phone" required aria-invalid={!!errors.phone} inputMode="tel" autoComplete="tel" value={form.phone} onChange={handleChange} placeholder="+1 (000) 000-0000" className={fieldClass} />
                <FieldError name="phone" />
              </div>

              <div className="flex flex-col gap-2">
                <label className={labelClass}>Email *</label>
                <input type="email" name="email" required aria-invalid={!!errors.email} inputMode="email" autoComplete="email" value={form.email} onChange={handleChange} placeholder="your@email.com" className={fieldClass} />
                <FieldError name="email" />
              </div>

              <div className="flex flex-col gap-2">
                <label className={labelClass}>Service *</label>
                <select name="service" required value={form.service} onChange={handleChange} className={fieldClass + ' cursor-pointer'}>
                  <option value="" disabled>Select a service</option>
                  {services.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <FieldError name="service" />
              </div>

              {/* ── BRIDAL ── */}
              <AnimatePresence>
                {form.service === 'Bridal' && (
                  <motion.div key="bridal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-6">
                    <SectionDivider label="Bridal Details" />

                    <motion.div custom={0} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-2">
                      <label className={labelClass}>Bride's Name *</label>
                      <input type="text" name="brideName" required aria-invalid={!!errors.brideName} value={form.brideName} onChange={handleChange} placeholder="Full name of the bride" className={fieldClass} />
                      <FieldError name="brideName" />
                    </motion.div>

                    <motion.div custom={1} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-2">
                      <label className={labelClass}>Date of Wedding *</label>
                      <input type="date" name="weddingDate" required aria-invalid={!!errors.weddingDate} min={todayISO()} value={form.weddingDate} onChange={handleChange} className={fieldClass} />
                      <FieldError name="weddingDate" />
                    </motion.div>

                    <motion.div custom={2} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-2">
                      <label className={labelClass}>Location of Wedding *</label>
                      <input type="text" name="weddingLocation" required aria-invalid={!!errors.weddingLocation} value={form.weddingLocation} onChange={handleChange} placeholder="Venue name or city" className={fieldClass} />
                      <FieldError name="weddingLocation" />
                    </motion.div>

                    <motion.div custom={3} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-2">
                      <label className={labelClass}>Ready Time *</label>
                      <input type="time" name="readyTime" required aria-invalid={!!errors.readyTime} value={form.readyTime} onChange={handleChange} className={fieldClass} />
                      <FieldError name="readyTime" />
                      <span className="text-[10px] text-[#7A6355] tracking-wide">The time you need to be ready by</span>
                    </motion.div>

                    <motion.div custom={4} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className={labelClass}>No. of Hair Services *</label>
                        <input type="number" name="hairServicesCount" required aria-invalid={!!errors.hairServicesCount} min="0" value={form.hairServicesCount} onChange={handleChange} placeholder="e.g. 4" className={fieldClass} />
                        <FieldError name="hairServicesCount" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className={labelClass}>No. of Makeup Services *</label>
                        <input type="number" name="makeupServicesCount" required aria-invalid={!!errors.makeupServicesCount} min="0" value={form.makeupServicesCount} onChange={handleChange} placeholder="e.g. 4" className={fieldClass} />
                        <FieldError name="makeupServicesCount" />
                      </div>
                    </motion.div>

                    <motion.div custom={5} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-3">
                      <label className={labelClass}>Skin Tone of Party <span className="normal-case tracking-normal text-[#7A6355]">(select all that apply)</span></label>
                      <MultiSelectTiles options={skinTones} selected={form.skinTones} onToggle={makeToggler('skinTones')} />
                    </motion.div>

                    <motion.div custom={6} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-3">
                      <label className={labelClass}>Hair Texture of Party <span className="normal-case tracking-normal text-[#7A6355]">(select all that apply)</span></label>
                      <MultiSelectTiles options={hairTextureOptions} selected={form.hairTextures} onToggle={makeToggler('hairTextures')} />
                    </motion.div>

                    <motion.div custom={7} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-2">
                      <label className={labelClass}>Bridal Look Desired</label>
                      <textarea name="bridalLook" value={form.bridalLook} onChange={handleChange} rows={4} placeholder="Describe your dream bridal look — feel free to reference any styles, moods, or inspirations…" className={fieldClass + ' resize-none'} />
                      <div className="mt-3">
                        <label className="block text-[10px] tracking-[0.2em] uppercase text-[#7A6355] mb-2">Attach Inspiration Images <span className="normal-case tracking-normal">(optional)</span></label>
                        <FileDropBox files={inspirationFiles} onChange={(e) => setInspirationFiles(e.target.files)} />
                      </div>
                    </motion.div>

                    <motion.div custom={8} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-2">
                      <label className={labelClass}>Cultural Ceremony / Special Requests</label>
                      <p className="text-[10px] text-[#7A6355] tracking-wide -mt-1">Are you in need of jewellery setting or have special requests for cultural ceremonies? Please specify.</p>
                      <textarea name="culturalRequest" value={form.culturalRequest} onChange={handleChange} rows={3} placeholder="e.g. Sikh ceremony, jewellery pinning, dupatta draping…" className={fieldClass + ' resize-none mt-1'} />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── EVENTS ── */}
              <AnimatePresence>
                {form.service === 'Events' && (
                  <motion.div key="events" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-6">
                    <SectionDivider label="Event Details" />

                    <motion.div custom={0} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-2">
                      <label className={labelClass}>Event Date *</label>
                      <input type="date" name="eventDate" required aria-invalid={!!errors.eventDate} min={todayISO()} value={form.eventDate} onChange={handleChange} className={fieldClass} />
                      <FieldError name="eventDate" />
                    </motion.div>

                    <motion.div custom={1} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-2">
                      <label className={labelClass}>Ready Time *</label>
                      <input type="time" name="readyTime" required aria-invalid={!!errors.readyTime} value={form.readyTime} onChange={handleChange} className={fieldClass} />
                      <FieldError name="readyTime" />
                      <span className="text-[10px] text-[#7A6355] tracking-wide">The time you need to be ready by</span>
                    </motion.div>

                    <motion.div custom={2} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-2">
                      <label className={labelClass}>Event Location *</label>
                      <input type="text" name="eventLocation" required aria-invalid={!!errors.eventLocation} value={form.eventLocation} onChange={handleChange} placeholder="Venue name or city" className={fieldClass} />
                      <FieldError name="eventLocation" />
                    </motion.div>

                    <motion.div custom={3} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className={labelClass}>No. of Hair Services *</label>
                        <input type="number" name="hairServicesCount" required aria-invalid={!!errors.hairServicesCount} min="0" value={form.hairServicesCount} onChange={handleChange} placeholder="e.g. 4" className={fieldClass} />
                        <FieldError name="hairServicesCount" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className={labelClass}>No. of Makeup Services *</label>
                        <input type="number" name="makeupServicesCount" required aria-invalid={!!errors.makeupServicesCount} min="0" value={form.makeupServicesCount} onChange={handleChange} placeholder="e.g. 4" className={fieldClass} />
                        <FieldError name="makeupServicesCount" />
                      </div>
                    </motion.div>

                    <motion.div custom={4} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-2">
                      <label className={labelClass}>Tell Us About Your Vision</label>
                      <textarea name="eventVision" value={form.eventVision} onChange={handleChange} rows={4} placeholder="Share details about your event, style preferences, or the look you're going for…" className={fieldClass + ' resize-none'} />
                    </motion.div>

                    <motion.div custom={5} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-2">
                      <label className={labelClass}>Inspiration Images <span className="normal-case tracking-normal text-[#7A6355]">(optional)</span></label>
                      <FileDropBox files={inspirationFiles} onChange={(e) => setInspirationFiles(e.target.files)} />
                    </motion.div>

                    <motion.div custom={6} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-2">
                      <label className={labelClass}>Any Special Requests?</label>
                      <p className="text-[10px] text-[#7A6355] tracking-wide -mt-1">Please specify any special requirements or requests for your event.</p>
                      <textarea name="specialRequest" value={form.specialRequest} onChange={handleChange} rows={3} placeholder="e.g. specific products, allergies, timing constraints…" className={fieldClass + ' resize-none mt-1'} />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── EDITORIAL ── */}
              <AnimatePresence>
                {form.service === 'Editorial' && (
                  <motion.div key="editorial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-6">
                    <SectionDivider label="Editorial Details" />

                    <motion.div custom={0} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-2">
                      <label className={labelClass}>Project / Brand Name *</label>
                      <p className="text-[10px] text-[#7A6355] tracking-wide -mt-1">Please share the name of the brand, publication, or project.</p>
                      <input type="text" name="projectBrandName" required aria-invalid={!!errors.projectBrandName} value={form.projectBrandName} onChange={handleChange} placeholder="Brand or project name" className={fieldClass + ' mt-1'} />
                      <FieldError name="projectBrandName" />
                    </motion.div>

                    <motion.div custom={1} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-2">
                      <label className={labelClass}>Your Role in the Project *</label>
                      <select name="projectRole" required value={form.projectRole} onChange={handleChange} className={fieldClass + ' cursor-pointer'}>
                        <option value="" disabled>Select your role</option>
                        {editorialRoles.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <FieldError name="projectRole" />
                    </motion.div>

                    <motion.div custom={2} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className={labelClass}>Shoot Date *</label>
                        <input type="date" name="shootDate" required aria-invalid={!!errors.shootDate} min={todayISO()} value={form.shootDate} onChange={handleChange} className={fieldClass} />
                        <FieldError name="shootDate" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className={labelClass}>Call Time *</label>
                        <input type="time" name="shootCallTime" required aria-invalid={!!errors.shootCallTime} value={form.shootCallTime} onChange={handleChange} className={fieldClass} />
                        <FieldError name="shootCallTime" />
                      </div>
                    </motion.div>
                    <span className="text-[10px] text-[#7A6355] tracking-wide -mt-4">When should the artist(s) be ready on set?</span>

                    <motion.div custom={3} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-2">
                      <label className={labelClass}>Shoot Location *</label>
                      <p className="text-[10px] text-[#7A6355] tracking-wide -mt-1">Please include full address or studio name.</p>
                      <input type="text" name="shootLocation" required aria-invalid={!!errors.shootLocation} value={form.shootLocation} onChange={handleChange} placeholder="Full address or studio name" className={fieldClass + ' mt-1'} />
                      <FieldError name="shootLocation" />
                    </motion.div>

                    <motion.div custom={4} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-2">
                      <label className={labelClass}>Number of Models / Talent *</label>
                      <p className="text-[10px] text-[#7A6355] tracking-wide -mt-1">How many individuals will require services?</p>
                      <input type="number" name="modelCount" required aria-invalid={!!errors.modelCount} min="1" value={form.modelCount} onChange={handleChange} placeholder="e.g. 3" className={fieldClass + ' mt-1'} />
                      <FieldError name="modelCount" />
                    </motion.div>

                    <motion.div custom={5} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-3">
                      <label className={labelClass}>Services Required <span className="normal-case tracking-normal text-[#7A6355]">(select all that apply)</span></label>
                      <MultiSelectTiles options={editorialServices} selected={form.editorialServicesRequired} onToggle={makeToggler('editorialServicesRequired')} />
                    </motion.div>

                    <motion.div custom={6} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-2">
                      <label className={labelClass}>Creative Direction</label>
                      <p className="text-[10px] text-[#7A6355] tracking-wide -mt-1">Tell us about the concept, mood, and overall vision for the shoot.</p>
                      <textarea name="creativeDirection" value={form.creativeDirection} onChange={handleChange} rows={5} placeholder="Describe the concept, aesthetic, colour palette, mood, or any references…" className={fieldClass + ' resize-none mt-1'} />
                    </motion.div>

                    <motion.div custom={7} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-2">
                      <label className={labelClass}>Mood Board / Inspiration <span className="normal-case tracking-normal text-[#7A6355]">(optional)</span></label>
                      <p className="text-[10px] text-[#7A6355] tracking-wide -mt-1">Upload any references, mood boards, or visual direction.</p>
                      <div className="mt-1">
                        <FileDropBox files={moodBoardFiles} onChange={(e) => setMoodBoardFiles(e.target.files)} />
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── OTHER ── */}
              <AnimatePresence>
                {form.service === 'Other' && (
                  <motion.div key="other" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-6">
                    <SectionDivider label="Inquiry Details" />

                    <motion.div custom={0} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-2">
                      <label className={labelClass}>Type of Service Requested *</label>
                      <p className="text-[10px] text-[#7A6355] tracking-wide -mt-1">Please describe the nature of your request.</p>
                      <input type="text" name="serviceTypeRequested" required aria-invalid={!!errors.serviceTypeRequested} value={form.serviceTypeRequested} onChange={handleChange} placeholder="e.g. Quinceanera, Prom, Photoshoot…" className={fieldClass + ' mt-1'} />
                      <FieldError name="serviceTypeRequested" />
                    </motion.div>

                    <motion.div custom={1} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className={labelClass}>Booking Date *</label>
                        <input type="date" name="otherBookingDate" required aria-invalid={!!errors.otherBookingDate} min={todayISO()} value={form.otherBookingDate} onChange={handleChange} className={fieldClass} />
                        <FieldError name="otherBookingDate" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className={labelClass}>Ready Time *</label>
                        <input type="time" name="otherReadyTime" required aria-invalid={!!errors.otherReadyTime} value={form.otherReadyTime} onChange={handleChange} className={fieldClass} />
                        <FieldError name="otherReadyTime" />
                      </div>
                    </motion.div>
                    <span className="text-[10px] text-[#7A6355] tracking-wide -mt-4">When would you like services to be completed?</span>

                    <motion.div custom={2} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-2">
                      <label className={labelClass}>Service Location *</label>
                      <p className="text-[10px] text-[#7A6355] tracking-wide -mt-1">Kindly provide the full address.</p>
                      <input type="text" name="otherLocation" required aria-invalid={!!errors.otherLocation} value={form.otherLocation} onChange={handleChange} placeholder="Full address or venue name" className={fieldClass + ' mt-1'} />
                      <FieldError name="otherLocation" />
                    </motion.div>

                    <motion.div custom={3} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-3">
                      <label className={labelClass}>Services Required <span className="normal-case tracking-normal text-[#7A6355]">(select all that apply)</span></label>
                      <MultiSelectTiles options={otherServices} selected={form.otherServicesRequired} onToggle={makeToggler('otherServicesRequired')} />
                    </motion.div>

                    <motion.div custom={4} variants={fieldVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-2">
                      <label className={labelClass}>Vision & Additional Details</label>
                      <p className="text-[10px] text-[#7A6355] tracking-wide -mt-1">Share your desired look, inspiration, and any special requests.</p>
                      <textarea name="otherVision" value={form.otherVision} onChange={handleChange} rows={5} placeholder="Tell us about the look you're envisioning, any inspiration, or special details…" className={fieldClass + ' resize-none mt-1'} />
                      <div className="mt-3">
                        <FileDropBox files={otherVisionFiles} onChange={(e) => setOtherVisionFiles(e.target.files)} />
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <AnimatePresence>
                {form.service && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <p className="text-[11px] leading-relaxed text-[#7A6355] max-w-md mt-2">
                      By sending this request you agree to our{' '}
                      <Link to="/privacy" className="underline underline-offset-2 hover:text-gold transition-colors duration-300">privacy policy</Link>.
                      Your details and any photos are used only to plan your booking and are never shared.
                    </p>
                    <button
                      type="submit"
                      disabled={sending}
                      className="mt-4 bg-dark text-beige text-xs tracking-[0.3em] uppercase px-12 py-4 hover:bg-btn-dark transition-colors duration-300 cursor-pointer disabled:opacity-60"
                    >
                      {sending ? 'Sending…' : 'Submit Request'}
                    </button>
                    {error && (
                      <p role="alert" className="mt-5 text-xs leading-relaxed text-gold max-w-md">{error}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.form>
          )}
        </div>
      </section>
      <Footer />
    </>
  )
}
