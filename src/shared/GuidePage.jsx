import { Btn, MicroLabel } from './ui'

function SectionHead({ title }) {
  return <h2 className="font-heading text-xl leading-snug text-dark border-b border-line pb-2.5 mb-2">{title}</h2>
}

// Studio contact details: one per line on a phone (no dangling "·" when a
// long line wraps), one dotted line from `sm:` up.
export function ContactLine({ items, className = '' }) {
  return (
    <p className={`flex flex-col items-center gap-y-0.5 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-2 text-[11px] text-faint mt-2 tracking-wide leading-relaxed ${className}`}>
      {items.map((item, i) => (
        <span key={item} className="contents">
          {i > 0 && (
            <span className="hidden sm:inline" aria-hidden="true">
              ·
            </span>
          )}
          <span>{item}</span>
        </span>
      ))}
    </p>
  )
}

// Branded, printable renderer for the prep guides (content in content/guides.js)
export default function GuidePage({ guide }) {
  return (
    <article className="rounded-2xl bg-surface px-6 py-10 md:px-12 md:py-14 print:px-0">
      <header className="text-center mb-12">
        <MicroLabel className="mb-4">{guide.eyebrow}</MicroLabel>
        <h1 className="font-heading italic text-3xl md:text-4xl text-dark leading-tight max-w-md mx-auto">
          {guide.title}
        </h1>
        <p className="text-sm text-muted max-w-lg mx-auto mt-5 leading-relaxed">{guide.intro}</p>
      </header>

      {guide.sections.map((section) => (
        <section key={section.numeral} className="mb-12">
          <SectionHead title={section.title} />
          <ul className="flex flex-col">
            {section.items.map((item, i) => (
              <li key={i} className="flex gap-3.5 py-3.5 border-b border-line last:border-0">
                <span className="w-1 h-1 mt-[9px] rounded-full bg-muted/50 shrink-0" aria-hidden="true" />
                <p className="text-sm leading-relaxed text-body">
                  <strong className="text-dark font-semibold">{item.lead}</strong> {item.body}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {guide.note && (
        <aside className="rounded-xl bg-soft/70 px-5 py-5 sm:px-6 mb-12 print:bg-transparent print:border print:border-line">
          <h3 className="font-heading italic text-dark text-lg leading-snug mb-2">{guide.note.title}</h3>
          <p className="text-sm leading-relaxed text-body">{guide.note.body}</p>
        </aside>
      )}

      <section className="mb-12">
        <SectionHead title={guide.checklist.title} />
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 pt-3">
          {guide.checklist.items.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm leading-5 text-body">
              <span className="w-3.5 h-3.5 mt-[3px] rounded-[3px] border border-[#A89080] shrink-0" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <footer className="text-center border-t border-line pt-8">
        {guide.closing.map((line, i) => (
          <p key={i} className={`font-heading italic text-sm text-body leading-relaxed max-w-md mx-auto ${i ? 'mt-2' : ''}`}>
            {line}
          </p>
        ))}
        <p className="text-[10px] tracking-[0.3em] uppercase text-dark mt-6">Arsh Sandhu Allure</p>
        <ContactLine items={['+1 (437) 221-0004', 'arshsandhuallure@gmail.com', '@arshsandhuallure', 'arshsandhuallure.com']} />
      </footer>

      <div className="mt-8 text-center print:hidden">
        <Btn variant="outline" onClick={() => window.print()}>
          Print / Save as PDF
        </Btn>
      </div>
    </article>
  )
}
