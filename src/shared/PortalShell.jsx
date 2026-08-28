import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'

// Chrome for every signed-in page (client portal + admin). Print styles hide
// the shell so any page can become a clean "Save as PDF".
export default function PortalShell({ title, nav = [], onSignOut, badge, children }) {
  return (
    <div className="min-h-screen bg-beige text-dark font-body">
      <Helmet>
        <title>{title} | Arsh Sandhu Allure</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <header className="border-b border-[#C8B8AC] bg-[#EDE5DD] print:hidden">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="font-heading text-lg tracking-wide whitespace-nowrap">
            Arsh Sandhu Allure
          </Link>
          <div className="flex items-center gap-5">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="relative text-[11px] tracking-[0.2em] uppercase text-dark hover:text-gold transition-colors"
              >
                {item.label}
                {item.showBadge && badge > 0 && (
                  <span className="absolute -top-2 -right-3 min-w-4 h-4 px-1 bg-gold text-beige text-[9px] leading-4 text-center rounded-full">
                    {badge}
                  </span>
                )}
              </Link>
            ))}
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="text-[11px] tracking-[0.2em] uppercase text-[#8A7A70] hover:text-gold transition-colors cursor-pointer"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-5 py-10">{children}</main>
      <footer className="print:hidden max-w-4xl mx-auto px-5 pb-10 pt-6 text-center">
        <p className="text-[10px] tracking-[0.25em] uppercase text-[#8A7A70]">
          Where Elegance Meets Artistry ·{' '}
          <Link to="/privacy" className="underline hover:text-gold">
            Privacy
          </Link>
        </p>
      </footer>
    </div>
  )
}
