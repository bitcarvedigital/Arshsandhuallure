import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function BookingCTA() {
  const navigate = useNavigate()

  return (
    <section
      className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden"
      style={{
        backgroundImage: "url('/images/complimentary%20consultation%20BG.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: window.innerWidth > 768 ? 'fixed' : 'scroll',
      }}
    >
      <div className="absolute inset-0 bg-[#0A0A0A]/60" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.35)_100%)]" />

      <div className="relative max-w-3xl mx-auto text-center">

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex items-center justify-center gap-4 mb-8"
        >
          <div className="w-10 h-px bg-gold opacity-70" />
          <div className="w-1.5 h-1.5 border border-gold opacity-40 rotate-45" />
          <div className="w-10 h-px bg-gold opacity-70" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-gold text-[9px] tracking-[0.55em] uppercase mb-6"
        >
          Complimentary Consultation
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-heading text-4xl md:text-5xl font-normal text-white leading-tight mb-8 tracking-wide"
        >
          Book Your Complimentary<br />Consultation Today
        </motion.h2>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-10 h-px bg-gold opacity-70 mx-auto mb-10"
        />

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-white/85 text-sm leading-[1.9] mb-14 max-w-xl mx-auto"
        >
          Every great look begins with a conversation. Book your complimentary consultation
          with Arsh and let us create something beautiful together — tailored entirely to you.
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.35 }}
          onClick={() => navigate('/book')}
          className="border border-gold text-gold text-[9px] tracking-[0.4em] uppercase px-14 py-4 hover:bg-gold hover:text-dark transition-colors duration-300 cursor-pointer"
        >
          Book Now
        </motion.button>

      </div>
    </section>
  )
}
