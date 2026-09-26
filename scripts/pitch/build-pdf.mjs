// Assembles the pitch PDF (docs/Client-Portal-Proposal.pdf) from the screenshots in .pitch/shots.
import { chromium } from 'playwright-core'
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const sharp = createRequire(import.meta.url)('sharp')
const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const SHOTS = resolve(ROOT, '.pitch/shots')
const OUT_HTML = resolve(ROOT, '.pitch/pitch.html')
const OUT_PDF = resolve(ROOT, 'docs/Client-Portal-Proposal.pdf')
const FONTS_CSS = resolve(ROOT, '.pitch/fonts/local.css')
mkdirSync(resolve(ROOT, 'docs'), { recursive: true })

const RATIO = {}
async function ratio(name) {
  if (!existsSync(`${SHOTS}/${name}.png`)) throw new Error(`missing screenshot: ${name}`)
  if (!RATIO[name]) { const m = await sharp(`${SHOTS}/${name}.png`).metadata(); RATIO[name] = m.height / m.width }
  return RATIO[name]
}

const img = (name) => `file://${SHOTS}/${name}.png`
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')

/* ------------------------------------------------------------------ CSS */
const CSS = `
${existsSync(FONTS_CSS) ? readFileSync(FONTS_CSS, 'utf8') : "@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600&display=swap');"}
:root{--paper:#FBFAF7;--ink:#17161A;--muted:#6E6862;--soft:#A39C94;--line:#DDD7CE;--accent:#1F4E5F;--accent-soft:#E6EEF0;--card:#FFFFFF;--warm:#F3EEE6}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#fff;color:var(--ink);font-family:Inter,Helvetica,Arial,sans-serif;font-size:10.5pt;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:8.5in;height:11in;padding:.55in .6in .5in;background:var(--paper);position:relative;overflow:hidden;page-break-after:always;display:flex;flex-direction:column}
.page:last-child{page-break-after:auto}
h1,h2,h3,.serif{font-family:'Instrument Serif',Georgia,serif;font-weight:400;letter-spacing:-.01em}
h1{font-size:26pt;line-height:1.05}
h2{font-size:22pt;line-height:1.1}
h3{font-size:13.5pt;line-height:1.2}
.eyebrow{font-size:7.5pt;letter-spacing:.24em;text-transform:uppercase;color:var(--accent);font-weight:500}
.muted{color:var(--muted)}
.small{font-size:9pt}
.foot{position:absolute;left:.6in;right:.6in;bottom:.32in;display:flex;justify-content:space-between;font-size:7pt;letter-spacing:.14em;text-transform:uppercase;color:var(--soft)}
.foot .n::after{counter-increment:page;content:counter(page)}
body{counter-reset:page}
.rule{height:1px;background:var(--line);margin:.18in 0}
.head{display:flex;justify-content:space-between;align-items:flex-end;gap:.3in;margin-bottom:.16in}
.head p{max-width:4.6in}
.step{font-family:'Instrument Serif',Georgia,serif;font-size:11pt;color:var(--accent);font-style:italic}
/* figures */
.figs{display:flex;gap:.18in;align-items:flex-start}
.fig{display:flex;flex-direction:column;gap:.06in;min-width:0}
.fig img{display:block;object-fit:cover;object-position:top left;border:1px solid var(--line);background:#fff;box-shadow:0 1px 0 rgba(0,0,0,.03)}
.fig figcaption{font-size:8pt;color:var(--muted);line-height:1.35}
.fig.phone img{border-radius:10px;border:2px solid #2A2A2E}
/* callouts */
.side{width:2.55in;flex:none;display:flex;flex-direction:column;gap:.13in}
.callout{border-left:2px solid var(--accent);padding-left:.12in}
.callout b{display:block;font-weight:600;font-size:9.5pt;margin-bottom:.02in}
.callout p{font-size:8.8pt;color:var(--muted);line-height:1.4}
.stack .figs{flex:none}
.stack .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.16in .22in;margin-top:.16in}
.stack .grid .callout{padding-left:.1in}
/* page 1 add-ons */
.cols{display:grid;grid-template-columns:1fr 1fr;gap:.04in .3in}
.item{display:flex;gap:.1in;align-items:flex-start;padding:.05in 0;border-bottom:1px solid var(--line)}
.item .k{font-family:'Instrument Serif',Georgia,serif;font-style:italic;color:var(--accent);font-size:11pt;width:.22in;flex:none;line-height:1.25}
.item b{font-weight:600;font-size:9.2pt}
.item p{font-size:8.2pt;color:var(--muted);line-height:1.34}
.band{background:var(--accent-soft);border-radius:4px;padding:.12in .18in;margin-top:.12in}
.band b{font-weight:600;font-size:9.4pt}
.band p{font-size:8.8pt;color:var(--muted);line-height:1.4}
/* glance page */
.two{display:grid;grid-template-columns:1fr 1fr;gap:.3in}
.list{list-style:none}
.list li{position:relative;padding-left:.18in;font-size:10pt;line-height:1.45;margin-bottom:.09in}
.list li::before{content:'';position:absolute;left:0;top:.09in;width:5px;height:5px;background:var(--accent);transform:rotate(45deg)}
.list li b{font-weight:600}
/* journey */
.journey{display:grid;grid-template-columns:1.1in 1fr 1fr;gap:0 .2in;margin-top:.1in}
.journey .hd{font-size:7.5pt;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);font-weight:500;padding-bottom:.08in;border-bottom:1px solid var(--line)}
.journey .row{display:contents}
.journey .row>div{padding:.1in 0;border-bottom:1px solid var(--line);font-size:9.6pt;line-height:1.42}
.journey .row .st{font-family:'Instrument Serif',Georgia,serif;font-size:12pt;color:var(--accent)}
.journey .row .st span{display:block;font-family:Inter;font-size:7.4pt;letter-spacing:.12em;text-transform:uppercase;color:var(--soft);margin-top:.01in}
.journey .who{font-size:7pt;letter-spacing:.14em;text-transform:uppercase;color:var(--soft);display:block;margin-bottom:.02in}
.tag{display:inline-block;font-size:7pt;letter-spacing:.12em;text-transform:uppercase;border:1px solid var(--accent);color:var(--accent);padding:.02in .07in;border-radius:2px;margin-left:.06in;vertical-align:middle}
.cover-title{margin-top:.05in}
.kicker{font-size:10pt;color:var(--muted);max-width:6.6in;line-height:1.45}
`

