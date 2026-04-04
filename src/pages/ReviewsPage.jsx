import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import Navbar from '../components/Navbar'
import Reviews from '../components/Reviews'
import ReviewForm from '../components/ReviewForm'
import Footer from '../components/Footer'

export default function ReviewsPage() {
  const [showForm, setShowForm] = useState(false)
  const formRef = useRef(null)

  useEffect(() => {
    if (showForm && formRef.current) {
      setTimeout(() => {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
    }
  }, [showForm])

  return (
    <>
      <Helmet>
        <title>Client Reviews | Arsh Sandhu Allure</title>
        <meta name="description" content="Read real reviews from brides and clients of Arsh Sandhu Allure. See why clients trust Arsh for their most important beauty moments across Canada." />
      </Helmet>
      <Navbar />
      <div>
        <Reviews onLeaveReview={() => setShowForm(true)} />
        <AnimatePresence>
          {showForm && (
            <motion.div
              ref={formRef}
              key="review-form"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <ReviewForm />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Footer />
    </>
  )
}
