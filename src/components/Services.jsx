import { motion } from 'framer-motion'

const services = [
  {
    title: 'Bridal',
    label: 'Bespoke Bridal Beauty',
    image: '/images/bridal-services.webp',
    alt: 'Smiling bride in a lace gown and veil, bridal hair and makeup by Arsh Sandhu Allure – Mississauga, Ontario',
    width: 800,
    height: 1200,
    description: 'Your wedding day deserves nothing less than perfection. We craft bespoke bridal looks tailored to your unique features, style, and vision — ensuring you feel radiant, confident, and completely yourself as you walk down the aisle.',
  },
  {
    title: 'Events',
    label: 'Special Occasions',
    image: '/images/event-services.webp',
    alt: 'Couple at a maternity photoshoot, special event hair and makeup by Arsh Sandhu Allure – GTA, Ontario',
    width: 1031,
    height: 1200,
    description: 'From galas and engagement parties to cultural celebrations and milestone occasions, every event deserves a look as memorable as the moment itself. We bring flawless, long-lasting glam that photographs beautifully under any light.',
  },
  {
    title: 'Editorial',
    label: 'Creative Direction',
    image: '/images/editorial-services.webp',
    alt: 'Editorial beauty look with a red lip and veiled beret by Arsh Sandhu Allure – Toronto, Ontario',
    width: 800,
    height: 1200,
    description: 'Bold, avant-garde, and conceptually driven — editorial beauty is where artistry truly shines. We collaborate with photographers, stylists, and creative directors to produce striking looks that push boundaries and command attention.',
  },
]

export default function Services() {
  return (
    <section className="bg-[#EDE5DD] min-h-screen flex flex-col justify-center py-28 px-6">

      <div className="text-center mb-20">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-gold text-[9px] tracking-[0.55em] uppercase mb-4"
        >
          What We Do
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-heading text-5xl font-normal text-dark tracking-wide"
        >
          Services We Offer
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto w-full">
        {services.map((service, i) => (
          <motion.div
            key={service.title}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="overflow-hidden mb-0 aspect-[2/3] relative group">
              <img
                src={service.image}
                alt={service.alt}
                width={service.width}
                height={service.height}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <p className="absolute bottom-5 left-6 text-[9px] tracking-[0.4em] uppercase text-gold/90 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
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
  )
}