/* ------------------------------------------------------------ helpers */
function foot(label) {
  return `<div class="foot"><span>BitCarve Digital · Client &amp; Admin Portal</span><span>${esc(label)}</span><span class="n"></span></div>`
}

function head({ step, title, intro }) {
  return `<div class="head"><div>${step ? `<div class="step">${esc(step)}</div>` : ''}<h2>${title}</h2></div><p class="muted small">${intro}</p></div><div class="rule"></div>`
}


const GAP = 0.18
const CAP_H = 0.34 // caption allowance per row (in)
const PAGE_W = 7.3

function splits(n) {
  // all ordered compositions of n items into rows
  const out = []
  const rec = (rest, acc) => {
    if (rest === 0) return out.push(acc)
    for (let k = 1; k <= rest; k++) rec(rest - k, [...acc, k])
  }
  rec(n, [])
  return out
}

// Best packing of ordered figures into rows within a W x H box; returns rows of {img, w, h}
function pack(images, rs, W, H) {
  let best = null
  for (const comp of splits(images.length)) {
    const rows = []
    let i = 0
    for (const k of comp) {
      const idx = [...Array(k).keys()].map((j) => i + j)
      const inv = idx.reduce((a, j) => a + 1 / rs[j], 0)
      const h = (W - GAP * (k - 1)) / inv
      rows.push({ idx, h })
      i += k
    }
    const natural = rows.reduce((a, r) => a + r.h, 0) + rows.length * CAP_H + GAP * (rows.length - 1)
    const avail = H
    const scale = Math.min(1, (avail - rows.length * CAP_H - GAP * (rows.length - 1)) / (natural - rows.length * CAP_H - GAP * (rows.length - 1)))
    if (scale <= 0) continue
    let area = 0
    const laid = rows.map((r) => {
      const h = r.h * scale
      return r.idx.map((j) => {
        const w = h / rs[j]
        area += w * h
        return { img: images[j], w, h }
      })
    })
    if (!best || area > best.area) best = { area, rows: laid }
  }
  return best
}

function renderRows(rows) {
  return rows
    .map(
      (row) =>
        `<div class="figs" style="margin-bottom:${GAP}in">${row
          .map(
            (f) =>
              `<figure class="fig ${f.img.phone ? 'phone' : ''}" style="width:${f.w.toFixed(3)}in;flex:none"><img src="${img(f.img.src)}" style="height:${f.h.toFixed(3)}in;width:${f.w.toFixed(3)}in">${f.img.cap ? `<figcaption>${f.img.cap}</figcaption>` : ''}</figure>`
          )
          .join('')}</div>`
    )
    .join('')
}

const lines = (text, cpl) => Math.ceil(String(text).replace(/<[^>]+>/g, '').length / cpl)

// Choose between side layout (figures left, callouts right) and stacked layout
// (figures on top, callouts in a grid) by whichever gives the figures more area.
async function layoutPage({ label, step, title, intro, images, notes }) {
  const rs = await Promise.all(images.map((im) => ratio(im.src)))
  const headH = 1.15 + (title.length > 36 ? 0.3 : 0) + (title.length > 58 ? 0.3 : 0)
  const bodyH = 11 - 0.55 - 0.5 - 0.42 - headH

  // stacked
  const cols = Math.min(notes.length, 4)
  const cpl = cols >= 4 ? 26 : cols === 3 ? 37 : 56
  const cplB = cols >= 4 ? 20 : cols === 3 ? 28 : 44
  const gridH = 0.4 + Math.max(...notes.map((n) => lines(n.b, cplB) * 0.2 + lines(n.p, cpl) * 0.18 + 0.12))
  const stack = pack(images, rs, PAGE_W, bodyH - gridH)

  // side
  const sideH = notes.reduce((a, n) => a + (lines(n.b, 30) + lines(n.p, 40)) * 0.165 + 0.2, 0)
  const side = sideH <= bodyH ? pack(images, rs, PAGE_W - 2.55 - GAP, bodyH) : null

  const useSide = side && side.area > stack.area
  if (useSide) {
    return `<section class="page">${head({ step, title, intro })}
  <div class="figs" style="align-items:flex-start">
    <div style="flex:1;min-width:0">${renderRows(side.rows)}</div>
    <div class="side">${callouts(notes)}</div>
  </div>${foot(label)}</section>`
  }
  return `<section class="page stack">${head({ step, title, intro })}
  ${renderRows(stack.rows)}
  <div class="grid" style="grid-template-columns:repeat(${cols},1fr);margin-top:.02in">${callouts(notes)}</div>${foot(label)}</section>`
}
function callouts(items) {
  return items.map((c) => `<div class="callout"><b>${esc(c.b)}</b><p>${c.p}</p></div>`).join('')
}
const sidePage = layoutPage
const stackPage = layoutPage

/* ------------------------------------------------------------ content */
const pages = []

