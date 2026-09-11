import { useState } from 'react'
import { motion } from 'framer-motion'

const baseItems = [
  { src: '/images/portfolio-01.webp', alt: 'Editorial beauty look with a red lip and vintage veiled beret by Arsh Sandhu Allure – Mississauga, Ontario', width: 720, height: 1080 },
  { src: '/images/portfolio-02.webp', alt: 'Evening glam makeup for a night event by Arsh Sandhu Allure – Toronto, Ontario', width: 721, height: 1080 },
  { src: '/images/portfolio-03.webp', alt: 'Bridesmaid hairstyle with long soft curls and floral pins by Arsh Sandhu Allure – GTA, Ontario', width: 720, height: 1080 },
  { src: '/images/portfolio-04.webp', alt: 'Bride in a cathedral veil with her bouquet, bridal makeup by Arsh Sandhu Allure – Toronto, Ontario', width: 721, height: 1080 },
  { src: '/images/portfolio-05.webp', alt: 'Half-up bridal hairstyle with a lace bow, wedding hair by Arsh Sandhu Allure – GTA, Ontario', width: 720, height: 1080 },
  { src: '/images/portfolio-06.webp', alt: 'Maternity photoshoot hair and makeup by Arsh Sandhu Allure – Mississauga, Ontario', width: 723, height: 1080 },
  { src: '/images/portfolio-07.webp', alt: 'Bride in a satin ballgown with a soft veil, bridal hair and makeup by Arsh Sandhu Allure – Ontario', width: 720, height: 1080 },
  { src: '/images/portfolio-08.webp', alt: 'Newlyweds laughing outdoors, bridal updo and makeup by Arsh Sandhu Allure – GTA, Ontario', width: 720, height: 1080 },
  { src: '/images/portfolio-09.webp', alt: 'Bride with her bridesmaids on a rooftop, bridal party hair and makeup by Arsh Sandhu Allure – Niagara, Ontario', width: 720, height: 1080 },
  { src: '/images/portfolio-10.webp', alt: 'South Asian bride in an embroidered lehenga and dupatta, bridal makeup by Arsh Sandhu Allure – Mississauga, Ontario', width: 1350, height: 1080 },
]

const portfolioItems = [...baseItems, ...baseItems]

export default function Portfolio() {
  const [paused, setPaused] = useState(false)

  return (
    <section className="bg-beige min-h-screen flex flex-col justify-center py-24 overflow-hidden">

      {/* Heading */}
      <div className="text-center mb-16 px-6">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-gold text-[9px] tracking-[0.55em] uppercase mb-4"
        >
          Our Work
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-heading text-5xl font-normal text-dark tracking-wide"
        >
          Portfolio
        </motion.h2>
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          whileInView={{ scaleX: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex items-center justify-center gap-3 mt-7"
        >
          <div className="w-6 h-px bg-gold opacity-70" />
          <div className="w-1 h-1 bg-gold opacity-70 rotate-45" />
          <div className="w-6 h-px bg-gold opacity-70" />
        </motion.div>
      </div>

      {/* Infinite scroll strip with fade edges */}
      <div
        className="portfolio-fade"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          className="flex gap-3 w-max"
          style={{
            animation: 'marquee 38s linear infinite',
            animationPlayState: paused ? 'paused' : 'running',
          }}
        >
          {portfolioItems.map((item, i) => (
            <div key={i} className="h-[540px] w-[370px] flex-shrink-0 overflow-hidden">
              <img
                src={item.src}
                alt={item.alt}
                width={item.width}
                height={item.height}
                loading={i < 4 ? 'eager' : 'lazy'}
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-700 cursor-pointer hover:scale-110"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
