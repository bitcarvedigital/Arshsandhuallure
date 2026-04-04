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
        </Routes>
      </BrowserRouter>
      <Analytics />
      <SpeedInsights />
    </>
  )
}
