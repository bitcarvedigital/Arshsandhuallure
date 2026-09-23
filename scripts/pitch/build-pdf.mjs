// Assembles the pitch PDF from the screenshots in ../shots.
import { chromium } from 'playwright-core'
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
const sharp = createRequire(new URL('../../package.json', import.meta.url).pathname)('sharp')
const RATIO = {}
async function ratio(name) {
  if (!RATIO[name]) { const m = await sharp(`${resolve('../../.pitch/shots')}/${name}.png`).metadata(); RATIO[name] = m.height / m.width }
  return RATIO[name]
}

const SHOTS = resolve('../../.pitch/shots')
const OUT_HTML = resolve('../../.pitch/pitch.html')
const OUT_PDF = resolve('../../docs/Client-Portal-Proposal-Kristen.pdf')
mkdirSync(resolve('../../docs'), { recursive: true })

const img = (name) => `file://${SHOTS}/${name}.png`
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')

/* ------------------------------------------------------------------ CSS */
const CSS = `
${readFileSync(resolve('../../.pitch/fonts/local.css'),'utf8')}
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
pages.push(`<section class="page">
  <div class="eyebrow">Prepared by BitCarve Digital · For Kristen</div>
  <h1 class="cover-title">Your own client &amp; admin portal</h1>
  <p class="kicker" style="margin-top:.08in">Every screen in this document is from a portal we built and run for a bridal hair &amp; makeup artist in the GTA. It is the starting point, not the finished product: your version is shaped around how <em>you</em> work. This first page lists what we can add, change, or leave out.</p>
  <div class="rule" style="margin:.12in 0"></div>
  <div class="eyebrow" style="margin-bottom:.04in">Made yours, in every build</div>
  <div class="cols" style="margin-bottom:.04in">
    <div class="item"><span class="k">·</span><div><b>Your brand throughout</b><p>Colours, fonts, logo, wording and tone, on every page and every email the portal sends.</p></div></div>
    <div class="item"><span class="k">·</span><div><b>Your agreement, your policies</b><p>Retainer percentage, cancellation and rescheduling terms, photo consent, travel rules, written the way you want them.</p></div></div>
    <div class="item"><span class="k">·</span><div><b>Your prep guides</b><p>Hair and skin preparation guides rewritten in your voice, with your do's and don'ts.</p></div></div>
    <div class="item"><span class="k">·</span><div><b>Your services &amp; event types</b><p>Hair, makeup, or both; bridal, engagement, reception, editorial, or whatever you offer, on your own domain.</p></div></div>
  </div>
  <div class="eyebrow" style="margin:.1in 0 .04in">Add-ons we can build for you</div>
  <div class="cols">
    <div class="item"><span class="k">1</span><div><b>Card payments inside the portal</b><p>Brides pay the retainer and balance by card or Apple Pay. Payments mark themselves received. E-transfer stays as an option.</p></div></div>
    <div class="item"><span class="k">2</span><div><b>Automatic reminders</b><p>Email or text nudges: retainer not yet received, intake still unfinished, prep guide the week before, balance due, timeline the night before.</p></div></div>
    <div class="item"><span class="k">3</span><div><b>Multi-event bookings</b><p>One bride, several events (mehndi, sangeet, wedding, reception), each with its own date, party, timeline and balance.</p></div></div>
    <div class="item"><span class="k">4</span><div><b>Trial appointment step</b><p>Book the trial, then record what worked: products and shades used, photos, notes. It becomes the look record for the day.</p></div></div>
    <div class="item"><span class="k">5</span><div><b>Assistant access</b><p>Assistants sign in and see only the profiles and timeline for the days they're assigned. Each artist gets her own schedule.</p></div></div>
    <div class="item"><span class="k">6</span><div><b>Calendar sync</b><p>Bookings and call times land in your Google or Apple calendar. The bride can add her morning schedule to hers.</p></div></div>
    <div class="item"><span class="k">7</span><div><b>Enquiry to booking, no re-typing</b><p>Your website's enquiry form feeds a leads list in the studio. One tap turns an enquiry into a client and sends the invite.</p></div></div>
    <div class="item"><span class="k">8</span><div><b>Receipts &amp; year-end export</b><p>A branded receipt emails itself when you mark a payment received. One export of the year's payments for your accountant.</p></div></div>
    <div class="item"><span class="k">9</span><div><b>Date availability on your website</b><p>Visitors check whether their date is open before enquiring, straight from your bookings.</p></div></div>
    <div class="item"><span class="k">10</span><div><b>After-the-event follow-up</b><p>A thank-you note, a Google review request and a photo-consent reminder, sent on a schedule you set.</p></div></div>
    <div class="item"><span class="k">11</span><div><b>Messages in one place</b><p>A thread per client inside the portal, so questions stop scattering across DMs, texts and email. You get an email when she writes.</p></div></div>
    <div class="item"><span class="k">12</span><div><b>Agreement amendments</b><p>When the party size or services change, issue an addendum with the new amounts for a fresh e-signature.</p></div></div>
    <div class="item"><span class="k">13</span><div><b>Travel distance helper</b><p>Distance from your base to the getting-ready address, shown when you set the travel fee. The fee is always yours to decide.</p></div></div>
    <div class="item"><span class="k">14</span><div><b>Studio insights</b><p>Bookings by month, booked versus collected, and where your brides come from.</p></div></div>
  </div>
  <div class="band"><b>And anything can come out.</b><p>The party share link, the approval step, prep guides, the timeline builder, client-type flags, private notes: if a piece doesn't fit how you work, we leave it out. The portal should feel like your studio, not a piece of software.</p></div>
  ${foot('What we can add or change')}
