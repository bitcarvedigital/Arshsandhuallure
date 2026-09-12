import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { trackInquiry } from '../components/track'

const TITLE = 'Bridal Hair & Makeup Artist in Mississauga | Arsh Sandhu Allure'
const DESCRIPTION =
  'Luxury bridal hair and makeup artist in Mississauga. South Asian bridal, bridal party, engagement and mehndi looks, on location across the GTA.'

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] },
})

const sections = [
  {
    label: 'Bridal',
    heading: 'Bridal hair and makeup in Mississauga',
    body: [
      'Your wedding morning should feel calm, unhurried and entirely about you. Arsh Sandhu Allure is a luxury bridal hair and makeup studio based in Mississauga, working on location for brides across the Greater Toronto Area. Arsh specialises in soft, natural glam and sleek, elegant hairstyling — looks that feel timeless and refined, that photograph beautifully, and that still look like you.',
      'Every bridal booking begins with a complimentary consultation and a trial. We talk through your outfit, your venue, the lighting, the photographer\'s style and how long the day will run, then build a look that holds from the first portrait to the last dance. On the day, Arsh comes to your home, hotel or venue with everything needed, so your party can get ready together.',
    ],
  },
  {
    label: 'South Asian Bridal',
    heading: 'South Asian bridal beauty, done with care',
    body: [
      'Born and raised in Punjab and now based in Mississauga, Arsh brings a deep understanding of South Asian bridal beauty — from Sikh and Hindu weddings to Muslim nikkahs and fusion ceremonies. That means makeup that balances a heavy lehenga and jewellery without overwhelming your features, hair that holds a dupatta securely for hours, and looks designed for the ceremony, the reception and everything in between.',
      'Dupatta, veil and jewellery setting are part of the service. Brides consistently mention that every pin, tikka and drape was placed with precision and stayed put through the whole celebration.',
    ],
  },
  {
    label: 'Bridal Party & Events',
    heading: 'Bridesmaids, mothers, engagement and mehndi looks',
    body: [
      'Bridesmaids, mothers of the bride and groom, sisters and close family can all be styled on the morning of the wedding, timed around your schedule so nobody is rushed. We also create looks for engagement parties, roka and mehndi nights, sangeet, receptions, Lohri and Diwali celebrations, milestone birthdays and maternity sessions — with airbrush or traditional foundation, long-wear formulas and hairstyling that lasts through an evening of dancing.',
    ],
  },
  {
    label: 'Where We Work',
    heading: 'Mississauga, Brampton, Toronto and beyond',
    body: [
      'Arsh Sandhu Allure is based in Mississauga and travels throughout the GTA — Brampton, Toronto, Etobicoke, Vaughan, Oakville, Milton, Burlington, Markham and the surrounding communities. As a travel artist, Arsh also takes bridal bookings well beyond the city, including out-of-town and destination weddings across Ontario. Wherever your morning begins, we bring the studio to you.',
    ],
  },
]

const proof = [
  { name: 'Lilian Roshelle', text: 'Arsh made me feel like the most beautiful version of myself on my wedding day. I wanted something soft and elegant, and she absolutely nailed it. My makeup looked flawless but still like me, and my hairstyle stayed perfect the entire day — even through all the dancing and emotions.' },
  { name: 'Tiffany Persaud', text: 'She did my bridal hairstyle as well as my mom and sister-in-law and everyone loved working with her. In addition to my hairstyling she also set my jewelry, dupatta, and veil — ensuring every piece was set perfectly for my Big Day.' },
]

