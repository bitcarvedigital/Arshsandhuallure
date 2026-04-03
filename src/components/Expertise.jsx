import { motion } from 'framer-motion'

const stats = [
  {
    number: '200+',
    heading: 'Brides Styled',
    description: 'From intimate ceremonies to grand celebrations, each bridal look crafted with devotion and precision.',
  },
  {
    number: '600+',
    heading: 'Events Served',
    description: 'Galas, engagements, cultural milestones — delivering flawless beauty for every occasion.',
  },
  {
    number: '50+',
    heading: 'Editorial Work',
    description: 'Campaign shoots, magazine spreads, and creative collaborations pushing the boundaries of artistry.',
  },
]

export default function Expertise() {
  return (
    <section className="bg-dark py-32 px-6">
      <div className="max-w-6xl mx-auto">

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-20"
        >
          <p className="text-gold text-[9px] tracking-[0.55em] uppercase mb-4">By The Numbers</p>
          <h2 className="font-heading text-4xl md:text-5xl font-normal text-beige tracking-wide">
            Expertise & Experience
          </h2>
          <div className="flex items-center justify-center gap-3 mt-7">
            <div className="w-6 h-px bg-gold opacity-60" />
            <div className="w-1 h-1 bg-gold opacity-60 rotate-45" />
            <div className="w-6 h-px bg-gold opacity-60" />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#2A2218]">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.heading}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="bg-dark px-10 py-16 text-center group hover:bg-[#1E1810] transition-colors duration-500"
            >
              <p className="font-heading text-6xl font-normal text-gold mb-3 tracking-wide">
                {stat.number}
              </p>
              <div className="w-5 h-px bg-gold opacity-55 mx-auto mb-5" />
              <h3 className="text-[9px] tracking-[0.4em] uppercase text-beige/75 mb-5">{stat.heading}</h3>
              <p className="text-sm text-[#9A8A80] leading-relaxed max-w-xs mx-auto">{stat.description}</p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}