</section>`)

/* Page 2 — at a glance */
pages.push(`<section class="page">
  ${head({ title: 'What the portal does, at a glance', intro: 'Two sides of one system: a private portal for each bride, and a studio dashboard for you. Everything lives on your own website address.' })}
  <div class="two">
    <div>
      <div class="eyebrow" style="margin-bottom:.1in">For each bride</div>
      <ul class="list">
        <li><b>Personal invite link.</b> She sets a password once; no account to hunt for.</li>
        <li><b>A six-step journey</b> that unlocks in order: agreement, retainer, intake, guides, timeline, final payment.</li>
        <li><b>E-signed service agreement</b> with her booking details and amounts frozen in, plus a printable copy.</li>
        <li><b>Retainer and balance</b> with e-transfer instructions and live status.</li>
        <li><b>Intake that saves as she types:</b> event details, her own look profile, and a profile for every person being styled.</li>
        <li><b>Photo uploads</b> for a current selfie plus makeup and hair inspiration, stored privately.</li>
        <li><b>One shareable party link</b> so bridesmaids and mom fill in their own details. No accounts for them.</li>
        <li><b>Documents on demand:</b> signed agreement, hair guide, skin guide, and her getting-ready timeline, each unlocked at the right moment.</li>
        <li><b>Notes from you</b> when something needs a second look, right on her intake.</li>
        <li><b>Built for her phone.</b> Every screen is designed at phone width first.</li>
      </ul>
    </div>
    <div>
      <div class="eyebrow" style="margin-bottom:.1in">For you</div>
      <ul class="list">
        <li><b>Add a booking in a minute.</b> Name, date, address, party size, your quote. The retainer and balance calculate themselves.</li>
        <li><b>Invite link, copied or emailed,</b> and re-issued with one tap if it expires.</li>
        <li><b>Clients list</b> sorted by event date with days-to-go, invite status, and past or archived clients tucked away.</li>
        <li><b>Review queue.</b> Every signed agreement, intake and party profile lands here. Approve, or request changes with a note she sees.</li>
        <li><b>Email alert</b> the moment a bride submits something.</li>
        <li><b>Per-client workspace</b> with tabs: overview, intake, agreement, timeline, documents, payments, private notes.</li>
        <li><b>Timeline builder:</b> time slots by artist and person, notes for a smooth morning, publish when ready, or attach your own PDF.</li>
        <li><b>Mark payments received</b> and the bride's journey updates itself. The prep guides unlock automatically.</li>
        <li><b>Private notes and an easy / medium / hard flag</b> the client never sees.</li>
        <li><b>Archive or permanently delete</b> a client, photos included.</li>
        <li><b>Automatic weekly backups</b> and password resets that just work.</li>
      </ul>
    </div>
  </div>
  <div class="band" style="margin-top:auto"><b>Under the hood, briefly.</b><p>Each bride can only ever see her own data. Photos are in private storage and open through short-lived links. Party links expire and can be switched off. Deleting a client erases every form, photo and login, which keeps you onside with Canadian privacy law (PIPEDA). Portal pages are hidden from Google.</p></div>
  ${foot('At a glance')}
