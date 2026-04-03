import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import About from '../components/About'
import Expertise from '../components/Expertise'
import Footer from '../components/Footer'

function WorkTogether() {
  const navigate = useNavigate()
  return (
    <section className="bg-[#EDE5DD] py-32 px-6">
      <div className="max-w-2xl mx-auto text-center">

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-center gap-4 mb-8"
        >
          <div className="w-8 h-px bg-gold opacity-60" />
          <div className="w-1 h-1 bg-gold opacity-60 rotate-45" />
          <div className="w-8 h-px bg-gold opacity-60" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-gold text-[9px] tracking-[0.55em] uppercase mb-5"
        >
          Get In Touch
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-heading text-4xl md:text-5xl font-normal text-dark leading-tight mb-12 tracking-wide"
        >
          Let's Work Together
        </motion.h2>
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          onClick={() => navigate('/book')}
          className="border border-dark text-dark text-[9px] tracking-[0.4em] uppercase px-14 py-4 hover:border-gold hover:text-gold transition-colors duration-300 cursor-pointer"
        >
          Book Now
        </motion.button>
      </div>
    </section>
  )
}

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <div>
        <About />
        <Expertise />
        <WorkTogether />
      </div>
      <Footer />
    </>
  )
}
