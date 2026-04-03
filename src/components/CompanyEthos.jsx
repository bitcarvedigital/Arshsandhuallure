import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function CompanyEthos() {
  const navigate = useNavigate()
  const goToAbout = () => navigate('/about')

  return (
    <section className="min-h-screen bg-dark grid grid-cols-1 md:grid-cols-2">

      {/* Left — image */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, ease: 'easeOut' }}
        className="relative min-h-[50vh] md:min-h-screen overflow-hidden"
      >
        <img
          src="/images/company%20ethos.jpg"
          alt="Company Ethos"
          className="absolute inset-0 w-full h-full object-cover object-center hover:scale-105 transition-transform duration-[1400ms]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-dark/20 hidden md:block" />
      </motion.div>

      {/* Right — text */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col justify-center px-12 py-24 md:px-16 lg:px-20"
      >
        <div className="flex items-center gap-3 mb-7">
          <div className="w-5 h-px bg-gold opacity-70" />
          <div className="w-1 h-1 bg-gold opacity-70 rotate-45" />
        </div>

        <p className="text-gold text-[9px] tracking-[0.55em] uppercase mb-5">
          Our Company Ethos
        </p>

        <h2 className="font-heading text-4xl md:text-5xl font-normal text-beige leading-tight mb-8 tracking-wide">
          Beauty rooted<br />in intention
        </h2>

        <div className="w-10 h-px bg-gold opacity-60 mb-10" />

        <p className="text-[#D4C4BA] text-sm leading-[1.9] mb-6">
          Arsh Sandhu Allure was founded on a single belief — that every person deserves to feel
          extraordinary. We are a luxury beauty studio built on trust, artistry, and an unwavering
          commitment to celebrating the individual. From the first consultation to the final look,
          every touch is purposeful, every detail considered.
        </p>

        <p className="text-[#D4C4BA] text-sm leading-[1.9] mb-14">
          We believe beauty is not about transformation — it is about revelation. Our work honours
          your natural features while elevating them, creating looks that feel as good as they
          photograph. Integrity, elegance, and warmth guide everything we do.
        </p>

        <div>
          <button
            onClick={goToAbout}
            className="border border-gold text-gold text-[9px] tracking-[0.4em] uppercase px-12 py-4 hover:bg-gold hover:text-dark transition-colors duration-300 cursor-pointer"
          >
            About Arsh
          </button>
        </div>
      </motion.div>

    </section>
  )
}