</section>`)

/* Page 3 — the journey */
const rows = [
  ['1', 'Enquiry', 'Bride enquires through your website or Instagram. You quote her the way you always do.', 'She hears back from you, as today.'],
  ['2', 'Booking', 'You add her in the studio: date, address, party size, your quote. The portal creates her retainer and balance, and her invite link.', 'She receives a welcome email with a personal link, valid for 7 days.'],
  ['3', 'Registration', 'Nothing to do. Her card in your list changes from "Invite pending" to registered.', 'She opens the link, chooses a password, and lands on her journey.'],
  ['4', 'Agreement', 'A "Signed agreement" item appears in your review queue and you get an email. One tap confirms it.', 'She reads the agreement with her details filled in, chooses photo consent, types her name, signs.'],
  ['5', 'Retainer', 'The e-transfer arrives in your bank. You mark it received. Her prep guides unlock on their own.', 'She sends 30% by e-transfer to the address shown. Her step turns green when you confirm.'],
  ['6', 'Intake', 'Nothing yet. You can watch profiles arrive as the party fills them in.', 'She completes event details, her own look profile with photos, and adds her party, or shares the party link so each person does their own.'],
  ['7', 'Review', 'Everything she submitted is in your queue. Approve, or request changes with a note. Approve all in one tap.', 'She sees "Awaiting review", then "Approved", or your note with a "Revise my answers" button.'],
  ['8', 'Preparation', 'You build her getting-ready timeline slot by slot, preview it, and publish. You can add a private note about her party.', 'Her hair and skin guides are in Documents. Her timeline appears once you publish.'],
  ['9', 'Final payment', 'You mark the balance received. Her journey is complete.', 'She sends the balance before the day. Every document stays available to her.'],
  ['10', 'After the day', 'Archive her, or delete her permanently if she asks. A weekly backup runs on its own.', 'Her portal stays open for the signed agreement and documents.'],
]
pages.push(`<section class="page">
  ${head({ title: 'The journey, from first enquiry to the wedding morning', intro: 'What happens on your side and on the bride\'s side at each step. Each step is shown on the pages that follow.' })}
  <div class="journey">
    <div class="hd">Step</div><div class="hd">You, in the studio</div><div class="hd">The bride, in her portal</div>
    ${rows.map(([n, t, a, b]) => `<div class="row"><div class="st">${n}<span>${esc(t)}</span></div><div>${esc(a)}</div><div>${esc(b)}</div></div>`).join('')}
  </div>
  ${foot('The journey')}
