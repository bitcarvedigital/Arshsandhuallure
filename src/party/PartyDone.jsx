import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'

// Same quiet header as the login pages: the name, then the one thing that matters.
export default function PartyDone() {
  const { state } = useLocation()
  return (
    <div className="portal-ui min-h-screen bg-beige font-body text-dark flex items-center justify-center px-6 py-14">
      <Helmet>
        <title>Thank You | Arsh Sandhu Allure</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="text-center max-w-sm">
        <p className="font-heading text-[20px] leading-tight tracking-[0.08em] pl-[0.08em] text-dark">Arsh Sandhu Allure</p>
        <h1 className="font-heading text-[2.6rem] leading-none text-dark mt-0">
          <em className="text-gold">Thank</em> you
        </h1>
        <p className="text-sm text-muted leading-relaxed mt-8">
          Your details are in{state?.bride ? ` — ${state.bride} can see them already` : ''}. We can’t wait to
          have you in the chair.
        </p>
      </div>
    </div>
  )
}
