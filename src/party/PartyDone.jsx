import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'
import { DiamondRule, MicroLabel } from '../shared/ui'

export default function PartyDone() {
  const { state } = useLocation()
  return (
    <div className="min-h-screen bg-beige font-body text-dark flex items-center justify-center px-5">
      <Helmet>
        <title>Thank You | Arsh Sandhu Allure</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="text-center max-w-sm">
        <MicroLabel className="mb-4">Details Received</MicroLabel>
        <h1 className="font-heading italic text-3xl mb-4">Thank you</h1>
        <p className="text-sm text-[#7A6355] leading-relaxed">
          Your details are in{state?.bride ? ` — ${state.bride} can see them already` : ''}. We can’t wait to
          have you in the chair.
        </p>
        <DiamondRule className="mt-8" />
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#8A7A70] mt-6">Arsh Sandhu Allure</p>
      </div>
    </div>
  )
}
