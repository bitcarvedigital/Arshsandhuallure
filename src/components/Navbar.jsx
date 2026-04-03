import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'

const navLinks = [
  { label: 'Services', href: '/services' },
  { label: 'About', href: '/about' },
  { label: 'Reviews', href: '/reviews' },
]

function NavLink({ href, label, onClick, light }) {
  const cls = `group relative text-[10px] tracking-[0.22em] uppercase transition-colors duration-300 hover:text-gold ${light ? 'text-white/90' : 'text-dark'}`
  return (
    <Link to={href} onClick={onClick} className={cls}>
      {label}
      <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-gold transition-all duration-500 group-hover:w-full" />
    </Link>
  )
}

function InstagramIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()

  const isHome = pathname === '/'
  const light = isHome && !scrolled

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled ? 'bg-[#EDE5DD] border-b border-[#C8B8AC]' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-8 md:px-12 py-5 flex items-center justify-between">

        <Link to="/" className={`font-heading text-[1.1rem] tracking-[0.1em] transition-colors duration-300 ${light ? 'text-white' : 'text-dark'}`}>
          Arsh Sandhu Allure
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <NavLink key={link.label} href={link.href} label={link.label} light={light} />
          ))}
          <div className="w-px h-3 bg-current opacity-40 mx-1" />
          <a
            href="https://www.instagram.com/arshsandhuallure/"
            target="_blank"
            rel="noopener noreferrer"
            className={`transition-colors duration-300 hover:text-gold ${light ? 'text-white/80' : 'text-dark'}`}
            aria-label="Instagram"
          >
            <InstagramIcon className="w-[15px] h-[15px]" />
          </a>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-[5px] relative z-50"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          <span className={`block h-px transition-all duration-300 origin-center ${light && !menuOpen ? 'bg-white' : 'bg-dark'} ${menuOpen ? 'w-5 rotate-45 translate-y-[7px]' : 'w-5'}`} />
          <span className={`block h-px transition-all duration-300 ${light && !menuOpen ? 'bg-white' : 'bg-dark'} ${menuOpen ? 'w-5 opacity-0 scale-x-0' : 'w-4'}`} />
          <span className={`block h-px transition-all duration-300 origin-center ${light && !menuOpen ? 'bg-white' : 'bg-dark'} ${menuOpen ? 'w-5 -rotate-45 -translate-y-[7px]' : 'w-3'}`} />
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            className="md:hidden bg-[#EDE5DD] border-t border-[#C8B8AC] px-8 pt-8 pb-12 flex flex-col gap-7 relative"
          >
            {/* Close button */}
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="absolute top-5 right-8 w-8 h-8 flex items-center justify-center text-dark hover:text-gold transition-colors duration-300"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <line x1="1" y1="1" x2="15" y2="15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="15" y1="1" x2="1" y2="15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>

            {navLinks.map((link) => (
              <NavLink key={link.label} href={link.href} label={link.label} light={false} onClick={() => setMenuOpen(false)} />
            ))}

            <div className="w-8 h-px bg-gold opacity-30" />

            <a
              href="https://www.instagram.com/arshsandhuallure/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-dark hover:text-gold transition-colors duration-300 w-fit flex items-center gap-2.5"
              aria-label="Instagram"
            >
              <InstagramIcon className="w-[15px] h-[15px]" />
              <span className="text-[10px] tracking-widest text-dark/60">@arshsandhuallure</span>
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
