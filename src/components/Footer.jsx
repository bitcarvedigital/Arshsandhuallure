import { Link } from 'react-router-dom'

// The portal links only appear once Supabase is configured for this
// environment, so the marketing site can ship before the portal is wired up.
const portalReady = Boolean(import.meta.env.VITE_SUPABASE_URL)

const navLinks = [
  { label: 'Services', href: '/services' },
  { label: 'About', href: '/about' },
  { label: 'Reviews', href: '/reviews' },
  { label: 'Book Now', href: '/book' },
  { label: 'Bridal Makeup Mississauga', href: '/bridal-makeup-artist-mississauga' },
]

function InstagramIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function Footer() {
  return (
    <footer className="bg-[#0F0F0F] px-6 pt-20 pb-24 md:pb-10">
      <div className="max-w-6xl mx-auto">

        {/* Top gold rule */}
        <div className="flex items-center gap-5 mb-16">
          <div className="flex-1 h-px bg-gold opacity-55" />
          <div className="w-1 h-1 bg-gold opacity-70 rotate-45" />
          <div className="flex-1 h-px bg-gold opacity-55" />
        </div>

        {/* Main footer grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">

          {/* Brand column */}
          <div className="md:col-span-1">
            <span className="font-heading text-2xl text-beige tracking-widest block mb-3">
              Arsh Sandhu Allure
            </span>
            <p className="text-[#B08A5A] text-[9px] tracking-[0.4em] uppercase mb-6">
              Where Elegance Meets Artistry
            </p>
            <p className="text-[#8A7A70] text-xs leading-relaxed max-w-xs">
              Luxury bridal hair and makeup artist based in Mississauga, Ontario — travelling across Brampton, Toronto, the GTA and beyond. Specialising in South Asian bridal beauty, weddings, events, and editorial — serving clients with care, precision, and passion.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-[8px] tracking-[0.45em] uppercase text-[#A08E82] mb-6">Navigation</p>
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className="text-[10px] tracking-[0.2em] uppercase text-[#8A7A70] hover:text-gold transition-colors duration-300 w-fit"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact & Social */}
          <div>
            <p className="text-[8px] tracking-[0.45em] uppercase text-[#A08E82] mb-6">Connect</p>
            <div className="flex flex-col gap-4">
              <p className="text-[9px] tracking-[0.35em] uppercase text-[#A08E82] mb-1">
                Bridal &nbsp;·&nbsp; Events &nbsp;·&nbsp; Editorial
              </p>
              <a
                href="mailto:arshsandhuallure@gmail.com"
                className="text-[#8A7A70] hover:text-gold text-xs tracking-wide transition-colors duration-300"
              >
                arshsandhuallure@gmail.com
              </a>
              <a
                href="tel:+14372210004"
                className="text-[#8A7A70] hover:text-gold text-xs tracking-wide transition-colors duration-300"
              >
                +1 (437) 221-0004
              </a>
              <a
                href="https://wa.me/14372210004?text=Hi%20Arsh%2C%20I%27m%20interested%20in%20bridal%20hair%20and%20makeup"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8A7A70] hover:text-gold text-xs tracking-wide transition-colors duration-300"
              >
                WhatsApp us
              </a>
              <a
                href="https://www.instagram.com/arshsandhuallure/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-[#8A7A70] hover:text-gold transition-colors duration-300 flex items-center gap-2.5 w-fit"
              >
                <InstagramIcon className="w-4 h-4" />
                <span className="text-xs tracking-widest">@arshsandhuallure</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom rule + portal logins + copyright */}
        <div className="flex items-center gap-5 mb-8">
          <div className="flex-1 h-px bg-[#2A2A2A]" />
        </div>
        {portalReady && (
        <div className="flex items-center justify-center gap-6 mb-6">
          <Link
            to="/portal/login"
            className="text-[10px] tracking-[0.25em] uppercase text-[#8A7A70] hover:text-gold transition-colors duration-300"
          >
            Client Login
          </Link>
          <span className="w-1 h-1 bg-gold opacity-50 rotate-45" />
          <Link
            to="/admin/login"
            className="text-[10px] tracking-[0.25em] uppercase text-[#8A7A70] hover:text-gold transition-colors duration-300"
          >
            Studio Login
          </Link>
        </div>
        )}
        <p className="text-[#A08E82] text-[10px] tracking-[0.2em] uppercase text-center">
          &copy; {new Date().getFullYear()} Arsh Sandhu Allure. All rights reserved.
        </p>
        <p className="text-[#8A8A8A] text-[9px] tracking-[0.15em] uppercase text-center mt-3">
          Powered by BitCarve Digital
        </p>

      </div>
    </footer>
  )
}
