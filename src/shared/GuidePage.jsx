import { Btn, MicroLabel } from './ui'

// Branded, printable renderer for the prep guides (content in content/guides.js)
export default function GuidePage({ guide }) {
  return (
    <article className="bg-[#FBF8F4] border border-[#E5D9CC] px-6 py-10 md:px-12 md:py-14 print:border-0 print:px-0">
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="w-8 h-px bg-gold" />
          <MicroLabel>{guide.eyebrow}</MicroLabel>
          <span className="w-8 h-px bg-gold" />
        </div>
        <h1 className="font-heading italic text-3xl md:text-4xl text-dark leading-tight max-w-md mx-auto">
          {guide.title}
        </h1>
        <p className="text-sm text-[#8A7A70] max-w-lg mx-auto mt-4 leading-relaxed">{guide.intro}</p>
      </div>

      {guide.sections.map((section) => (
        <section key={section.numeral} className="mb-10">
          <div className="flex items-baseline gap-4 border-b border-[#E0D2C2] pb-2 mb-4">
            <span className="font-heading italic text-gold">{section.numeral}</span>
            <h2 className="font-heading text-xl text-dark">{section.title}</h2>
          </div>
          <ul className="flex flex-col">
            {section.items.map((item, i) => (
              <li key={i} className="flex gap-3 py-3 border-b border-[#EFE6DA] last:border-0">
                <span className="w-1 h-1 mt-2.5 bg-gold rotate-45 shrink-0" />
                <p className="text-sm leading-relaxed text-[#4A3828]">
                  <strong className="text-dark font-semibold">{item.lead}</strong> {item.body}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {guide.note && (
        <aside className="border-l-2 border-gold bg-beige-card px-6 py-5 mb-10">
          <h3 className="font-heading italic text-gold text-lg mb-2">{guide.note.title}</h3>
          <p className="text-sm leading-relaxed text-[#5A4030]">{guide.note.body}</p>
        </aside>
      )}

      <section className="mb-10">
        <div className="flex items-baseline gap-4 border-b border-[#E0D2C2] pb-2 mb-4">
          <span className="font-heading italic text-gold">{guide.checklist.numeral}</span>
          <h2 className="font-heading text-xl text-dark">{guide.checklist.title}</h2>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
          {guide.checklist.items.map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-sm text-[#4A3828]">
              <span className="w-3 h-3 border border-[#A89080] shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <div className="text-center border-t border-[#E0D2C2] pt-8">
        {guide.closing.map((line, i) => (
          <p key={i} className="font-heading italic text-sm text-[#5A4030] leading-relaxed max-w-md mx-auto">
            {line}
          </p>
        ))}
        <p className="text-[10px] tracking-[0.3em] uppercase text-dark mt-6">Arsh Sandhu Allure</p>
        <p className="text-[10px] text-[#8A7A70] mt-2 tracking-wider">
          +1 (437) 221-0004 · arshsandhuallure@gmail.com · @arshsandhuallure · arshsandhuallure.com
        </p>
      </div>

      <div className="mt-8 text-center print:hidden">
        <Btn variant="outline" onClick={() => window.print()}>
          Print / Save as PDF
        </Btn>
      </div>
    </article>
  )
}