</section>`)

/* Step pages */
pages.push(
  await sidePage({
    label: 'Step 2 · Booking',
    step: 'Step 2 · Booking',
    title: 'Add a booking in a minute',
    intro: 'You enter what you already know from the enquiry. The portal does the arithmetic and prepares her invite.',
    images: [{ src: 'admin-client-new', cap: 'Studio › New client. Three short groups: client, event, quote.' }],
    notes: [
      { b: 'Your quote, your numbers', p: 'You type professional services and travel. Retainer (30%) and balance are calculated and shown before you save. The percentage is yours to change.' },
      { b: 'One button does the rest', p: '"Create client &amp; invite link" creates her record, her two payment lines, her four document slots, her own profile, and emails her the invite.' },
      { b: 'No duplicates', p: 'A second client with the same email is stopped with a clear message.' },
      { b: 'Edit any time', p: 'Everything here can be changed later from the client\'s Overview tab. Amounts already signed for stay frozen in the agreement.' },
    ],
  })
)
pages.push(
  await stackPage({
    label: 'Step 2 · Invite',
    step: 'Step 2 · The invite',
    title: 'Her personal link, copied or emailed',
    intro: 'The moment a booking is created you see her invite link. The same link goes to her inbox in a branded email.',
    images: [
      { src: 'admin-client-created', cap: 'Studio › Client created. Copy the link to paste into WhatsApp, or open her client page.', flex: 1.6 },
      { src: 'email-invite', cap: 'The welcome email she receives, in your brand.', flex: 1 },
    ],
    h: 4.9,
    notes: [
      { b: 'Links expire in 7 days', p: 'A used or expired link stops working. From her Overview tab, "New invite link" issues a fresh one and emails it again.' },
      { b: 'Sent from your address', p: 'Emails go out from your own domain, so they arrive in her inbox rather than junk.' },
      { b: 'Copy for WhatsApp', p: 'Most brides reply on WhatsApp or Instagram. The copy button gives you the link to paste wherever the conversation is.' },
    ],
  })
)
pages.push(
  await stackPage({
    label: 'Step 3 · Registration',
    step: 'Step 3 · Registration',
    title: 'She sets a password and she is in',
    intro: 'The invite opens a page with her email already filled in. She chooses a password and lands on her journey.',
    images: [
      { src: 'client-join', cap: 'Join page from the invite link. Email is fixed; she only chooses a password.' },
      { src: 'client-login', cap: 'Client sign-in for every visit after, with "Forgot password" built in.' },
      { src: 'phone-login', cap: 'On her phone.', phone: true, flex: 0.45 },
    ],
    h: 4.6,
    notes: [
      { b: 'Nothing to remember but a password', p: 'Her email is her login. Password resets are emailed automatically and land her back in the portal.' },
      { b: 'Two doors, one design', p: 'Clients sign in at /portal, you sign in at /admin. Each page links to the other in case someone lands on the wrong one.' },
      { b: 'Hidden from search', p: 'Every portal page tells Google not to index it. Only your marketing pages are public.' },
    ],
  })
)
pages.push(
  await stackPage({
    label: 'The journey',
    step: 'Steps 4 to 9',
    title: 'Her journey, six steps that unlock in order',
    intro: 'This is the page she lands on every time. Locked steps are greyed out until the one before is done, so she always knows what is next.',
    images: [
      { src: 'client-journey-fresh', cap: 'Day one: only the agreement is open.' },
      { src: 'client-journey-mid', cap: 'Later: agreement and retainer done, intake awaiting your review, guides and timeline unlocked.' },
      { src: 'phone-journey', cap: 'The same page at phone width.', phone: true, flex: 0.42 },
    ],
    h: 4.9,
    notes: [
      { b: 'Status chips, not emails', p: '"To do", "Awaiting review", "Done", "Changes requested". She sees where things stand without messaging you.' },
      { b: 'Order you control', p: 'Retainer opens after signing. Intake opens after signing. Guides open when the retainer arrives. Timeline opens when you publish it.' },
      { b: 'Her event, front and centre', p: 'Her name, event type and date sit at the top so the portal always feels like hers.' },
    ],
  })
)
pages.push(
  await stackPage({
    label: 'Step 4 · Agreement',
    step: 'Step 4 · Agreement',
    title: 'E-signed, with her details filled in',
    intro: 'Your terms, her booking details and her amounts on one page. She chooses photo consent, types her name as a signature, and signs.',
    h: 6.45,
    images: [
      { src: 'client-agreement-signing', cap: 'Signing view: booking, investment, terms, then consent, typed signature and acknowledgement.' },
      { src: 'client-agreement-signed', cap: 'After signing: a signature record with date and time, and "Print / Save as PDF".' },
    ],
    notes: [
      { b: 'Amounts frozen at signing', p: 'The agreement stores a snapshot of her name, date, address, party size and every amount. Changing the booking later never alters what she signed.' },
      { b: 'Photo consent captured', p: '"I agree" or "keep my photos private" is recorded with the signature, so you know before posting.' },
      { b: 'Evidence kept', p: 'Signed name, timestamp, IP address and device are stored with each signature. Terms are versioned, so old agreements always show the terms she agreed to.' },
      { b: 'Lands in your queue', p: 'A signed agreement appears in your review queue and emails you. One tap confirms it and her chip turns to "Signed &amp; confirmed".' },
    ],
  })
)
pages.push(
  await stackPage({
    label: 'Step 4 · Agreement',
    step: 'Step 4 · Your side',
    title: 'Confirm it from the client page',
    intro: 'Her signed agreement is summarised on the Agreement tab. You confirm it here or from the queue.',
    images: [{ src: 'admin-client-agreement', cap: 'Studio › Client › Agreement, awaiting your confirmation.' }],
    h: 4.9,
    notes: [
      { b: 'Everything on one card', p: 'Who signed, when, photo consent, IP, total, retainer and balance.' },
      { b: 'Versioned', p: 'If she ever re-signs after a change, the new version sits on top and older versions are kept.' },
      { b: 'Nothing to file', p: 'The signed copy is in her Documents and in your client page, forever, without a PDF to lose.' },
    ],
  })
)
pages.push(
  await stackPage({
    label: 'Step 5 · Retainer',
    step: 'Step 5 · Retainer',
    title: 'E-transfer instructions and live status',
    intro: 'The payments page shows her the amount, your e-transfer address and what to write in the message. You mark it received when it lands.',
    images: [
      { src: 'client-payments', cap: 'Her Payments page: retainer received, balance due, with e-transfer details.', flex: 1.3 },
      { src: 'phone-payments', cap: 'On her phone.', phone: true, flex: 0.42 },
      { src: 'admin-client-payments', cap: 'Studio › Client › Payments: edit the amount, "Mark received", undo if needed.', flex: 1.3 },
    ],
    h: 4.7,
    notes: [
      { b: 'No screenshots of e-transfers', p: 'She sends the transfer and waits. When you mark it received, her step completes and the date on the receipt shows on her page.' },
      { b: 'Unlocks the next step for you', p: 'Marking the retainer received publishes the hair and skin guides to her automatically. You can hide them again any time.' },
      { b: 'Balance stays locked until then', p: 'The final balance card only opens after the retainer arrives, so she is never asked for the wrong payment.' },
    ],
  })
)
pages.push(
  await sidePage({
    label: 'Step 6 · Intake',
    step: 'Step 6 · Intake',
    title: 'One form for the event, her look and her party',
    intro: 'Event details, her own profile and everyone being styled, in a form that saves as she types. She submits when she is ready.',
    images: [
      { src: 'client-intake-draft', cap: 'Her intake while editing: event details, her profile card, party list, and "Submit to Arsh".' },
      { src: 'phone-intake', cap: 'On her phone.', phone: true, flex: 0.5 },
    ],
    notes: [
      { b: 'Pre-filled from the booking', p: 'Event type, date, address, call time and phone are already there from what you entered. She only corrects and adds.' },
      { b: 'Saves as she goes', p: 'Autosave every couple of seconds with a "Saved" indicator. She can fill it over several evenings.' },
      { b: 'Her party, two ways', p: '"Add person" lets her fill in a bridesmaid herself. "Share a link" lets each person do their own (next pages).' },
      { b: 'Submit, then still edit', p: 'Once approved, "Make changes" opens a new version. Edited profiles quietly go back into your queue for a re-check.' },
    ],
  })
)
pages.push(
  await sidePage({
    label: 'Step 6 · Look profile',
    step: 'Step 6 · The look profile',
    title: 'What you need to prepare each face and head of hair',
    intro: 'The same profile form is used for the bride, for every party member, for the public party link, and for your own edits.',
    images: [
      { src: 'client-profile-bride', cap: 'Her profile: services, skin type, hair length and texture, likes and dislikes, foundation, allergies, photos.' },
      { src: 'phone-profile', cap: 'Tap-sized choice buttons on a phone.', phone: true, flex: 0.5 },
    ],
    notes: [
      { b: 'Tap, don\'t type', p: 'Skin type, hair length, hair texture and services are one-tap choices sized for thumbs.' },
      { b: 'The details that matter on the day', p: 'Foundation brand and shade if known, allergies and sensitivities, skin concerns, likes and deal-breakers.' },
      { b: 'Photos in four slots', p: 'Selfie or current look, makeup inspiration, hair inspiration, and extras. Up to six each, uploaded from the camera roll or pasted as a Pinterest link. Photos are shrunk on the phone before upload so they are quick.' },
      { b: 'Private by design', p: 'Photos live in private storage and open through links that expire in an hour. Only the bride and you can see them.' },
    ],
  })
)
pages.push(
  await sidePage({
    label: 'Step 6 · Party link',
    step: 'Step 6 · The party link',
    title: 'One link for the whole bridal party',
    intro: 'The bride shares a single link. Each bridesmaid, mom or sister fills in her own profile and photos in about three minutes. No accounts, no passwords.',
    images: [
      { src: 'party-form', cap: 'The public party form a bridesmaid sees. Same fields as the bride\'s profile, with a plain-language privacy note above the button.' },
      { src: 'phone-party', cap: 'Where most of them will fill it in.', phone: true, flex: 0.5 },
    ],
    notes: [
      { b: 'Their details go straight to the intake', p: 'A submitted profile appears in the bride\'s party list and in your review queue at the same moment.' },
      { b: 'Expires and can be switched off', p: 'The link expires 30 days after the event date. The bride can turn it off any time and make a new one.' },
      { b: 'Privacy handled', p: 'A purpose statement and privacy policy link sit above "Send my details". The party member can ask for her details to be removed, and the bride or you can delete any profile, photos included.' },
    ],
  })
)
pages.push(
  await stackPage({
    label: 'Step 6 · Party link',
    step: 'Step 6 · The party link',
    title: 'The bride manages it, you never have to',
    intro: 'Creating, copying and revoking the link happens on her side. Submissions are listed as they arrive.',
    images: [
      { src: 'client-party-link', cap: 'Her Party Link page: live link, copy, turn off, and who has submitted so far.', flex: 1.5 },
      { src: 'party-done', cap: 'The thank-you a bridesmaid sees after sending.', flex: 1 },
    ],
    h: 4.6,
    notes: [
      { b: 'Copy and paste into the group chat', p: 'A single "Copy link" button. Brides typically drop it in the bridesmaids\' WhatsApp group.' },
      { b: 'Nothing for them to install', p: 'Bridesmaids never create an account. The link is the whole experience.' },
      { b: 'Visible progress', p: 'She sees each submitted name with its status, and can open any profile to tidy it up before you review.' },
    ],
  })
)
pages.push(
  await stackPage({
    label: 'Step 7 · Review',
    step: 'Step 7 · Review',
    title: 'Everything she submits waits for you in one queue',
    intro: 'Signed agreements, intake forms and party profiles arrive here grouped by bride. You approve, or ask for changes with a note.',
    images: [
      { src: 'email-alert', cap: 'The alert you receive. One email per submission burst, not one per profile.', flex: 0.9 },
      { src: 'admin-queue-request', cap: 'Studio › Review, with "Request changes" open on an intake.', flex: 1.6 },
      { src: 'phone-admin-queue', cap: 'The queue on your phone.', phone: true, flex: 0.42 },
    ],
    h: 4.7,
    notes: [
      { b: 'Three buttons', p: '"View" opens her page on the right tab. "Approve" confirms it. "Request changes" sends a note she sees on her intake.' },
      { b: 'Approve all', p: 'When a whole party lands at once, one button approves every item for that bride.' },
      { b: 'A live badge', p: 'The Review tab shows how many items are waiting, on every studio page.' },
    ],
  })
)
pages.push(
  await stackPage({
    label: 'Step 7 · Review',
    step: 'Step 7 · Review',
    title: 'Your note lands on her intake',
    intro: 'A change request is not an email she has to find. It sits at the top of her intake with a button to revise, and her step shows "Changes requested".',
    h: 6.45,
    images: [
      { src: 'client-intake-changes', cap: 'Her intake with your note and "Revise my answers".' },
      { src: 'admin-client-intake', cap: 'Studio › Client › Intake: her event details, the review box, and every profile with its status.' },
    ],
    notes: [
      { b: 'Review from her page too', p: 'The Intake tab has the same approve and request-changes controls, next to the answers, so you can read then decide.' },
      { b: 'Per-profile approval', p: 'Each party member has her own status. Approve one at a time or "Approve all pending profiles".' },
      { b: 'Edits re-queue themselves', p: 'If a bride edits an approved profile, it returns to "Awaiting review" on its own. Nothing slips past you.' },
      { b: 'You can edit any profile', p: 'Open a profile and fix a typo, add a note, or upload a trial photo yourself.' },
    ],
  })
)
pages.push(
  await sidePage({
    label: 'Step 7 · Profiles',
    step: 'Step 7 · Review',
    title: 'Every profile, with photos, in your studio',
    intro: 'Open a party member from the Intake tab to see exactly what she filled in, with her photos, and approve from the same screen.',
    images: [{ src: 'admin-client-profile', cap: 'Studio › Client › Intake › Priya (Bride). Editable, with "Save profile" and "Approve".' }],
    notes: [
      { b: 'The same form you already know', p: 'Bride, party member, party link and your own edits all use one form, so nothing is ever in a different place.' },
      { b: 'Trial-day ready', p: 'Keep the phone open on this page during the trial: skin, hair, foundation, allergies and inspiration are all there.' },
      { b: 'Photos in full', p: 'Tap any thumbnail to see it large. Links to Pinterest open in a new tab.' },
      { b: 'Add-on idea', p: 'The trial step on page 1 would add a "products and shades used" record and trial photos here.' },
    ],
  })
)
pages.push(
  await stackPage({
    label: 'Step 8 · Guides',
    step: 'Step 8 · Preparation',
    title: 'Hair and skin guides, unlocked at the right moment',
    intro: 'Your preparation guides live in her Documents and unlock when the retainer arrives. Branded, on-screen, and printable.',
    images: [
      { src: 'client-docs', cap: 'Her Documents page: only what you have made visible appears.', flex: 1.4 },
      { src: 'client-hair-guide', cap: 'Hair preparation guide, with a checklist.', flex: 0.8 },
      { src: 'client-skin-guide', cap: 'Skin preparation guide.', flex: 0.8 },
    ],
    h: 5.2,
    notes: [
      { b: 'Written once, in your words', p: 'We put your guidance in: night-before washing, no product, button-down top, no new skincare that week, and so on.' },
      { b: 'You decide what she sees', p: 'The Docs tab on her client page toggles each document visible or hidden with one tap.' },
      { b: 'Print / Save as PDF', p: 'Every document has a print button, and the page prints cleanly without the portal frame.' },
    ],
  })
)
pages.push(
  await stackPage({
    label: 'Step 8 · Timeline',
    step: 'Step 8 · Preparation',
    title: 'Build her getting-ready timeline slot by slot',
    intro: 'Time, artist, person, service. Add rows, add notes for a smooth morning, preview it as she will see it, then publish.',
    h: 6.45,
    images: [
      { src: 'admin-client-timeline', cap: 'Studio › Client › Timeline: the editor, hidden from the client until you publish.' },
      { src: 'admin-client-timeline-preview', cap: 'Preview, exactly as she will see it.' },
    ],
    notes: [
      { b: 'Grouped by artist', p: 'Rows are grouped under each artist automatically, so an assistant\'s slots read as their own schedule.' },
      { b: 'Save draft, publish, hide', p: 'Work on it over a few days. Publish when it is final. Hide it again if the plan changes.' },
      { b: 'Or attach your PDF', p: 'Prefer your own designed timeline? Attach a PDF instead and she gets a button to open it.' },
      { b: 'Ready-by time on top', p: 'Her name, date and ready-by time head the document, with your contact details at the foot.' },
    ],
  })
)
pages.push(
  await stackPage({
    label: 'Step 8 · Timeline',
    step: 'Step 8 · Preparation',
    title: 'What she sees the night before',
    intro: 'Her timeline appears as step five on her journey and in her Documents, on her phone, printable for the getting-ready suite.',
    images: [
      { src: 'client-timeline', cap: 'Her timeline: every slot by artist, and your notes for a smooth morning.', flex: 1.5 },
      { src: 'phone-timeline', cap: 'On her phone.', phone: true, flex: 0.42 },
      { src: 'admin-client-docs', cap: 'Studio › Client › Docs: which documents are visible to her right now.', flex: 1.5 },
    ],
    h: 4.7,
    notes: [
      { b: 'Everyone on the same page', p: 'The bride can print it or screenshot it for her party. No more "what time am I?" messages.' },
      { b: 'Your notes travel with it', p: '"Arrive with clean, dry, product-free hair", "breakfast and water on hand", or whatever you always have to repeat.' },
      { b: 'One toggle per document', p: 'Agreement, timeline, hair guide, skin guide: visible or hidden, per client.' },
    ],
  })
)
pages.push(
  await stackPage({
    label: 'Steps 9 and 10',
    step: 'Steps 9 and 10 · Final payment and after',
    title: 'Close the booking, keep the record',
    intro: 'Mark the balance received and her journey is complete. Afterwards, archive her, or erase everything if she asks.',
    images: [
      { src: 'admin-client-overview', cap: 'Studio › Client › Overview: portal access, every booking field, client type, then Save, Archive, or Delete permanently.', flex: 1 },
      { src: 'admin-client-notes', cap: 'Private notes. Only you ever see these.', flex: 1.2 },
    ],
    h: 4.9,
    notes: [
      { b: 'Balance, same as retainer', p: 'The Payments tab has the same "Mark received" for the final balance. Her last step turns green.' },
      { b: 'Archive keeps, delete erases', p: 'Archive tucks her under "past &amp; archived" with everything intact. "Delete permanently" removes every form, photo and her login, after two confirmations.' },
      { b: 'Notes and a quiet flag', p: 'Preferences, reminders, and an easy / medium / hard client type that shows as a small dot on your clients list. Never visible to her.' },
    ],
  })
)
pages.push(
  await stackPage({
    label: 'Your studio',
    step: 'Your studio',
    title: 'Your clients, sorted by what is coming next',
    intro: 'The studio home is a list of upcoming events with days to go. Past and archived clients are one tap away.',
    images: [
      { src: 'admin-clients', cap: 'Studio › Clients. Invite status, event summary, days to go, and the client-type dot.', flex: 1.6 },
      { src: 'phone-admin-clients', cap: 'On your phone.', phone: true, flex: 0.42 },
      { src: 'admin-settings', cap: 'Studio › Settings: e-transfer address shown to brides, where alerts go, your password.', flex: 1.2 },
    ],
    h: 4.9,
    notes: [
      { b: 'Built for a phone in one hand', p: 'Every studio page works at phone width, so you can approve a profile between clients.' },
      { b: 'Settings you own', p: 'Change your e-transfer address or alert email yourself. No developer needed.' },
      { b: 'Sign-in, kept simple', p: 'Email and password, with a reset link that emails itself. Passwords are changed from Settings.' },
    ],
  })
)
pages.push(
  await stackPage({
    label: 'Her settings',
    step: 'Her side',
    title: 'Her settings, and a reset that just works',
    intro: 'The bride can update her phone number and change her password. Name and email changes go through you, so records stay clean.',
    images: [
      { src: 'client-settings', cap: 'Her Settings page.', flex: 1.3 },
      { src: 'client-reset', cap: 'The page a password-reset email opens.', flex: 1.3 },
    ],
    h: 4.9,
    notes: [
      { b: 'Less to support', p: 'Forgotten passwords, the most common support message, resolve themselves by email.' },
      { b: 'Clean records', p: 'Because her email is her login and appears on the agreement, only you can change it.' },
      { b: 'Sign out everywhere', p: 'Sign out is one tap on every page, for shared family tablets and laptops.' },
    ],
  })
)

/* Closing page */
pages.push(`<section class="page">
  ${head({ title: 'Behind the scenes, and what happens next', intro: 'The parts you never see but would miss: security, privacy, backups, and how a build like this runs.' })}
  <div class="two">
    <div>
      <div class="eyebrow" style="margin-bottom:.1in">Security &amp; privacy</div>
      <ul class="list">
        <li><b>Each bride sees only her own data.</b> Enforced by the database itself, not just by the screens.</li>
        <li><b>Sensitive notes are separate.</b> Your private notes and client-type flags live in a table only you can read.</li>
        <li><b>Photos are private.</b> Stored in a private bucket and opened through links that expire after an hour.</li>
        <li><b>Party links are revocable and expiring.</b> Invite links are single-use and expire in 7 days.</li>
        <li><b>Erasure is real.</b> Deleting a client removes every form, photo and login, which is what PIPEDA expects when someone asks to be forgotten.</li>
        <li><b>Nothing indexed.</b> Every portal page is hidden from search engines.</li>
      </ul>
      <div class="eyebrow" style="margin:.2in 0 .1in">Reliability</div>
      <ul class="list">
        <li><b>Weekly automatic backups</b> of every table, kept for 12 weeks and emailed to you.</li>
        <li><b>Branded email</b> from your own domain for invites, alerts and password resets.</li>
        <li><b>Runs on managed cloud services</b> (Vercel and Supabase), so there is no server for anyone to babysit.</li>
      </ul>
    </div>
    <div>
      <div class="eyebrow" style="margin-bottom:.1in">How we would do this with you</div>
      <ul class="list">
        <li><b>1 · A short call.</b> We walk through this document, you tell us what you want in, out, and added.</li>
        <li><b>2 · Your brand and your words.</b> Colours, fonts, logo, your agreement terms and your prep guides.</li>
        <li><b>3 · Build.</b> We stand up your portal on your domain and load your first real booking together.</li>
        <li><b>4 · A test run.</b> You play the bride on your phone, we adjust wording and order until it feels like you.</li>
        <li><b>5 · Launch, then care.</b> We stay on hand for tweaks, keep backups running, and add the add-ons when you are ready.</li>
      </ul>
      <div class="band" style="margin-top:.25in"><b>A note on the screens in this document.</b><p>They are from the live portal we built for Arsh Sandhu Allure, shown with demo names and placeholder photos. Your portal would carry your brand, your terms and your wording from the first screen to the last.</p></div>
      <div class="band" style="margin-top:.14in;background:var(--warm)"><b>BitCarve Digital</b><p>Web design and custom portals for independent businesses, Greater Toronto Area.</p></div>
    </div>
  </div>
  ${foot('Next steps')}
