import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Portfolio from './components/Portfolio'
import Services from './components/Services'
import CompanyEthos from './components/CompanyEthos'
import BookingCTA from './components/BookingCTA'
import Footer from './components/Footer'
import AboutPage from './pages/AboutPage'
import BookingPage from './pages/BookingPage'
import ServicesPage from './pages/ServicesPage'
import ReviewsPage from './pages/ReviewsPage'
import ScrollToTop from './components/ScrollToTop'

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
        <title>Arsh Sandhu Allure | Luxury Bridal Hair & Makeup Artist in Canada</title>
        <meta name="description" content="Arsh Sandhu Allure offers luxury bridal hair and makeup artistry for weddings, events, and editorial shoots across Canada. Book your complimentary consultation today." />
        <meta name="keywords" content="bridal makeup artist Canada, South Asian bridal hair makeup, luxury wedding makeup artist, bridal hair stylist Canada, Arsh Sandhu" />
      </Helmet>
      <Navbar />
      <Hero />
      <Portfolio />
      <Services />
      <BookingCTA />
      <CompanyEthos />
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/book" element={<BookingPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/portal/*" element={<Suspense fallback={<LazyFallback />}><PortalApp /></Suspense>} />
          <Route path="/admin/*" element={<Suspense fallback={<LazyFallback />}><AdminApp /></Suspense>} />
          <Route path="/party/:token/*" element={<Suspense fallback={<LazyFallback />}><PartyApp /></Suspense>} />
          <Route path="/join/:token" element={<Suspense fallback={<LazyFallback />}><JoinPage /></Suspense>} />
          <Route path="/privacy" element={<Suspense fallback={<LazyFallback />}><PrivacyPage /></Suspense>} />
        </Routes>
      </BrowserRouter>
      <Analytics />
      <SpeedInsights />
    </>
  )
}
