import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { baseReviews } from './Reviews'

// Three verbatim client reviews on the home page (full list lives on /reviews).
const picks = baseReviews.filter((r) => ['Lilian Roshelle', 'Tiffany Persaud', 'Jennifer Whipp'].includes(r.name))

export default function Testimonials() {
  return (
    <section id="testimonials" className="bg-beige py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <p className="text-gold text-[9px] tracking-[0.55em] uppercase mb-4">Testimonials</p>
          <h2 className="font-heading text-4xl md:text-5xl font-normal text-dark tracking-wide">
            Trusted by brides across the GTA
          </h2>
          <p className="text-[#4A3828] text-sm leading-[1.9] max-w-xl mx-auto mt-6">
            From the trial to the wedding day, every bride, bridesmaid and mother in the chair is our priority.
            A few words from couples we have had the joy of styling for weddings, engagements and receptions.
          </p>
          <div className="flex items-center justify-center gap-3 mt-7">
            <div className="w-6 h-px bg-gold opacity-60" />
            <div className="w-1 h-1 bg-gold opacity-60 rotate-45" />
            <div className="w-6 h-px bg-gold opacity-60" />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {picks.map((r, i) => (
            <motion.blockquote
              key={r.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="bg-beige-card p-9 flex flex-col"
            >
              <p className="text-gold text-[10px] tracking-[0.3em] mb-5"><span aria-hidden="true">★★★★★</span><span className="sr-only">Five star review</span></p>
              <p className="text-[#3D2E26] text-sm leading-[1.9] italic flex-1">“{r.text}”</p>
              <footer className="flex items-center gap-3 mt-7">
                <span className="w-1 h-1 bg-gold opacity-70 rotate-45" />
                <cite className="not-italic font-heading text-base text-dark">{r.name}</cite>
              </footer>
            </motion.blockquote>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="text-center mt-12"
        >
          <Link to="/reviews" className="text-[10px] tracking-[0.3em] uppercase text-gold hover:text-dark transition-colors duration-300">
            Read all client reviews
          </Link>
        </motion.p>
      </div>
    </section>
  )
}
