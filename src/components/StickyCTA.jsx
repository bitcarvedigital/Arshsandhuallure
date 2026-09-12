import { Link } from 'react-router-dom'
import { trackInquiry } from './track'

const WHATSAPP = 'https://wa.me/14372210004?text=Hi%20Arsh%2C%20I%27m%20interested%20in%20bridal%20hair%20and%20makeup'

// Mobile-only bar pinned to the bottom of the viewport on the marketing pages.
// Sits under the navbar's mobile menu (z-50) and above page content.
export default function StickyCTA() {
  return (
    <div
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0F0F0F]/95 backdrop-blur-sm border-t border-gold/40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-2">
        <Link
          to="/book"
          onClick={() => trackInquiry('book', 'sticky_bar')}
          className="py-4 text-center text-[10px] tracking-[0.3em] uppercase text-beige border-r border-gold/30 active:bg-[#1A1A1A]"
        >
          Check my date
        </Link>
        <a
          href={WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackInquiry('whatsapp', 'sticky_bar')}
          className="py-4 text-center text-[10px] tracking-[0.3em] uppercase text-beige active:bg-[#1A1A1A]"
        >
          WhatsApp us
        </a>
      </div>
    </div>
  )
}