export default function MississaugaPage() {
  const navigate = useNavigate()

  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href="https://arshsandhuallure.com/bridal-makeup-artist-mississauga" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content="https://arshsandhuallure.com/bridal-makeup-artist-mississauga" />
      </Helmet>
      <Navbar />

      {/* Intro */}
      <section className="bg-beige pt-36 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.p {...fade(0)} className="text-gold text-[9px] tracking-[0.55em] uppercase mb-5">
            Mississauga · Brampton · Toronto · GTA
          </motion.p>
          <motion.h1 {...fade(0.1)} className="font-heading text-4xl md:text-6xl font-normal text-dark leading-[1.15] tracking-wide mb-8">
            Bridal Hair &amp; Makeup Artist<br />in Mississauga
          </motion.h1>
          <motion.div {...fade(0.2)} className="flex items-center justify-center gap-3 mb-8">
            <div className="w-6 h-px bg-gold opacity-70" />
            <div className="w-1 h-1 bg-gold opacity-70 rotate-45" />
            <div className="w-6 h-px bg-gold opacity-70" />
          </motion.div>
          <motion.p {...fade(0.3)} className="text-[#3D2E26] text-base leading-[1.9]">
            Luxury bridal, South Asian bridal and special-occasion hair and makeup, on location across
            Mississauga and the Greater Toronto Area. Over 200 brides styled and 600 events served, with a
            complimentary consultation and a trial before every wedding.
          </motion.p>
        </div>
      </section>

      {/* Sections */}
      {sections.map((s, i) => (
        <section key={s.label} className={`${i % 2 === 0 ? 'bg-[#EDE5DD]' : 'bg-beige'} py-24 px-6`}>
          <div className="max-w-3xl mx-auto">
            <motion.p {...fade(0)} className="text-gold text-[9px] tracking-[0.55em] uppercase mb-4">
              {s.label}
            </motion.p>
            <motion.h2 {...fade(0.1)} className="font-heading text-3xl md:text-4xl font-normal text-dark leading-tight tracking-wide mb-8">
              {s.heading}
            </motion.h2>
            <motion.div {...fade(0.15)} className="w-10 h-px bg-gold opacity-70 mb-8" />
            {s.body.map((paragraph) => (
              <motion.p key={paragraph.slice(0, 32)} {...fade(0.2)} className="text-[#3D2E26] text-base leading-relaxed mb-5">
                {paragraph}
              </motion.p>
            ))}
          </div>
        </section>
      ))}

      {/* Proof */}
      <section className="bg-[#EDE5DD] py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.p {...fade(0)} className="text-gold text-[9px] tracking-[0.55em] uppercase mb-4 text-center">
            From Our Brides
          </motion.p>
          <motion.h2 {...fade(0.1)} className="font-heading text-3xl md:text-4xl font-normal text-dark tracking-wide mb-14 text-center">
            What GTA brides say
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {proof.map((r, i) => (
              <motion.blockquote key={r.name} {...fade(0.15 + i * 0.1)} className="bg-beige-card p-10">
                <p className="text-[#3D2E26] text-sm leading-[1.9] italic mb-6">“{r.text}”</p>
                <footer className="flex items-center gap-3">
                  <span className="w-1 h-1 bg-gold opacity-70 rotate-45" />
                  <cite className="not-italic font-heading text-base text-dark">{r.name}</cite>
                </footer>
              </motion.blockquote>
            ))}
          </div>
          <motion.p {...fade(0.3)} className="text-center mt-10">
            <Link to="/reviews" className="text-[10px] tracking-[0.3em] uppercase text-gold hover:text-dark transition-colors duration-300">
              Read all client reviews
            </Link>
          </motion.p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-dark py-28 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <motion.p {...fade(0)} className="text-gold text-[9px] tracking-[0.55em] uppercase mb-6">
            Complimentary Consultation
          </motion.p>
          <motion.h2 {...fade(0.1)} className="font-heading text-4xl md:text-5xl font-normal text-white leading-tight mb-8 tracking-wide">
            Check your wedding date
          </motion.h2>
          <motion.p {...fade(0.2)} className="text-white/85 text-sm leading-[1.9] mb-12 max-w-xl mx-auto">
            Peak wedding weekends in the GTA book out months ahead. Tell us your date, venue and the size of
            your party, and we will confirm availability and walk you through the trial and booking process.
          </motion.p>
          <motion.div {...fade(0.3)} className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <button
              onClick={() => { trackInquiry('book', 'mississauga_cta'); navigate('/book') }}
              className="border border-gold text-gold text-[9px] tracking-[0.4em] uppercase px-14 py-4 hover:bg-gold hover:text-dark transition-colors duration-300 cursor-pointer"
            >
              Check My Date
            </button>
            <a
              href="https://wa.me/14372210004?text=Hi%20Arsh%2C%20I%27m%20interested%20in%20bridal%20hair%20and%20makeup"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackInquiry('whatsapp', 'mississauga_cta')}
              className="text-[9px] tracking-[0.4em] uppercase text-white/80 hover:text-gold transition-colors duration-300 py-4"
            >
              WhatsApp +1 (437) 221-0004
            </a>
          </motion.div>
        </div>
      </section>

      <Footer />
    </>
  )
}
