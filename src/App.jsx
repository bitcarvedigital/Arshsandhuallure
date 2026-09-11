import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Portfolio from './components/Portfolio'
import Services from './components/Services'
import CompanyEthos from './components/CompanyEthos'
import Testimonials from './components/Testimonials'
import BookingCTA from './components/BookingCTA'
import Footer from './components/Footer'
import AboutPage from './pages/AboutPage'
import BookingPage from './pages/BookingPage'
import ServicesPage from './pages/ServicesPage'
import ReviewsPage from './pages/ReviewsPage'
import MississaugaPage from './pages/MississaugaPage'
import ScrollToTop from './components/ScrollToTop'
import StickyCTA from './components/StickyCTA'

// Portal / admin / party live in lazy chunks so the marketing bundle is
// unaffected. Nothing below may be imported by marketing components.
const PortalApp = lazy(() => import('./portal/PortalApp'))
const AdminApp = lazy(() => import('./admin/AdminApp'))
const PartyApp = lazy(() => import('./party/PartyApp'))
const JoinPage = lazy(() => import('./portal/pages/Join'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))

function LazyFallback() {
  return (
    <div className="min-h-screen bg-beige flex items-center justify-center">
      <div className="w-3 h-3 border border-gold rotate-45 animate-pulse" />
    </div>
  )
}

function Home() {
  return (
    <>
      <Helmet>
        <title>Arsh Sandhu Allure | Bridal Hair &amp; Makeup Artist – Mississauga &amp; GTA</title>
        <meta name="description" content="Mobile luxury bridal hair and makeup artist in Mississauga, serving Brampton, Toronto and the GTA. South Asian bridal, weddings, events and editorial." />
        <link rel="canonical" href="https://arshsandhuallure.com/" />
        <meta property="og:title" content="Arsh Sandhu Allure | Bridal Hair &amp; Makeup Artist – Mississauga &amp; GTA" />
        <meta property="og:description" content="Mobile luxury bridal hair and makeup artist in Mississauga, serving Brampton, Toronto and the GTA. South Asian bridal, weddings, events and editorial." />
        <meta property="og:url" content="https://arshsandhuallure.com/" />
      </Helmet>
      <Navbar />
      <Hero />
      <Portfolio />
      <Services />
      <Testimonials />
      <BookingCTA />
      <CompanyEthos />
      <Footer />
    </>
  )
}

// Marketing pages that show the mobile call/WhatsApp bar (not /book — the form is the CTA).
const STICKY_CTA_ROUTES = new Set(['/', '/about', '/services', '/reviews', '/bridal-makeup-artist-mississauga'])

function MarketingExtras() {
  const { pathname } = useLocation()
  return STICKY_CTA_ROUTES.has(pathname) ? <StickyCTA /> : null
}

// The route table, shared by the browser (App) and the build-time prerenderer
// (src/entry-server.jsx). Keep everything router-dependent in here.
export function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/book" element={<BookingPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/bridal-makeup-artist-mississauga" element={<MississaugaPage />} />
        <Route path="/portal/*" element={<Suspense fallback={<LazyFallback />}><PortalApp /></Suspense>} />
        <Route path="/admin/*" element={<Suspense fallback={<LazyFallback />}><AdminApp /></Suspense>} />
        <Route path="/party/:token/*" element={<Suspense fallback={<LazyFallback />}><PartyApp /></Suspense>} />
        <Route path="/join/:token" element={<Suspense fallback={<LazyFallback />}><JoinPage /></Suspense>} />
        <Route path="/privacy" element={<Suspense fallback={<LazyFallback />}><PrivacyPage /></Suspense>} />
      </Routes>
      <MarketingExtras />
    </>
  )
}

export default function App() {
  return (
    <>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <Analytics />
      <SpeedInsights />
    </>
  )
}
