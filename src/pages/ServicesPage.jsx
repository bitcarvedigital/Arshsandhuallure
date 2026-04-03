import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const services = [
  {
    title: 'Bridal',
    label: 'Bespoke Bridal Beauty',
    image: '/images/Bridal%20services.JPG',
    description: 'Your wedding day deserves nothing less than perfection. We craft bespoke bridal looks tailored to your unique features, style, and vision — ensuring you feel radiant, confident, and completely yourself as you walk down the aisle.',
  },
  {
    title: 'Events',
    label: 'Special Occasions',
    image: '/images/event%20services.JPG',
    description: 'From galas and engagement parties to cultural celebrations and milestone occasions, every event deserves a look as memorable as the moment itself. We bring flawless, long-lasting glam that photographs beautifully under any light.',
  },
  {
    title: 'Editorial',
    label: 'Creative Direction',
    image: '/images/editorial%20services.jpeg',
    description: 'Bold, avant-garde, and conceptually driven — editorial beauty is where artistry truly shines. We collaborate with photographers, stylists, and creative directors to produce striking looks that push boundaries and command attention.',
  },
]

const steps = [
  {
    number: '01',
    title: 'Consultation',
    description: 'We begin with an in-depth conversation to understand your vision, preferences, and the occasion. Every detail matters — from your outfit to the lighting at your venue.',
  },
  {
    number: '02',
    title: 'Preparation',
    description: 'We carefully select products and techniques tailored to your skin type and desired look, ensuring your makeup is flawless, long-lasting, and photography-ready.',
  },
  {
    number: '03',
    title: 'Perfection',
    description: 'On the day, every brushstroke is intentional. You leave the chair feeling like the best version of yourself — confident, radiant, and ready to be celebrated.',
  },
]

export default function ServicesPage() {
  const navigate = useNavigate()

  return (
    <>
      <Navbar />

      {/* Services We Offer */}
      <section className="bg-[#EDE5DD] pt-36 pb-28 px-6">
        <div className="text-center mb-20">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-gold text-[9px] tracking-[0.55em] uppercase mb-4"
          >
            What We Do
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-heading text-5xl font-normal text-dark tracking-wide"
          >
            Services We Offer
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex items-center justify-center gap-3 mt-7"
          >
            <div className="w-6 h-px bg-gold opacity-70" />
            <div className="w-1 h-1 bg-gold opacity-70 rotate-45" />
            <div className="w-6 h-px bg-gold opacity-70" />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 + i * 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="overflow-hidden aspect-[2/3] relative group">
                <img
                  src={service.image}
                  alt={service.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <p className="absolute bottom-5 left-6 text-[9px] tracking-[0.4em] uppercase text-gold/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  {service.label}
                </p>
              </div>
              <div className="pt-7 pb-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-5 h-px bg-gold opacity-75" />
                  <h3 className="font-heading text-xl text-dark tracking-wide">{service.title}</h3>
                </div>
                <p className="text-sm text-[#4A3828] leading-relaxed">{service.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Our Process */}
      <section className="bg-beige py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="text-gold text-[9px] tracking-[0.55em] uppercase mb-4"
            >
              How It Works
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-heading text-4xl md:text-5xl font-normal text-dark tracking-wide"
            >
              Our Process
            </motion.h2>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="flex items-center justify-center gap-3 mt-7"
            >
              <div className="w-6 h-px bg-gold opacity-70" />
              <div className="w-1 h-1 bg-gold opacity-70 rotate-45" />
              <div className="w-6 h-px bg-gold opacity-70" />
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#D8CABB]">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="bg-[#EDE5DD] px-10 py-14 group hover:bg-[#E6DDD3] transition-colors duration-500"
              >
                <p className="font-heading text-6xl text-gold opacity-50 mb-4 leading-none group-hover:opacity-40 transition-opacity duration-500">
                  {step.number}
                </p>
                <div className="w-7 h-px bg-gold opacity-60 mb-6" />
                <h3 className="text-[9px] tracking-[0.4em] uppercase text-dark mb-5">{step.title}</h3>
                <p className="text-sm text-[#4A3828] leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Book Now CTA */}
      <section className="bg-dark py-32 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-8 h-px bg-gold opacity-75" />
            <div className="w-1 h-1 bg-gold opacity-75 rotate-45" />
            <div className="w-8 h-px bg-gold opacity-75" />
          </div>
          <p className="text-gold text-[9px] tracking-[0.55em] uppercase mb-6">Begin Your Journey</p>
          <h2 className="font-heading text-4xl md:text-5xl font-normal text-beige leading-tight mb-12 tracking-wide">
            Let's Create the<br />Magic Together
          </h2>
          <button
            onClick={() => navigate('/book')}
            className="border border-gold text-gold text-[9px] tracking-[0.4em] uppercase px-14 py-4 hover:bg-gold hover:text-dark transition-colors duration-400 cursor-pointer"
          >
            Book Now
          </button>
        </motion.div>
      </section>

      <Footer />
    </>
  )
}
