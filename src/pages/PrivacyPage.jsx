import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'

const SECTIONS = [
  {
    title: 'What we collect',
    body: 'When you inquire, book, or use our client portal we collect the details you choose to share: your name and contact information, event details, beauty preferences (skin, hair, allergies and sensitivities), and any photos you upload as references. When a member of a wedding party fills in their own profile through a shared link, we collect the same kinds of details about them, provided by them.',
  },
  {
    title: 'Why we collect it',
    body: 'Only to deliver our services: preparing quotes and agreements, planning your wedding-day schedule, and crafting each person’s hair and makeup. Allergy and sensitivity information is used solely to keep the products we bring safe for your skin. We never sell or rent personal information.',
  },
  {
    title: 'Photos',
    body: 'Reference photos you upload are stored privately and viewed only by you (or your bride, for wedding-party profiles) and our team. Photos of your finished look are used in our portfolio and social media only when you have expressly agreed in your service agreement.',
  },
  {
    title: 'Where it lives',
    body: 'Portal information is stored with our secure cloud provider behind individual logins, with access limited to your own booking. Payment is by e-transfer — we never see or store card numbers.',
  },
  {
    title: 'Your choices',
    body: 'You can review and update your details in the portal at any time, and you or any member of your party may ask us to correct or delete their information — email arshsandhuallure@gmail.com and we will remove it, including uploaded photos.',
  },
  {
    title: 'Questions',
    body: 'For anything about your personal information, contact us at arshsandhuallure@gmail.com or +1 (437) 221-0004.',
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-beige font-body text-dark">
      <Helmet>
        <title>Privacy Policy | Arsh Sandhu Allure</title>
        <meta name="description" content="How Arsh Sandhu Allure collects, uses, and protects your personal information." />
      </Helmet>
      <div className="max-w-2xl mx-auto px-5 py-16">
        <div className="text-center mb-12">
          <Link to="/" className="font-heading text-2xl">Arsh Sandhu Allure</Link>
          <p className="text-gold text-[10px] tracking-[0.35em] uppercase mt-3">Privacy Policy</p>
          <div className="flex items-center gap-3 mt-6">
            <span className="flex-1 h-px bg-[#C8B8AC]" />
            <span className="w-1.5 h-1.5 border border-gold rotate-45" />
            <span className="flex-1 h-px bg-[#C8B8AC]" />
          </div>
        </div>
        <p className="text-sm text-[#7A6355] leading-relaxed mb-10">
          Your trust matters to us as much as your wedding morning. This page explains, in plain words, what
          personal information we collect, why, and the choices you always have.
        </p>
        <div className="flex flex-col gap-8">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="font-heading text-xl mb-2">{s.title}</h2>
              <p className="text-sm leading-relaxed text-[#4A3828]">{s.body}</p>
            </section>
          ))}
        </div>
        <p className="text-xs text-[#8A7A70] mt-12">Last updated: August 2026</p>
      </div>
    </div>
  )
}
