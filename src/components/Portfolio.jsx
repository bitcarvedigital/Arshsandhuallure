import { useState } from 'react'
import { motion } from 'framer-motion'

const baseItems = [
  { src: '/images/Portfolio%201.jpeg', alt: 'Portfolio 1' },
  { src: '/images/Portfolio%202.jpeg', alt: 'Portfolio 2' },
  { src: '/images/Portfolio%203.JPG',  alt: 'Portfolio 3' },
  { src: '/images/Portfolio%204.JPG',  alt: 'Portfolio 4' },
  { src: '/images/Portfolio%205.JPG',  alt: 'Portfolio 5' },
  { src: '/images/Portfolio%206.JPG',  alt: 'Portfolio 6' },
  { src: '/images/Portfolio%207.jpg',  alt: 'Portfolio 7' },
  { src: '/images/Portfolio%208.JPG',  alt: 'Portfolio 8' },
  { src: '/images/Portfolio%209.JPG',  alt: 'Portfolio 9' },
  { src: '/images/Portfolio%2010.JPG', alt: 'Portfolio 10' },
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
                className="w-full h-full object-cover transition-transform duration-700 cursor-pointer hover:scale-110"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
