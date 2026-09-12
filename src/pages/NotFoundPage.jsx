import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function NotFoundPage() {
  return (
    <>
      <Helmet>
        <title>Page not found | Arsh Sandhu Allure</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navbar />
      <section className="bg-beige min-h-[70vh] pt-40 pb-24 px-6 flex items-center">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-gold text-[9px] tracking-[0.55em] uppercase mb-5">404</p>
          <h1 className="font-heading text-4xl md:text-5xl font-normal text-dark leading-tight tracking-wide mb-8">
            That page has moved on
          </h1>
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-6 h-px bg-gold opacity-70" />
            <div className="w-1 h-1 bg-gold opacity-70 rotate-45" />
            <div className="w-6 h-px bg-gold opacity-70" />
          </div>
          <p className="text-[#3D2E26] text-base leading-[1.9] mb-12">
            The link you followed doesn't exist any more. Everything about bridal, event and
            editorial hair and makeup across Mississauga and the GTA is still here.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <Link to="/" className="border border-dark text-dark text-[9px] tracking-[0.4em] uppercase px-12 py-4 hover:border-gold hover:text-gold transition-colors duration-300">
              Back to home
            </Link>
            <Link to="/book" className="text-[9px] tracking-[0.4em] uppercase text-gold hover:text-dark transition-colors duration-300 py-4">
              Check my date
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </>
  )
}
