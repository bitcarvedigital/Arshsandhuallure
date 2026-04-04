import { motion } from 'framer-motion'

export default function About() {
  return (
    <section id="about" className="bg-beige py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 items-start">

          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-gold text-[10px] tracking-[0.5em] uppercase mb-5">About</p>
            <h2 className="font-heading text-4xl md:text-5xl font-normal leading-tight mb-8 text-dark">
              Who is Arsh Sandhu?
            </h2>
            <div className="w-10 h-px bg-gold opacity-70 mb-8" />

            <p className="text-[#3D2E26] text-base leading-relaxed mb-5">
              Hello and welcome — I'm Arsh Sandhu, and beauty has always been a part of who I am. I was born and raised in Punjab, India, where my journey began — styling hair for my cousins and doing makeup for family during small celebrations, long before I ever considered it a career.
            </p>
            <p className="text-[#3D2E26] text-base leading-relaxed mb-5">
              I initially pursued a path in software engineering, but deep down, I always knew my passion lived elsewhere. In 2015, I followed that instinct and opened my first beauty salon from the ground up. Within three years, I expanded to three locations and began offering self-makeup classes — building something that truly reflected my creativity and love for the craft.
            </p>
            <p className="text-[#3D2E26] text-base leading-relaxed mb-5">
              In 2018, I moved to Canada to explore new opportunities and studied Business Administration in Toronto. Even then, beauty remained close to me — I continued working with clients, starting with friends and gradually growing through word of mouth into freelance work. After a brief time in the corporate world, I realized once again that my purpose was not behind a desk, but in creating, connecting, and building something of my own.
            </p>
            <p className="text-[#3D2E26] text-base leading-relaxed mb-5">
              In 2024, I fully returned to my passion and founded Arsh Sandhu Allure.
            </p>
            <p className="text-[#3D2E26] text-base leading-relaxed mb-5">
              Today, I specialise in soft, natural glam and sleek, elegant hairstyling — looks that feel timeless, refined, and effortlessly beautiful. As a luxury makeup artist based in Canada, my approach is rooted in enhancing natural features while creating a polished, elevated finish that translates both in person and on camera.
            </p>
            <p className="text-[#3D2E26] text-base leading-relaxed mb-8">
              For me, this work is more than beauty — it's about how you feel. Every client who sits in my chair is my priority, and my goal is always the same: to make you feel confident, comfortable, and truly yourself.
            </p>

            <p className="text-[#3D2E26] text-base leading-relaxed italic mb-8">
              Arsh Sandhu Allure — where elegance meets artistry.
            </p>

            <p className="text-[#5A4A40] text-sm leading-relaxed mb-10">
              Thank you for getting to know me!
            </p>

            <div className="flex items-center gap-5">
              <div className="w-10 h-px bg-gold opacity-70" />
              <span className="text-gold text-[10px] tracking-[0.4em] uppercase">— Arsh</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="aspect-[3/4] overflow-hidden sticky top-32"
          >
            <img src="/images/about%20arsh%20sandhu.jpeg" alt="Arsh Sandhu — Luxury Bridal Hair and Makeup Artist in Canada" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
          </motion.div>

        </div>
      </div>
    </section>
  )
}