</section>`)

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Client &amp; Admin Portal — Proposal for Kristen</title><style>${CSS}</style></head><body>${pages.join('\n')}</body></html>`
writeFileSync(OUT_HTML, html)

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } })
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, deviceScaleFactor: 1 })
const page = await ctx.newPage()
await page.goto(`file://${OUT_HTML}`, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(800)
await page.pdf({ path: OUT_PDF, format: 'Letter', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 }, preferCSSPageSize: false })
console.log('fonts:', await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family).filter((v, i, a) => a.indexOf(v) === i)))
// review renders of each page
mkdirSync('../../.pitch/pdfpages', { recursive: true })
const els = await page.$$('.page')
const overflow = await page.evaluate(() =>
  [...document.querySelectorAll('.page')].map((pg, i) => {
    const foot = pg.querySelector('.foot').getBoundingClientRect().top
    const max = Math.max(...[...pg.children].filter((c) => !c.classList.contains('foot')).map((c) => c.getBoundingClientRect().bottom))
    return max > foot - 4 ? `page ${i + 1} overflows by ${(max - foot).toFixed(0)}px` : null
  }).filter(Boolean)
)
console.log('overflow:', overflow.length ? overflow : 'none')
for (let i = 0; i < els.length; i++) await els[i].screenshot({ path: `../../.pitch/pdfpages/p${String(i + 1).padStart(2, '0')}.png` })
await browser.close()
console.log('wrote', OUT_PDF, 'pages', els.length)