/* Page 1 — add-ons */
const ADDONS = [
  ['Card payments inside the portal', 'Brides pay the retainer, the balance or any invoice by card or Apple Pay. The payment records itself and the balance updates. E-transfer stays as an option.'],
  ['Each guest pays her own share', 'Bridesmaids pay for their own services through the party link, so the bride isn’t chasing money from eight people. Builds on card payments.'],
  ['Automatic reminders', 'Email or text nudges: retainer not in yet, intake unfinished, prep guides a week out, balance due, timeline the night before.'],
  ['Trial appointments with a look record', 'Book the trial as its own step, then save the products, shades, photos and notes that worked. It becomes the reference for the day.'],
  ['Assistant logins', 'Assistants sign in on their phone and see only the timelines and profiles for the events they’re working.'],
  ['Calendar sync', 'Every event’s call time lands in your Google or Apple calendar. The bride can add her day to hers.'],
  ['Enquiry to booking, no re-typing', 'Your website’s enquiry form feeds a leads list in the studio. One tap turns an enquiry into a client and sends the invite.'],
  ['Receipts & year-end export', 'A receipt emails itself when you record a payment. One export of the year’s payments and invoices for your accountant.'],
  ['Date availability on your website', 'Visitors check whether their date is open before they enquire, straight from your bookings.'],
  ['After-the-event follow-up', 'A thank-you note and a Google review request, sent on a schedule you set, respecting each bride’s photo consent.'],
  ['Messages in one place', 'A thread per client inside the portal, so questions stop scattering across DMs, texts and email. You get an email when she writes.'],
  ['Change addendum to re-sign', 'The portal already warns you when a booking changes after she signed. This adds a one-tap addendum she re-signs with the new amounts.'],
  ['Travel distance helper', 'Distance from your base to each getting-ready address, shown while you set the travel fee. The fee is always yours to decide.'],
  ['Studio insights', 'Bookings by month, booked versus collected, your busiest dates, and where your brides come from.'],
]
pages.push(`<section class="page">
  <div class="eyebrow">Prepared by BitCarve Digital</div>
  <h1 class="cover-title">Your own client &amp; studio portal</h1>
  <p class="kicker" style="margin-top:.08in">Every screen in this document is from a live portal we built for a bridal hair &amp; makeup artist in the GTA, shown under a placeholder studio name with demo clients. It is the starting point, not the finished product: your version is shaped around how <em>you</em> work. This page lists what we can add, change, or leave out.</p>
  <div class="rule" style="margin:.12in 0"></div>
  <div class="eyebrow" style="margin-bottom:.04in">Made yours, in every build</div>
  <div class="cols" style="margin-bottom:.04in">
    <div class="item"><span class="k">·</span><div><b>Your brand throughout</b><p>Colours, fonts, logo and tone on every page, email, invoice and PDF, on your own domain.</p></div></div>
    <div class="item"><span class="k">·</span><div><b>Your agreement, your policies</b><p>Retainer percentage, cancellation and rescheduling terms, photo consent and travel rules, in your words.</p></div></div>
    <div class="item"><span class="k">·</span><div><b>Your services &amp; price list</b><p>Your services, event types, standard prices and timings, loaded in before your first booking.</p></div></div>
    <div class="item"><span class="k">·</span><div><b>Your prep guides</b><p>Hair and skin preparation guides rewritten in your voice, with your do’s and don’ts.</p></div></div>
  </div>
  <div class="eyebrow" style="margin:.1in 0 .04in">Add-ons we can build for you</div>
  <div class="cols">
    ${ADDONS.map(([t, d], i) => `<div class="item"><span class="k">${i + 1}</span><div><b>${esc(t)}</b><p>${esc(d)}</p></div></div>`).join('\n    ')}
  </div>
  <div class="band"><b>And anything can come out.</b><p>Multiple events per booking, the party link, the approval step, invoices, the timeline builder, prep guides, private notes: if a piece doesn’t fit how you work, we leave it out. The portal should feel like your studio, not a piece of software.</p></div>
  ${foot('What we can add or change')}
</section>`)

/* Page 2 — at a glance */
pages.push(`<section class="page">
  ${head({ title: 'What the portal does, at a glance', intro: 'Two sides of one system: a private portal for each bride, and a studio for you. Everything lives on your own website address and works on a phone.' })}
  <div class="two">
    <div>
      <div class="eyebrow" style="margin-bottom:.1in">For each bride</div>
      <ul class="list">
        <li><b>A personal invite link.</b> She sets a password once and lands on her own page.</li>
        <li><b>One clear next step</b> at the top of her home page, with her progress underneath.</li>
        <li><b>Every event in one booking:</b> mehndi, wedding, reception, each with its own date, place and prices.</li>
        <li><b>An e-signed agreement</b> with the full fee schedule for every event, frozen at signing and printable.</li>
        <li><b>Payments at a glance:</b> total, paid, left to pay, how to pay, her payment history and her invoices.</li>
        <li><b>An intake form pre-filled from her booking.</b> She only checks the highlighted answers.</li>
        <li><b>Look profiles that ask only what matters.</b> A hair-only guest never sees skin questions.</li>
        <li><b>One party link.</b> Bridesmaids pick the events they’re attending and fill in their own details and photos.</li>
        <li><b>Her documents:</b> the agreement, the guides that match what she booked, and a timeline for each event.</li>
      </ul>
    </div>
    <div>
      <div class="eyebrow" style="margin-bottom:.1in">For you</div>
      <ul class="list">
        <li><b>A new booking in minutes:</b> events, services from your price list, fees and discounts. The retainer and balance work themselves out.</li>
        <li><b>Your price list,</b> set once in Settings, filling in every new booking.</li>
        <li><b>A review queue with email alerts.</b> Approve, or ask for a change with a note she sees.</li>
        <li><b>Her corrections flagged.</b> Anything she changed from your booking is marked, and one tap copies it across.</li>
        <li><b>A timeline builder:</b> artists side by side, auto-generated from your rules, drag to fine-tune, published per event, saved or emailed as a PDF.</li>
        <li><b>Branded invoices,</b> numbered, emailed as a PDF with a copy to you, and waiting in her portal.</li>
        <li><b>Payments as they really happen:</b> retainer, part-payments by cash or e-transfer, and the final balance.</li>
        <li><b>A warning</b> when a booking total changes after she signed.</li>
        <li><b>Private notes and a client flag,</b> archive or delete for good, weekly backups.</li>
      </ul>
    </div>
  </div>
  <div class="band" style="margin-top:auto"><b>Under the hood, briefly.</b><p>Each bride can only ever see her own data, enforced by the database itself. Photos are in private storage and open through short-lived links. Studio and client logins are separate doors, and an account of the wrong kind is turned away. Deleting a client erases every form, photo and login, which keeps you onside with Canadian privacy law (PIPEDA).</p></div>
  ${foot('At a glance')}
</section>`)

