import { useNavigate } from 'react-router-dom'
import { trackInquiry } from './track'

// The entrance animation is pure CSS (index.css `.hero-*` keyframes, same
// timing and easing the old JS animation used) so the prerendered hero
// paints before the JavaScript bundle arrives instead of waiting for it.

export default function Hero() {
  const navigate = useNavigate()

  return (
    <section
      className="relative overflow-hidden"
      style={{
        width: '100%',
        height: '100dvh',
      }}
    >
      {/* Background image */}
      <div
        className="hero-zoom"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: "url('/images/hero.webp')",
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          filter: 'grayscale(15%)',
        }}
      />

      {/* Layered gradient */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(13,13,13,0.75) 0%, rgba(13,13,13,0.4) 50%, rgba(13,13,13,0.65) 100%)' }} />
      {/* Vignette */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)' }} />

      {/* Content */}
      <div
        style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', textAlign: 'center', padding: '0 1.5rem' }}
      >
        <div className="max-w-3xl mx-auto w-full flex flex-col items-center">

          <div className="hero-rule flex items-center gap-4 mb-8">
            <div className="w-8 h-px bg-gold opacity-75" />
            <div className="w-1.5 h-1.5 border border-gold opacity-50 rotate-45" />
            <div className="w-8 h-px bg-gold opacity-75" />
          </div>

          <h1 className="hero-fade-up text-gold text-[9px] tracking-[0.55em] uppercase mb-7 font-normal" style={{ animationDelay: '0.2s' }}>
            Bridal Hair &amp; Makeup Artist · Mississauga &amp; the GTA
          </h1>

          <p className="hero-fade-up font-heading text-5xl md:text-[4.5rem] text-white font-normal leading-[1.15] mb-7 tracking-wide" style={{ animationDelay: '0.35s' }}>
            Where elegance<br />meets artistry
          </p>

          <div className="hero-fade w-12 h-px bg-white/25 mx-auto mb-7" style={{ animationDelay: '0.5s' }} />

          <p
            className="hero-fade-up text-white/90 font-light leading-[1.9] max-w-md mb-12 text-sm tracking-wide"
            style={{ animationDelay: '0.45s', animationDuration: '0.9s', textShadow: '0 1px 12px rgba(0,0,0,0.8), 0 0px 40px rgba(0,0,0,0.5)' }}
          >
            Bespoke beauty experiences crafted with precision and passion. From
            intimate bridal moments to high-fashion editorial — every face tells a
            story, and Arsh Sandhu and her team bring it to life. Based in
            Mississauga, travelling across Brampton, Toronto, the GTA and beyond.
          </p>

          <button
            onClick={() => { trackInquiry('book', 'hero'); navigate('/book') }}
            style={{ animationDelay: '0.8s' }}
            className="hero-button border border-gold text-gold text-[9px] tracking-[0.4em] uppercase px-14 py-4 hover:bg-gold hover:text-dark transition-colors duration-300 cursor-pointer"
          >
            Book a Consultation
          </button>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-beige/30 to-transparent pointer-events-none" />
    </section>
  )
}
