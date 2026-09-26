// Screenshots every client, party and studio screen against the mocked backend.
// Needs the Vite dev server on :5173 started with
//   VITE_SUPABASE_URL=http://mock.supabase VITE_SUPABASE_ANON_KEY=demo npx vite --port 5173
import { chromium } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { makeDb, CLIENT_ID, BRIDE_ID, KIRAN, INVOICE_ID, PARTY_TOKEN } from './fixtures.mjs'
import { attachMock, seedSession } from './mock.mjs'
import { REPLACEMENTS } from './brand.mjs'

const require = createRequire(import.meta.url)
const sharp = require('sharp')

const BASE = 'http://127.0.0.1:5173'
const OUT = fileURLToPath(new URL('../../.pitch/shots/', import.meta.url))
mkdirSync(OUT, { recursive: true })
const ONLY = process.argv[2] ? new RegExp(process.argv[2]) : null // e.g. node shoot.mjs admin

const DPR = 2
const DESKTOP = { width: 1180, height: 820 }
const PHONE = { width: 390, height: 844 }

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
  ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost,mock.supabase' } } : {}),
})

async function newCtx({ persona, viewport = DESKTOP, db = makeDb(), session = true }) {
  const state = { persona, db }
  const context = await browser.newContext({
    viewport, deviceScaleFactor: DPR, isMobile: viewport === PHONE, hasTouch: viewport === PHONE,
    locale: 'en-CA', timezoneId: 'America/Toronto', ignoreHTTPSErrors: true,
  })
  await context.route(/vercel-scripts|vitals\.vercel|\/_vercel\//, (r) => r.abort())
  attachMock(context, state)
  if (session) await seedSession(context, persona)
  context.setDefaultTimeout(15000)
  const page = await context.newPage()
  page.on('pageerror', (e) => console.log('  pageerror:', e.message.slice(0, 160)))
  return { context, page, state }
}

async function go(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
}

// swap the real studio's name and details for the placeholder brand
async function rebrand(page) {
  await page.evaluate((reps) => {
    const fix = (t) => reps.reduce((acc, [a, b]) => acc.split(a).join(b), t)
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const nodes = []
    while (walker.nextNode()) nodes.push(walker.currentNode)
    for (const n of nodes) {
      const v = fix(n.nodeValue)
      if (v !== n.nodeValue) n.nodeValue = v
    }
    for (const el of document.querySelectorAll('input, textarea')) {
      if (el.value) {
        const v = fix(el.value)
        if (v !== el.value) el.value = v
      }
      if (el.placeholder) el.placeholder = fix(el.placeholder)
    }
  }, REPLACEMENTS)
}

const skip = (name) => ONLY && !ONLY.test(name)

// Capture a screen. Full-page captures are cropped sideways to the content
// column; `regions` slices the page into named pieces between section headings:
//   { name, from: 'Section title' | 'top', to: 'Section title' | { text: 'Button label' } | 'bottom' }
async function shot(page, name, { full = true, regions = null, box = 'main', pad = 28, settle = 1200 } = {}) {
  if (skip(name)) return
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(settle)
  await rebrand(page)
  if (full) await page.addStyleTag({ content: '.fixed.bottom-0.inset-x-0{position:static!important}' })
  await page.waitForTimeout(200)
  const buf = await page.screenshot({ fullPage: full })
  if (!full) {
    writeFileSync(`${OUT}${name}.png`, buf)
    console.log('✓', name)
    return
  }
  const meta = await page.evaluate(
    ({ box, regions }) => {
      const sy = window.scrollY
      const bySection = (t) =>
        [...document.querySelectorAll('section')].find((s) => (s.querySelector('p')?.textContent || '').trim() === t)
      const byText = (t) => [...document.querySelectorAll('button, a, h1, h2, h3, p')].find((b) => b.textContent.trim() === t)
      const edge = (spec, side) => {
        if (spec === 'top') return 0
        if (spec === 'bottom') return document.documentElement.scrollHeight
        const el = typeof spec === 'string' ? bySection(spec) : byText(spec.text)
        if (!el) return null
        const r = el.getBoundingClientRect()
        return side === 'top' ? r.top + sy : r.bottom + sy
      }
      const boxEl = box ? document.querySelector(box) : null
      const br = boxEl?.getBoundingClientRect()
      return {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        left: br ? br.left : 0,
        right: br ? br.right : document.documentElement.scrollWidth,
        regions: (regions || []).map((r) => ({ name: r.name, top: edge(r.from, 'top'), bottom: edge(r.to, 'bottom') })),
      }
    },
    { box, regions },
  )
  const img = sharp(buf)
  const { width: W, height: H } = await img.metadata()
  const left = Math.max(0, Math.floor((meta.left - pad) * DPR))
  const right = Math.min(W, Math.ceil((meta.right + pad) * DPR))
  const cut = async (top, bottom, file) => {
    const t = Math.max(0, Math.floor(top * DPR))
    const b = Math.min(H, Math.ceil(bottom * DPR))
    await sharp(buf).extract({ left, top: t, width: right - left, height: b - t }).png().toFile(file)
  }
  if (!regions) {
    await cut(0, meta.height, `${OUT}${name}.png`)
    console.log('✓', name)
    return
  }
  for (const r of meta.regions) {
    if (r.top == null || r.bottom == null) {
      console.log('  ! region not found:', r.name)
      continue
    }
    await cut(r.top - 20, r.bottom + 16, `${OUT}${r.name}.png`)
    console.log('✓', r.name)
  }
}

/* --------------------------------------------------------- public pages */
{
  const { context, page } = await newCtx({ persona: 'client', session: false })
  await go(page, '/portal/login')
  await page.fill('input[type=email]', 'priya.sharma@example.com')
  await page.fill('input[type=password]', 'hunter2hunter2')
  await shot(page, 'client-login', { full: false })
  await go(page, '/admin/login')
  await shot(page, 'admin-login', { full: false })
  await go(page, '/join/Zt7Qm2VbKd9RxL4nHs8WcPy3AgEu1JfT')
  await page.waitForSelector('text=Create my login')
  await shot(page, 'client-join', { full: false })
  await go(page, '/portal/reset')
  await shot(page, 'client-reset', { full: false })

  await go(page, `/party/${PARTY_TOKEN}`)
  await page.waitForSelector('text=Send my details')
  await page.fill('input[placeholder="Full name"]', 'Neha Verma')
  await page.fill('input[placeholder="e.g. Sister, Mom, Bridesmaid"]', 'Bridesmaid')
  await page.locator('[aria-label="Events you’re getting ready for"] button', { hasText: 'Wedding' }).click()
  await page.locator('[aria-label="Events you’re getting ready for"] button', { hasText: 'Reception' }).click()
  await page.getByRole('button', { name: 'Hair & Makeup', exact: true }).click()
  await page.getByRole('button', { name: 'Long', exact: true }).click()
  await page.getByRole('button', { name: 'Curly', exact: true }).click()
  await page.getByRole('button', { name: 'Normal', exact: true }).click()
  await page.getByLabel('Likes & preferences').fill('Soft glam, glowy skin, a loose romantic wave.')
  await page.getByLabel('Dislikes / deal-breakers').fill('Nothing too heavy around the eyes.')
  await shot(page, 'party-form', { box: '.max-w-2xl' })
  await page.click('button:has-text("Send my details")')
  await page.waitForSelector('text=Thank')
  await shot(page, 'party-done', { full: false })
  await context.close()
}

/* ------------------------------------------------ client portal: day one */
{
  const { context, page } = await newCtx({ persona: 'client', db: makeDb('fresh') })
  await go(page, '/portal')
  await shot(page, 'client-home-fresh')
  await go(page, '/portal/agreement')
  await page.waitForSelector('text=Sign agreement')
  await page.getByText('I agree — my final look', { exact: false }).click()
  await page.getByLabel('Type your full legal name as your signature').fill('Priya Sharma')
  await page.locator('input[type=checkbox]').check()
  await shot(page, 'client-agreement-signing', {
    regions: [
      { name: 'agreement-booking', from: 'top', to: 'Your booking' },
      { name: 'agreement-fees', from: 'Fee schedule', to: 'Fee schedule' },
      { name: 'agreement-sign', from: 'Photography & promotion consent', to: 'Agreement & signature' },
    ],
  })
  await context.close()
}

/* ------------------------------------------- client portal: mid-journey */
{
  const { context, page, state } = await newCtx({ persona: 'client' })
  await go(page, '/portal')
  await shot(page, 'client-home')
  await go(page, '/portal/agreement')
  await shot(page, 'client-agreement-signed', {
    regions: [
      { name: 'agreement-signed-top', from: 'top', to: 'Your booking' },
      { name: 'agreement-signed-paid', from: 'Payments received', to: 'Payments received' },
      { name: 'agreement-signed-record', from: 'Signature record', to: 'Signature record' },
    ],
  })
  await go(page, '/portal/retainer')
  await shot(page, 'client-payments')
  await go(page, `/portal/invoice/${INVOICE_ID}`)
  await shot(page, 'client-invoice')
  await go(page, '/portal/intake')
  await shot(page, 'client-intake-pending', { regions: [{ name: 'client-intake-pending-top', from: 'top', to: '1 · About you' }] })

  // an open draft: some pre-filled answers still waiting for her check
  const intake = state.db.intakes[0]
  const E = intake.payload.events.map((e) => e.event_id)
  intake.status = 'draft'
  intake.payload._autofill = {
    [`events.${E[1]}.ready_time`]: 'new', [`events.${E[1]}.party_size`]: 'new',
    [`events.${E[2]}.event_date`]: 'new', [`events.${E[2]}.address`]: 'new', [`events.${E[2]}.party_size`]: 'saved',
  }
  state.db.party_members = state.db.party_members.map((m) => (m.is_bride ? { ...m, status: 'draft' } : m))
  await go(page, '/portal/intake')
  await shot(page, 'client-intake-draft', {
    regions: [
      { name: 'intake-events', from: 'top', to: '2 · Your events' },
      { name: 'intake-party', from: '3 · Your look', to: 'bottom' },
    ],
  })
  intake.status = 'changes_requested'
  intake.review_message = 'Could you double-check the getting-ready address for the wedding? The suite number looks new — I just want to be sure we come to the right room.'
  await go(page, '/portal/intake')
  await shot(page, 'client-intake-changes', { regions: [{ name: 'client-intake-changes', from: 'top', to: '1 · About you' }] })
  intake.status = 'pending'
  intake.review_message = null

  await go(page, `/portal/intake/member/${BRIDE_ID}`)
  await page.waitForSelector('img')
  await shot(page, 'client-profile-bride')
  await go(page, `/portal/intake/member/${KIRAN}`)
  await shot(page, 'client-profile-hair')
  await go(page, '/portal/party-link')
  await shot(page, 'client-party-link')
  await go(page, '/portal/docs')
  await shot(page, 'client-docs')
  await go(page, '/portal/docs/timeline')
  await page.locator('[aria-label="Choose an event"] button', { hasText: 'Wedding' }).click()
  await shot(page, 'client-timeline')
  await go(page, '/portal/docs/hair_guide')
  await shot(page, 'client-hair-guide')
  await go(page, '/portal/docs/skin_guide')
  await shot(page, 'client-skin-guide')
  await go(page, '/portal/settings')
  await shot(page, 'client-settings')
  await context.close()
}

/* ---------------------------------------------------------------- studio */
{
  const { context, page, state } = await newCtx({ persona: 'admin' })
  await go(page, '/admin')
  await page.click('text=Past & archived')
  await shot(page, 'admin-clients')

  await go(page, '/admin/clients/new')
  await page.getByLabel('Full name').fill('Simran Gill')
  await page.getByLabel('Phone').fill('+1 (905) 555-0187')
  await page.getByLabel('Email').fill('simran.gill@example.com')
  await page.getByLabel('Event date').fill('2026-10-03')
  await page.getByLabel('Party size (people styled)').fill('4')
  await page.getByLabel('Artist arrives / start time').fill('11:00')
  await page.getByLabel('Everyone ready by').fill('15:00')
  await page.getByLabel('Getting-ready address').fill('12 Queen St W, Brampton')
  await page.getByRole('button', { name: '+ Add service' }).click()
  await page.getByRole('button', { name: '+ Add service' }).click()
  const svc = page.locator('label:has(> span:text-is("Service")) select')
  await svc.nth(0).selectOption('bridal_hm')
  await page.locator('label:has(> span:text-is("How many")) input').nth(1).fill('3')
  await page.locator('div.grid:has(> p:text-is("Travel")) input[placeholder="—"]').fill('80')
  await shot(page, 'admin-client-new', {
    regions: [
      { name: 'new-client-top', from: 'top', to: 'Events' },
      { name: 'new-client-event', from: 'Event details', to: 'Services booked' },
      { name: 'new-client-prices', from: 'Service prices', to: 'Booking summary' },
    ],
  })
  await page.click('button:has-text("Create client & send invite")')
  await page.waitForSelector('text=Client created')
  await shot(page, 'admin-client-created', { settle: 600 })

  // a fee was added after she signed, so the studio sees the warning
  const signed = state.db.agreements[0].snapshot
  const realTotal = signed.totals.total
  signed.totals.total = realTotal - 100
  await go(page, `/admin/clients/${CLIENT_ID}?tab=overview`)
  await shot(page, 'admin-overview', {
    regions: [
      { name: 'overview-top', from: 'top', to: 'Client type' },
      { name: 'overview-events', from: 'Events', to: 'Booking summary' },
    ],
  })
  await page.getByRole('button', { name: /Event 2 of 3/ }).click()
  await shot(page, 'admin-overview-event', {
    regions: [
      { name: 'overview-event-details', from: { text: 'Duplicate' }, to: 'Services booked' },
      { name: 'overview-event-prices', from: 'Service prices', to: 'Event total' },
    ],
  })
  signed.totals.total = realTotal

  await go(page, `/admin/clients/${CLIENT_ID}?tab=intake`)
  await shot(page, 'admin-intake', {
    regions: [
      { name: 'admin-intake-events', from: 'top', to: 'Event details' },
      { name: 'admin-intake-profiles', from: 'About her', to: 'bottom' },
    ],
  })
  await go(page, `/admin/clients/${CLIENT_ID}?tab=intake&member=${BRIDE_ID}`)
  await page.waitForSelector('img')
  await shot(page, 'admin-profile')

  state.db.agreements[0].status = 'signed'
  await go(page, `/admin/clients/${CLIENT_ID}?tab=agreement`)
  await shot(page, 'admin-agreement', { regions: [{ name: 'admin-agreement', from: 'top', to: 'Signature record' }] })
  state.db.agreements[0].status = 'approved'

  await go(page, `/admin/clients/${CLIENT_ID}?tab=timeline`)
  await page.locator('[aria-label="Choose an event"] button', { hasText: 'Wedding' }).click()
  await page.waitForTimeout(600)
  await shot(page, 'admin-timeline', {
    regions: [
      { name: 'timeline-setup', from: 'top', to: { text: 'Auto generate' } },
      { name: 'timeline-build', from: 'Build the day', to: 'Build the day' },
      { name: 'timeline-bar', from: 'Notes for a smooth morning', to: 'bottom' },
    ],
  })
  await go(page, `/admin/clients/${CLIENT_ID}?tab=timeline`)
  await page.locator('[aria-label="Choose an event"] button', { hasText: 'Wedding' }).click()
  await page.waitForTimeout(600)
  const brick = page.locator('[aria-label^="Priya Sharma — press to edit"]').first()
  await brick.scrollIntoViewIfNeeded()
  await brick.click()
  await page.waitForSelector('[role=dialog]')
  await shot(page, 'admin-brick-editor', { full: false, settle: 500 })
  await page.keyboard.press('Escape')

  await go(page, `/admin/clients/${CLIENT_ID}?tab=docs`)
  await shot(page, 'admin-docs')
  await go(page, `/admin/clients/${CLIENT_ID}?tab=payments`)
  await shot(page, 'admin-payments', {
    regions: [
      { name: 'admin-payments-top', from: 'top', to: 'Final balance' },
      { name: 'admin-payments-other', from: 'Other payments', to: 'Payment history' },
      { name: 'admin-invoices', from: 'New invoice', to: 'bottom' },
    ],
  })
  await go(page, `/admin/clients/${CLIENT_ID}?tab=notes`)
  await shot(page, 'admin-notes')

  await go(page, '/admin/queue')
  await shot(page, 'admin-queue')
  await page.locator('button', { hasText: 'Request changes' }).first().click()
  await page.getByLabel('Message to Priya').fill('Could you add a clearer selfie in daylight? It helps me match your shade.')
  await shot(page, 'admin-queue-request')

  await go(page, '/admin/settings')
  await shot(page, 'admin-settings', {
    regions: [
      { name: 'admin-settings-top', from: 'top', to: 'Business' },
      { name: 'admin-price-list', from: 'Price list', to: 'Price list' },
    ],
  })
  await context.close()
}

/* ----------------------------------------------------------------- phone */
{
  const { context, page } = await newCtx({ persona: 'client', viewport: PHONE })
  for (const [name, path] of [
    ['phone-home', '/portal'],
    ['phone-intake', '/portal/intake'],
    ['phone-payments', '/portal/retainer'],
    ['phone-agreement', '/portal/agreement'],
  ]) {
    await go(page, path)
    await shot(page, name, { full: false })
  }
  await go(page, `/portal/intake/member/${BRIDE_ID}`)
  await page.waitForSelector('img')
  await page.evaluate(() => window.scrollTo(0, 260))
  await shot(page, 'phone-profile', { full: false })
  await go(page, '/portal/docs/timeline')
  await page.locator('[aria-label="Choose an event"] button', { hasText: 'Wedding' }).click()
  await page.evaluate(() => window.scrollTo(0, 330))
  await shot(page, 'phone-timeline', { full: false })
  await context.close()
}
{
  const { context, page } = await newCtx({ persona: 'client', viewport: PHONE, session: false })
  await go(page, `/party/${PARTY_TOKEN}`)
  await page.waitForSelector('text=Send my details')
  await shot(page, 'phone-party', { full: false })
  await go(page, '/portal/login')
  await shot(page, 'phone-login', { full: false })
  await context.close()
}
{
  const { context, page } = await newCtx({ persona: 'admin', viewport: PHONE })
  await go(page, '/admin/queue')
  await shot(page, 'phone-admin-queue', { full: false })
  await go(page, '/admin')
  await shot(page, 'phone-admin-clients', { full: false })
  await go(page, `/admin/clients/${CLIENT_ID}?tab=payments`)
  await shot(page, 'phone-admin-payments', { full: false })
  await context.close()
}

await browser.close()
console.log('done')