/* Page 3 — the journey */
const rows = [
  ['1', 'Enquiry', 'She enquires through your website or Instagram. You quote her the way you always do.', 'She hears back from you, as today.'],
  ['2', 'Booking', 'You add her with every event, services from your price list and any fees. Retainer and balance calculate, and her invite goes out.', 'She receives a welcome email with a personal link, valid for 7 days.'],
  ['3', 'Registration', 'Her card in your client list changes from “Invite pending” to registered.', 'She chooses a password and lands on her home page, with her first step waiting.'],
  ['4', 'Agreement', 'A signed agreement lands in your review queue and your inbox. One tap confirms it.', 'She reads her agreement with every event and price, picks photo consent, and signs.'],
  ['5', 'Retainer', 'You record it received with the date and method. The prep guides that match her services unlock.', 'She sends 30% by e-transfer. Her step completes on its own.'],
  ['6', 'Intake', 'Profiles arrive as her party fills them in. You can send an invoice any time.', 'She checks the pre-filled event details, fills in her look, and shares the party link.'],
  ['7', 'Review', 'You approve or ask for changes. Anything she changed from your booking is flagged, and one tap applies it.', 'She sees “In review”, then “Approved”, or your note with a button to revise.'],
  ['8', 'Timeline', 'You auto-generate each event’s timeline, drag to adjust, and publish it. Save or email it as a PDF.', 'Her timeline appears for each event, on her phone and printable.'],
  ['9', 'Final payment', 'You send a branded invoice for the balance and record payments as they arrive.', 'She sees what’s left and pays. Her home page says she’s ready for the big day.'],
  ['10', 'After the day', 'Archive her, or delete everything if she asks. A backup runs every week.', 'Her portal stays open for her agreement and documents.'],
]
pages.push(`<section class="page">
  ${head({ title: 'The journey, from first enquiry to the wedding morning', intro: 'What happens on your side and on the bride’s side at each step. Each step is shown on the pages that follow.' })}
  <div class="journey">
    <div class="hd">Step</div><div class="hd">You, in the studio</div><div class="hd">The bride, in her portal</div>
    ${rows.map(([n, t, a, b]) => `<div class="row"><div class="st">${n}<span>${esc(t)}</span></div><div>${esc(a)}</div><div>${esc(b)}</div></div>`).join('')}
  </div>
  ${foot('The journey')}
</section>`)

