import { useState } from 'react'
import { motion } from 'framer-motion'

export const baseReviews = [
  { name: 'Nidhi Uppal', text: 'Arsh was incredibly polite, professional, and truly exceptional with the hairstyle she created for me. She was able to accommodate me on short notice and was very punctual as well. The style lasted for days, which honestly exceeded my expectations! I highly recommend her — amazing service and great value.' },
  { name: 'Tiffany Persaud', text: "Arsh was great to work with! She did my bridal hairstyle as well as my mom and sister-in-law and everyone loved working with her. She's super easy to talk to and listened to everyone's hair concerns and requests. In addition to my hairstyling she also set my jewelry, dupatta, and veil — ensuring every piece was set perfectly for my Big Day. She took her time setting every piece so that it looked good and was secure." },
  { name: 'Prabh Sohal', text: '5 stars is not enough! Arsh is a magician. She did my makeup for lohri. I have never felt so beautiful. The airbrush foundation was perfection and the eyeshadow blending was unreal. I got compliments all night long. Thank you for making me feel like the best version of myself!' },
  { name: 'Guneet', text: 'I loved the hairstyle so much. Arsh is so detailed with each and everything. She made sure that not even one strand of hair was off. I would definitely want her to do my hair again for another event in the future. HIGHLY RECOMMENDED!' },
  { name: 'Lilian Roshelle', text: "Arsh made me feel like the most beautiful version of myself on my wedding day. I wanted something soft and elegant, and she absolutely nailed it. My makeup looked flawless but still like me, and my hairstyle stayed perfect the entire day — even through all the dancing and emotions. She was also so calming to be around, which honestly made such a difference during the busy morning. I couldn't have asked for a better experience." },
  { name: 'Jennifer Whipp', text: "I booked Arsh for my bridal hair and makeup, and I'm so glad I did. From the trial to the wedding day, she really listened to what I wanted and customized everything to suit my face and outfit. The soft glam look she created was stunning and photographed beautifully. I got so many compliments! She's not only talented but also super professional and easy to work with. Highly recommend her to any bride!" },
]

const reviews = [...baseReviews, ...baseReviews]

export default function Reviews({ onLeaveReview }) {
  const [paused, setPaused] = useState(false)

  return (
    <section id="reviews" className="bg-[#EDE5DD] py-32 overflow-hidden">

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="text-center mb-16 px-6"
      >
        <p className="text-gold text-[9px] tracking-[0.55em] uppercase mb-4">Testimonials</p>
        <h1 className="font-heading text-5xl font-normal text-dark tracking-wide">Client Reviews</h1>
        <div className="flex items-center justify-center gap-3 mt-7">
          <div className="w-6 h-px bg-gold opacity-60" />
          <div className="w-1 h-1 bg-gold opacity-60 rotate-45" />
          <div className="w-6 h-px bg-gold opacity-60" />
        </div>
      </motion.div>

      {/* Scrolling strip */}
      <div
        className="portfolio-fade"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          className="flex gap-5 w-max"
          style={{
            animation: 'marquee 40s linear infinite',
            animationPlayState: paused ? 'paused' : 'running',
          }}
        >
          {reviews.map((review, i) => (
            <div
              key={i}
              className="w-[440px] flex-shrink-0 border border-[#B8A090] bg-beige px-10 py-12 text-center hover:scale-[1.025] hover:border-gold/50 transition-all duration-700 cursor-default"
            >
              <div className="font-heading text-5xl text-gold opacity-50 leading-none mb-6 select-none">&ldquo;</div>
              <p className="font-heading italic text-base font-normal text-[#2A1F1A] leading-[1.9] mb-8">
                {review.text}
              </p>
              <div className="flex items-center justify-center gap-3 mb-5">
                <div className="w-4 h-px bg-gold opacity-60" />
                <div className="w-1 h-1 bg-gold opacity-60 rotate-45" />
                <div className="w-4 h-px bg-gold opacity-60" />
              </div>
              <p className="text-[9px] tracking-[0.45em] uppercase text-gold">{review.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Leave a Review CTA */}
      <div className="text-center mt-16 px-6">
        <button
          onClick={onLeaveReview}
          className="border border-dark text-dark text-[9px] tracking-[0.4em] uppercase px-12 py-3.5 hover:border-gold hover:text-gold transition-colors duration-300 cursor-pointer"
        >
          Leave a Review
        </button>
      </div>

    </section>
  )
}
