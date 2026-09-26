import { Helmet } from 'react-helmet-async'
import { Link, useLocation } from 'react-router-dom'

// Chrome for every signed-in page (client portal + admin). Print styles hide
// the shell so any page can become a clean "Save as PDF".
export default function PortalShell({ title, nav = [], onSignOut, badge, wide, children }) {
  const { pathname } = useLocation()
  // the section you're in shows in gold; home links ('/portal', '/admin') match exactly
  const current = nav.reduce((best, item) => {
    const hit = pathname === item.to || (pathname.startsWith(`${item.to}/`) && item.to.split('/').length > 2)
    return hit && (!best || item.to.length > best.length) ? item.to : best
  }, null) || (nav.find((item) => pathname.startsWith(`${item.to}/`))?.to ?? null)
  return (
    <div className="portal-ui min-h-screen bg-beige text-dark font-body">
      <Helmet>
        <title>{title} | Arsh Sandhu Allure</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <header className="border-b border-line print:hidden">
        <div className="max-w-4xl mx-auto px-5 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-0">
          <Link to="/" className="font-heading text-lg tracking-wide whitespace-nowrap">
            Arsh Sandhu Allure
          </Link>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:gap-x-5">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={current === item.to ? 'page' : undefined}
                className={`relative py-2 text-[11px] tracking-[0.2em] uppercase hover:text-gold transition-colors ${
                  current === item.to ? 'text-gold' : 'text-dark'
                }`}
              >
                {item.label}
                {item.showBadge && badge > 0 && (
                  <span className="absolute -top-2 -right-3 min-w-4 h-4 px-1 bg-gold text-beige text-[10px] leading-4 text-center rounded-full">
                    {badge}
                  </span>
                )}
              </Link>
            ))}
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="py-2 text-[11px] tracking-[0.2em] uppercase text-faint hover:text-gold transition-colors cursor-pointer"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>
      <main className={`${wide ? 'max-w-6xl' : 'max-w-4xl'} mx-auto px-5 py-10`}>{children}</main>
      <footer className="print:hidden max-w-4xl mx-auto px-5 pb-10 pt-6 text-center">
        <p className="text-[10px] tracking-[0.25em] uppercase text-faint">
          Where Elegance Meets Artistry ·{' '}
          <Link to="/privacy" className="underline hover:text-gold">
            Privacy
          </Link>
        </p>
      </footer>
    </div>
  )
}