/* Step pages */
pages.push(await layoutPage({
  label: 'Step 2 · Booking', step: 'Step 2 · Booking',
  title: 'Every event and every price, in one booking',
  intro: 'You enter what you agreed with her. A booking can hold one event or a whole wedding week.',
  images: [
    { src: 'new-client-top', cap: 'Studio › New client: her details, then how many events and which ones.' },
    { src: 'new-client-event', cap: 'Each event gets its own date, times, address, party size and a note she’ll see.' },
  ],
  notes: [
    { b: 'Quick-add events', p: 'Tap Mehndi, Sangeet, Wedding, Reception or any other event, or set the number of events and name them.' },
    { b: 'Services by headcount', p: 'Pick services from your price list and say how many people. Hair and makeup counts add up as you go.' },
    { b: 'One button does the rest', p: '“Create client &amp; send invite” saves the booking, sets up her payments and documents, and emails her.' },
    { b: 'Change it any time', p: 'Every event and price can be edited later from her Overview. Totals and balances follow.' },
  ],
}))
pages.push(await layoutPage({
  label: 'Step 2 · Booking', step: 'Step 2 · Prices',
  title: 'Priced from your list, adjustable per client',
  intro: 'Your standard prices fill in automatically. You can still change any price, add fees or give a discount for one client.',
  images: [
    { src: 'new-client-prices', cap: 'Service prices, additional fees, an optional discount, and the booking summary with the 30% retainer.' },
    { src: 'admin-price-list', cap: 'Studio › Settings › Price list: your services, fees and discounts, with a default duration for each.' },
  ],
  notes: [
    { b: 'Fees that come up every season', p: 'Early-start, travel, parking and tolls sit ready. Leave one blank and it doesn’t appear.' },
    { b: 'The maths is done for you', p: 'Event totals, the booking total, the retainer and the balance all update as you type.' },
    { b: 'Durations feed the timeline', p: 'Each service’s minutes become the length of that person’s slot when the timeline is built.' },
  ],
}))
pages.push(await layoutPage({
  label: 'Step 2 · Invite', step: 'Step 2 · The invite',
  title: 'Her personal link, copied or emailed',
  intro: 'The moment a booking is created you see her invite link. The same link goes to her inbox in a branded email.',
  images: [
    { src: 'admin-client-created', cap: 'Studio › Client created. Copy the link for WhatsApp, or open her client page.' },
    { src: 'email-invite', cap: 'The welcome email she receives, in your brand.' },
  ],
  notes: [
    { b: 'Links expire in 7 days', p: 'A used or expired link stops working. “New invite link” on her Overview issues a fresh one and emails it again.' },
    { b: 'Sent from your address', p: 'Emails go out from your own domain, so they land in her inbox rather than junk.' },
    { b: 'Copy for WhatsApp', p: 'Most brides reply on WhatsApp or Instagram. The copy button gives you the link to paste wherever you’re talking.' },
  ],
}))
pages.push(await layoutPage({
  label: 'Step 3 · Registration', step: 'Step 3 · Registration',
  title: 'She sets a password and she’s in',
  intro: 'The invite opens a page with her email already filled in. After that, she signs in on the client login.',
  images: [
    { src: 'client-join', cap: 'The page her invite link opens.' },
    { src: 'client-login', cap: 'Client login, with “Forgot password” built in.' },
    { src: 'admin-login', cap: 'Your studio login: a separate door.' },
    { src: 'phone-login', cap: 'On her phone.', phone: true },
  ],
  notes: [
    { b: 'Nothing to remember but a password', p: 'Her email is her login. Password resets are emailed and bring her straight back in.' },
    { b: 'Two doors that never cross', p: 'A client account can’t open the studio, and a studio account can’t open a client portal. The wrong one is turned away with a clear message.' },
    { b: 'Hidden from search', p: 'Every portal page tells Google not to index it. Only your marketing pages are public.' },
  ],
}))
pages.push(await layoutPage({
  label: 'Her home page', step: 'Steps 4 to 9',
  title: 'Her home page: one next step at a time',
  intro: 'Every visit opens on the one thing she should do next, with a single button. Her whole journey sits quietly underneath.',
  images: [
    { src: 'client-home-fresh', cap: 'Day one: sign the agreement.' },
    { src: 'client-home', cap: 'Weeks later: only the final payment is left.' },
    { src: 'phone-home', cap: 'On her phone.', phone: true },
  ],
  notes: [
    { b: 'The button says what it does', p: '“Read &amp; sign”, “See how to pay”, “Continue”, “See what to change”. No guessing.' },
    { b: 'Steps open in order', p: 'Payments open after signing, guides after the retainer, the timeline once you publish it.' },
    { b: 'All her events at the top', p: 'Each event shows as a small tag with its date, so the portal always feels like hers.' },
  ],
}))
pages.push(await layoutPage({
  label: 'Step 4 · Agreement', step: 'Step 4 · Agreement',
  title: 'Her agreement shows every event and every price',
  intro: 'Her booking and your fee schedule are built into the agreement she signs, event by event.',
  images: [
    { src: 'agreement-booking', cap: 'Her contact details and each event: arrival time, ready-by time, location, party size, services booked.' },
    { src: 'agreement-fees', cap: 'The fee schedule: services, fees and discounts per event, the booking total, the retainer and the balance.' },
  ],
  notes: [
    { b: 'Frozen at signing', p: 'What she signs is saved exactly as it was. Changing the booking later never alters her signed copy.' },
    { b: 'Payments kept current', p: 'Below the signed text, a payments section updates as money arrives, clearly marked as not part of the agreement.' },
    { b: 'Your terms, versioned', p: 'Older agreements always show the terms version she actually signed.' },
  ],
}))
pages.push(await layoutPage({
  label: 'Step 4 · Agreement', step: 'Step 4 · Signing',
  title: 'Signed in two minutes, confirmed in one tap',
  intro: 'She picks photo consent, types her name as her signature, and signs. You confirm it from your queue or her client page.',
  images: [
    { src: 'agreement-sign', cap: 'Photo consent, typed signature and acknowledgement.' },
    { src: 'agreement-signed-record', cap: 'Her signature record, with “Print / Save as PDF”.' },
    { src: 'admin-agreement', cap: 'Studio › Client › Agreement, waiting for your confirmation.' },
  ],
  notes: [
    { b: 'Photo consent on record', p: '“I agree” or “keep my photos private” is saved with the signature, so you know before you post.' },
    { b: 'Evidence kept', p: 'Signed name, time, IP address and device are stored with every signature.' },
    { b: 'Waits for her quote', p: 'The signing form only opens once her prices are in, so she never signs an empty agreement.' },
  ],
}))
pages.push(await layoutPage({
  label: 'Step 5 · Payments', step: 'Steps 5 and 9 · Payments',
  title: 'What she owes, what she’s paid, how to pay',
  intro: 'Her payments page answers the three questions brides message about most, with your e-transfer details right there.',
  images: [
    { src: 'client-payments', cap: 'Total, paid and left to pay; retainer and final balance; her payment history and invoices.' },
    { src: 'phone-payments', cap: 'On her phone.', phone: true },
  ],
  notes: [
    { b: 'No screenshots of e-transfers', p: 'She sends the transfer and waits. When you record it, her step completes and the history updates.' },
    { b: 'Every payment labelled', p: 'The retainer, a part-payment towards the wedding, the final balance: each shows what it paid for, how, and when.' },
    { b: 'The balance stays locked until it’s due', p: 'The final balance only opens after the retainer arrives, so she’s never asked for the wrong payment.' },
  ],
}))
pages.push(await layoutPage({
  label: 'Invoices', step: 'Step 9 · Invoices',
  title: 'Branded invoices, emailed and in her portal',
  intro: 'Send an invoice from her Payments tab. She gets a PDF by email, and the same invoice waits on her payments page.',
  images: [
    { src: 'pdf-invoice-p1', cap: 'The invoice PDF she receives.' },
    { src: 'email-invoice', cap: 'The email it arrives in, with a copy to you.' },
    { src: 'client-invoice', cap: 'The same invoice in her portal, with “Download PDF”.' },
  ],
  notes: [
    { b: 'Numbered for you', p: 'Every invoice gets the next number in sequence and freezes the prices and payments as they stood.' },
    { b: 'Amount due, your call', p: 'Invoice the retainer, a part-payment or the full balance, with a due date and a note.' },
    { b: 'Preview first', p: 'See the invoice on screen or as a PDF before it goes. Re-send or void it later.' },
  ],
}))
pages.push(await layoutPage({
  label: 'Step 5 · Payments', step: 'Steps 5 and 9 · Your side',
  title: 'Record payments the way they really arrive',
  intro: 'Retainer, a cash part-payment at the mehndi, an e-transfer for the balance: each one is recorded against the booking.',
  images: [
    { src: 'admin-payments-top', cap: 'Studio › Client › Payments: the summary, the retainer and the final balance.' },
    { src: 'admin-payments-other', cap: 'Other payments, recorded with what they’re for, the event, the date and the method.' },
    { src: 'admin-invoices', cap: 'New invoice and invoices sent, with view, PDF, re-send and void.' },
  ],
  notes: [
    { b: 'Retainer received unlocks her guides', p: 'Recording the retainer completes her payment step and reveals the prep guides that match what she booked.' },
    { b: 'The balance follows', p: 'Every part-payment comes off the final balance automatically, on both sides.' },
    { b: 'Undo is one tap', p: 'Recorded something by mistake? Mark it as not received, or delete a part-payment.' },
  ],
}))
pages.push(await layoutPage({
  label: 'Step 6 · Intake', step: 'Step 6 · Intake',
  title: 'An intake form that’s already filled in',
  intro: 'Everything you entered at booking is waiting for her. She checks the highlighted answers, fixes anything that’s off, and sends it.',
  images: [
    { src: 'intake-events', cap: 'Her events, pre-filled. Highlighted answers are waiting for her to check them.' },
    { src: 'intake-party', cap: 'Her own look, her party, and “Submit”.' },
    { src: 'phone-intake', cap: 'On her phone.', phone: true },
  ],
  notes: [
    { b: 'Tap to confirm', p: 'Tapping a highlighted answer confirms it. Anything left unchecked stays flagged for you too.' },
    { b: 'Saves as she types', p: 'She can fill it over several evenings. Nothing is lost.' },
    { b: 'Her party, two ways', p: 'She adds people herself, or shares one link so each person fills in their own profile.' },
  ],
}))
pages.push(await layoutPage({
  label: 'Step 6 · Look profiles', step: 'Step 6 · The look profile',
  title: 'Only the questions that matter for each person',
  intro: 'The profile follows the service. Someone booked for hair never sees skin or foundation questions, and the reverse.',
  images: [
    { src: 'client-profile-bride', cap: 'The bride, booked for hair and makeup: every section.' },
    { src: 'client-profile-hair', cap: 'A guest booked for hair only: no skin questions at all.' },
    { src: 'phone-profile', cap: 'Tap-sized choices on a phone.', phone: true },
  ],
  notes: [
    { b: 'The details that matter on the day', p: 'Skin type, foundation shade, hair length and texture, likes, deal-breakers and allergies.' },
    { b: 'Photos in the right slots', p: 'A current selfie plus makeup and hair inspiration, uploaded from the camera roll or pasted as a Pinterest link.' },
    { b: 'Private by design', p: 'Photos live in private storage and open through links that expire in an hour.' },
  ],
}))
pages.push(await layoutPage({
  label: 'Step 6 · Party link', step: 'Step 6 · The party link',
  title: 'One link for the whole bridal party',
  intro: 'The bride shares a single link. Each guest picks the events she’s attending and fills in her own profile. No accounts, no passwords.',
  images: [
    { src: 'party-form', cap: 'The form a bridesmaid sees, with a plain-language privacy note above the button.' },
    { src: 'phone-party', cap: 'Where most of them fill it in.', phone: true },
    { src: 'client-party-link', cap: 'The bride’s party link page: copy, turn off, and who has sent theirs.' },
  ],
  notes: [
    { b: 'Only what you booked', p: 'Guests can only choose services the booking includes, and pick which events they’ll be styled at.' },
    { b: 'Straight into the intake', p: 'Each submission appears in the bride’s party list and your review queue at the same moment.' },
    { b: 'Expires and can be switched off', p: 'The link closes 30 days after her last event. She can turn it off any time and make a new one.' },
  ],
}))
pages.push(await layoutPage({
  label: 'Step 7 · Review', step: 'Step 7 · Review',
  title: 'Everything she sends waits for you in one queue',
  intro: 'Signed agreements, intake forms and party profiles arrive grouped by bride. You approve, or ask for a change with a note.',
  images: [
    { src: 'email-alert', cap: 'The alert you get. One email per batch, not one per profile.' },
    { src: 'admin-queue-request', cap: 'Studio › Review, with a change request being written.' },
    { src: 'phone-admin-queue', cap: 'The queue on your phone.', phone: true },
  ],
  notes: [
    { b: 'Three actions', p: '“View” opens her page on the right tab. “Approve” confirms it. “Request changes” sends a note she sees on her intake.' },
    { b: 'Approve all', p: 'When a whole party lands at once, one button approves every item for that bride.' },
    { b: 'A live count', p: 'The Review tab shows how many items are waiting, on every studio page.' },
  ],
}))
pages.push(await layoutPage({
  label: 'Step 7 · Review', step: 'Step 7 · Review',
  title: 'See exactly what she changed',
  intro: 'Her answers sit next to your booking. Anything she changed is flagged, and one tap copies her corrections into the booking.',
  images: [
    { src: 'admin-intake-events', cap: 'Studio › Client › Intake: her answers per event, with changes and unchecked answers flagged.' },
    { src: 'client-intake-changes', cap: 'What she sees when you ask for a change.' },
  ],
  notes: [
    { b: 'Changed by client', p: 'Marked in red with what your booking says, so a new suite number or a later ready time never slips past.' },
    { b: 'Apply her changes', p: 'One button copies her corrected dates, times, addresses and party sizes into the booking.' },
    { b: 'Revise my answers', p: 'Your note sits at the top of her intake with a button to reopen it. She sends it back when it’s fixed.' },
  ],
}))
pages.push(await layoutPage({
  label: 'Step 7 · Profiles', step: 'Step 7 · Review',
  title: 'Every profile, with photos, in your studio',
  intro: 'Each person’s service, key details and events at a glance. Open anyone to see everything they sent, and approve from the same screen.',
  images: [
    { src: 'admin-intake-profiles', cap: 'Profiles: service, hair and skin notes, allergies, events, and status.' },
    { src: 'admin-profile', cap: 'One profile, editable, with Approve.' },
  ],
  notes: [
    { b: 'Trial-day ready', p: 'Keep this open during a trial: skin, hair, foundation, allergies and inspiration are all there.' },
    { b: 'Edits go back for review', p: 'If a bride changes an approved profile, it returns to your queue on its own.' },
    { b: 'You can edit too', p: 'Fix a typo, add a note, or upload a trial photo yourself.' },
  ],
}))
pages.push(await layoutPage({
  label: 'Step 8 · Timeline', step: 'Step 8 · Timeline builder',
  title: 'Tell it who’s working and who’s getting ready',
  intro: 'Each event has its own timeline. Add your artists and what each is best at, and the guests come straight from the booking and the party profiles.',
  images: [{ src: 'timeline-setup', cap: 'Studio › Client › Timeline: events, artists, guests and timing.' }],
  notes: [
    { b: 'Best at hair, makeup or both', p: 'The builder gives the bride’s hair and makeup to the artists best at each.' },
    { b: 'Important people starred', p: 'The bride, her mother and the maid of honour are starred automatically and finish close to her.' },
    { b: 'Work back from ready-by', p: 'Set the ready time, the touch-up window and how early the bride is done. Or start from a set time instead.' },
    { b: 'Auto generate', p: 'One button plans the whole morning: one-hour services, each person’s two services close together, artists kept busy rather than waiting around.' },
  ],
}))
pages.push(await layoutPage({
  label: 'Step 8 · Timeline', step: 'Step 8 · Timeline builder',
  title: 'Auto-generate the morning, then drag to fine-tune',
  intro: 'Times are never typed. They follow from the order, each slot’s length and the ready-by time, so moving one person re-times everyone.',
  images: [
    { src: 'timeline-build', cap: 'Build the day: artists side by side on one time axis. Sage is hair, blush is makeup, gold stars are important people.' },
    { src: 'admin-brick-editor', cap: 'Tap anyone to change who they are, their service, length, artist or a note.' },
  ],
  notes: [
    { b: 'Drag and drop', p: 'Move people between artists or up and down. Breaks can be added anywhere.' },
    { b: 'Clashes caught', p: 'If the same person is booked with two artists at once, or the first brush is earlier than the booked arrival, you’re told.' },
    { b: 'Sample layouts', p: 'Start from a template instead: bride only, bride plus party, a hair team and a makeup team.' },
  ],
}))
pages.push(await layoutPage({
  label: 'Step 8 · Timeline', step: 'Step 8 · Publishing',
  title: 'Publish it, save it as a PDF, or email it to your team',
  intro: 'Save drafts until it’s right, then publish. The same timeline comes out as a branded PDF for your artists or the bride’s coordinator.',
  images: [
    { src: 'pdf-timeline-p1', cap: 'The timeline as a PDF.' },
    { src: 'timeline-bar', cap: 'Notes for a smooth morning, and the bar to preview, save as PDF, email to studio, save or publish.' },
  ],
  notes: [
    { b: 'Published per event', p: 'The mehndi timeline can go out weeks before the wedding’s. Hide one again if plans change.' },
    { b: 'Your standing notes', p: 'Arrive with clean, dry hair; breakfast on hand; button-up tops. Shown to her under every timeline.' },
    { b: 'Email to studio', p: 'Sends the PDF to your own inbox, ready to forward to assistants.' },
  ],
}))
pages.push(await layoutPage({
  label: 'Step 8 · Timeline', step: 'Step 8 · Her side',
  title: 'What she sees the night before',
  intro: 'Her timeline appears on her home page and in her documents, one tab per event, on her phone and printable.',
  images: [
    { src: 'client-timeline', cap: 'Her wedding timeline: every artist, every person, the touch-up window and the ready-by line.' },
    { src: 'phone-timeline', cap: 'On her phone, one list per artist.', phone: true },
  ],
  notes: [
    { b: 'Everyone on the same page', p: 'She can screenshot or print it for her party. No more “what time am I?” messages.' },
    { b: 'Each event separately', p: 'Mehndi, wedding, reception: she switches between them at the top.' },
    { b: 'Your notes travel with it', p: 'The things you always have to repeat, right under the schedule.' },
  ],
}))
pages.push(await layoutPage({
  label: 'Step 5 · Guides', step: 'Step 5 · Preparation',
  title: 'Prep guides that match what she booked',
  intro: 'Your hair and skin guides unlock when the retainer arrives. A hair-only booking gets the hair guide, a makeup-only booking the skin guide.',
  images: [
    { src: 'client-docs', cap: 'Her documents: only what you’ve made visible.' },
    { src: 'client-hair-guide', cap: 'Hair preparation guide.' },
    { src: 'client-skin-guide', cap: 'Skin preparation guide.' },
    { src: 'admin-docs', cap: 'Studio › Client › Docs: view each document as she sees it, and switch it on or off.' },
  ],
  notes: [
    { b: 'Written once, in your words', p: 'Night-before washing, no new skincare that week, button-up tops, and a checklist.' },
    { b: 'You decide what she sees', p: 'One switch per document, per client.' },
    { b: 'Print-ready', p: 'Every document prints cleanly, without the portal around it.' },
  ],
}))
pages.push(await layoutPage({
  label: 'Your studio', step: 'Your studio',
  title: 'Her whole booking on one page',
  intro: 'Her Overview holds her details, portal access, every event and the running totals. One save bar at the bottom.',
  images: [
    { src: 'overview-top', cap: 'The warning you see when a booking changes after she signed, her details and portal access.' },
    { src: 'overview-events', cap: 'Events fold into one line each. Open all or close all.' },
    { src: 'overview-event-prices', cap: 'An open event: services, prices, fees and the event total.' },
  ],
  notes: [
    { b: 'Changes after signing', p: 'If the total moves after she signed, you’re told by how much, so you can let her know.' },
    { b: 'Duplicate an event', p: 'Copy the wedding to make the reception, then change what’s different.' },
    { b: 'Archive or delete', p: 'Archive keeps everything but moves her out of your list. Delete erases every form, photo and login.' },
  ],
}))
pages.push(await layoutPage({
  label: 'Your studio', step: 'Your studio',
  title: 'Your clients, sorted by what’s coming next',
  intro: 'The studio home lists upcoming brides with every event and the days to go. Past and archived clients are one tap away.',
  images: [
    { src: 'admin-clients', cap: 'Studio › Clients: each event as a tag, invite status, and a quiet dot for your client flag.' },
    { src: 'phone-admin-clients', cap: 'On your phone.', phone: true },
    { src: 'admin-notes', cap: 'Private notes. Only you ever see these.' },
  ],
  notes: [
    { b: 'Built for a phone in one hand', p: 'Every studio page works at phone width, so you can approve a profile between clients.' },
    { b: 'Upcoming until her last event', p: 'A bride stays in your upcoming list until her final event has passed.' },
    { b: 'Settings you own', p: 'Your e-transfer address, where alerts go, your price list and your password. No developer needed.' },
  ],
}))
pages.push(await layoutPage({
  label: 'Her settings', step: 'Her side',
  title: 'Her settings, and a reset that just works',
  intro: 'She can update her phone number and change her password. Name and email changes go through you, so records stay clean.',
  images: [
    { src: 'client-settings', cap: 'Her Settings page.' },
    { src: 'client-reset', cap: 'The page a password-reset email opens.' },
  ],
  notes: [
    { b: 'Less to support', p: 'Forgotten passwords, the most common support message, resolve themselves by email.' },
    { b: 'Clean records', p: 'Her email is her login and appears on her agreement, so only you can change it.' },
    { b: 'Sign out anywhere', p: 'Sign out is on every page, for shared family tablets and laptops.' },
  ],
}))

