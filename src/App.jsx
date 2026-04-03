import { BrowserRouter, Routes, Route } from 'react-router-dom'
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
  )
}