/* Closing page */
pages.push(`<section class="page">
  ${head({ title: 'Behind the scenes, and what happens next', intro: 'The parts you never see but would miss: security, privacy, backups, and how a build like this runs.' })}
  <div class="two">
    <div>
      <div class="eyebrow" style="margin-bottom:.1in">Security &amp; privacy</div>
      <ul class="list">
        <li><b>Each bride sees only her own data.</b> Enforced by the database itself, not just by the screens.</li>
        <li><b>Your notes are separate.</b> Private notes and client flags live where only you can read them.</li>
        <li><b>Photos are private.</b> Stored in a private bucket and opened through links that expire after an hour.</li>
        <li><b>Links expire.</b> Invite links are single-use and last 7 days. Party links close after the last event and can be switched off.</li>
        <li><b>Erasure is real.</b> Deleting a client removes every form, photo and login, which is what PIPEDA expects when someone asks to be forgotten.</li>
        <li><b>Nothing indexed.</b> Every portal page is hidden from search engines.</li>
      </ul>
      <div class="eyebrow" style="margin:.2in 0 .1in">Reliability</div>
      <ul class="list">
        <li><b>Weekly automatic backups</b> of every table, kept for 12 weeks and emailed to you.</li>
        <li><b>Branded email</b> from your own domain for invites, alerts, invoices and password resets.</li>
        <li><b>Runs on managed cloud services</b> (Vercel and Supabase), so there’s no server for anyone to babysit.</li>
      </ul>
    </div>
    <div>
      <div class="eyebrow" style="margin-bottom:.1in">How we would do this with you</div>
      <ul class="list">
        <li><b>1 · A short call.</b> We walk through this document, and you tell us what you want in, out, and added.</li>
        <li><b>2 · Your brand, your words, your prices.</b> Colours, fonts, logo, your agreement terms, your prep guides and your price list.</li>
        <li><b>3 · Build.</b> We set up your portal on your domain and load your first real booking together.</li>
        <li><b>4 · A test run.</b> You play the bride on your phone, and we adjust wording and order until it feels like you.</li>
        <li><b>5 · Launch, then care.</b> We stay on hand for tweaks, keep backups running, and add the add-ons when you’re ready.</li>
      </ul>
      <div class="band" style="margin-top:.25in"><b>A note on the screens in this document.</b><p>They come from a live portal we built for a bridal hair &amp; makeup artist in the GTA, shown under a placeholder studio name with demo clients and placeholder photos. Your portal would carry your brand, your terms and your wording from the first screen to the last.</p></div>
      <div class="band" style="margin-top:.14in;background:var(--warm)"><b>BitCarve Digital</b><p>Web design and custom portals for independent businesses, Greater Toronto Area.</p></div>
    </div>
  </div>
  ${foot('Next steps')}
</section>`)

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Client &amp; Admin Portal — Proposal</title><style>${CSS}</style></head><body>${pages.join('\n')}</body></html>`
writeFileSync(OUT_HTML, html)

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
  ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } } : {}),
})
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, deviceScaleFactor: 1 })
const page = await ctx.newPage()
await page.goto(`file://${OUT_HTML}`, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(800)
await page.pdf({ path: OUT_PDF, format: 'Letter', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 }, preferCSSPageSize: false })
console.log('fonts:', await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family).filter((v, i, a) => a.indexOf(v) === i)))
// review renders of each page
mkdirSync(resolve(ROOT, '.pitch/pdfpages'), { recursive: true })
const els = await page.$$('.page')
const overflow = await page.evaluate(() =>
  [...document.querySelectorAll('.page')].map((pg, i) => {
    const foot = pg.querySelector('.foot').getBoundingClientRect().top
    const max = Math.max(...[...pg.children].filter((c) => !c.classList.contains('foot')).map((c) => c.getBoundingClientRect().bottom))
    return max > foot - 4 ? `page ${i + 1} overflows by ${(max - foot).toFixed(0)}px` : null
  }).filter(Boolean)
)
console.log('overflow:', overflow.length ? overflow : 'none')
for (let i = 0; i < els.length; i++) await els[i].screenshot({ path: `${ROOT}.pitch/pdfpages/p${String(i + 1).padStart(2, '0')}.png` })
await browser.close()
console.log('wrote', OUT_PDF, 'pages', els.length)
