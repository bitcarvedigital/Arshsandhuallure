import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { makeDb, CLIENT_ID, BRIDE_ID, M3, PARTY_TOKEN } from './fixtures.mjs'
import { attachMock, seedSession } from './mock.mjs'

const BASE = 'http://127.0.0.1:5173'
const OUT = '../../.pitch/shots'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  proxy: { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost,mock.supabase' },
})

const DESKTOP = { width: 1180, height: 820 }
const PHONE = { width: 390, height: 844 }

async function newCtx({ persona, viewport = DESKTOP, db = makeDb(), session = true }) {
  const state = { persona, db }
  const context = await browser.newContext({
    viewport,
    ignoreHTTPSErrors: true,
    deviceScaleFactor: 2,
    isMobile: viewport === PHONE,
    hasTouch: viewport === PHONE,
    locale: 'en-CA',
    timezoneId: 'America/Toronto',
  })
  // block third-party analytics noise
  await context.route(/vercel-scripts|vitals\.vercel/, (r) => r.abort())
  attachMock(context, state)
  if (session) await seedSession(context, persona)
  const page = await context.newPage()
  return { context, page, state }
}

// Replace the real studio's name and contact details with a placeholder brand
// so the deck can be sent to anyone.
const REPLACEMENTS = [
  ['Arsh Sandhu Allure', 'Belle Rose Artistry'],
  ['arshsandhuallure@gmail.com', 'hello@bellerose.example'],
  ['@arshsandhuallure', '@belleroseartistry'],
  ['arshsandhuallure.com', 'bellerose.example'],
  ['+1 (437) 221-0004', '+1 (000) 000-0000'],
  ['Where Elegance Meets Artistry', 'Beauty, Crafted Around You'],
  ['Arsh', 'Belle Rose'],
]
async function genericize(page) {
  await page.evaluate((reps) => {
    const fix = (t) => reps.reduce((acc, [a, b]) => acc.split(a).join(b), t)
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const nodes = []
    while (walker.nextNode()) nodes.push(walker.currentNode)
    for (const n of nodes) { const v = fix(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v }
    for (const el of document.querySelectorAll('input, textarea')) {
      if (el.value) { const v = fix(el.value); if (v !== el.value) el.value = v }
      if (el.placeholder) el.placeholder = fix(el.placeholder)
    }
  }, REPLACEMENTS)
}

async function shot(page, name, { fullPage = true, settle = 1400 } = {}) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(settle)
  await genericize(page)
  await page.waitForTimeout(150)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage })
  console.log('✓', name)
}

async function go(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
}

/* ------------------------------ Public / auth ------------------------------ */
{
  const { context, page } = await newCtx({ persona: 'client', session: false })
  await go(page, '/portal/login')
  await page.fill('input[type=email]', 'priya.sharma@example.com')
  await page.fill('input[type=password]', 'hunter2hunter2')
  await shot(page, 'client-login', { fullPage: false })
  await go(page, '/admin/login')
  await shot(page, 'admin-login', { fullPage: false })
  await go(page, '/join/Zt7Qm2VbKd9RxL4nHs8WcPy3AgEu1JfT')
  await page.waitForSelector('text=Create My Login')
  await shot(page, 'client-join', { fullPage: false })
  await go(page, '/portal/reset')
  await shot(page, 'client-reset', { fullPage: false })
  await context.close()
}

/* ------------------------------ Party link form ---------------------------- */
{
  const { context, page } = await newCtx({ persona: 'client', session: false })
  await go(page, `/party/${PARTY_TOKEN}`)
  await page.waitForSelector('text=Send My Details')
  await page.fill('input[placeholder="Full name"]', 'Sana Malik')
  await page.fill('input[placeholder="e.g. Sister, Mom, Bridesmaid"]', 'Bridesmaid')
  await page.click('button:has-text("Both")')
  await page.click('button:has-text("Combination")')
  await page.click('button:has-text("Long")')
  await page.click('button:has-text("Wavy")')
  await page.fill('textarea[placeholder*="dewy skin"]', 'Soft glam, glowy skin, a loose romantic wave.')
  await page.fill('textarea[placeholder*="fake lashes"]', 'Nothing too heavy.')
  await shot(page, 'party-form')
  await page.click('button:has-text("Send My Details")')
  await page.waitForSelector('text=Thank you')
  await shot(page, 'party-done', { fullPage: false })
  await context.close()
}

/* ------------------------------ Client portal ------------------------------ */
{
  // Fresh bride: nothing done yet
  const db = makeDb()
  db.agreements = []
  db.payments = db.payments.map((p) => ({ ...p, status: 'due', received_at: null }))
  db.intakes = []
  db.client_documents = db.client_documents.map((d) => ({ ...d, visible: false }))
  db.party_members = db.party_members.filter((m) => m.is_bride).map((m) => ({ ...m, status: 'draft', photos: {}, likes: '', dislikes: '', skin_type: null, hair_length: null, hair_texture: null, foundation_brand: '', foundation_shade: '', allergies: '', skin_concerns: '' }))
  const { context, page } = await newCtx({ persona: 'client', db })
  await go(page, '/portal')
  await shot(page, 'client-journey-fresh')
  await go(page, '/portal/agreement')
  await page.waitForSelector('text=Sign Agreement')
  await page.click('text=I agree — my final look')
  await page.fill('input[placeholder="Priya Sharma"]', 'Priya Sharma')
  await page.check('input[type=checkbox]')
  await shot(page, 'client-agreement-signing')
  await go(page, '/portal/retainer')
  await shot(page, 'client-payments-locked')
  await context.close()
}
{
  // Mid-journey bride (default fixtures)
  const { context, page, state } = await newCtx({ persona: 'client' })
  await go(page, '/portal')
  await shot(page, 'client-journey-mid')
  await go(page, '/portal/agreement')
  await shot(page, 'client-agreement-signed')
  await go(page, '/portal/retainer')
  await shot(page, 'client-payments')
  await go(page, '/portal/intake')
  await shot(page, 'client-intake-pending')
  // draft version of intake (editable, with submit)
  state.db.intakes[0].status = 'draft'
  state.db.party_members = state.db.party_members.map((m) => (m.is_bride ? { ...m, status: 'draft' } : m))
  await go(page, '/portal/intake')
  await shot(page, 'client-intake-draft')
  // changes requested
  state.db.intakes[0].status = 'changes_requested'
  state.db.intakes[0].review_message = 'Could you double-check the getting-ready address? The one you entered looks like the venue rather than the hotel. Also add a daylight selfie if you can — it helps me match your foundation perfectly.'
  await go(page, '/portal/intake')
  await shot(page, 'client-intake-changes')
  state.db.intakes[0].status = 'pending'
  await go(page, `/portal/intake/member/${BRIDE_ID}`)
  await page.waitForSelector('img')
  await shot(page, 'client-profile-bride')
  await go(page, '/portal/party-link')
  await shot(page, 'client-party-link')
  await go(page, '/portal/docs')
  await shot(page, 'client-docs')
  await go(page, '/portal/docs/timeline')
  await shot(page, 'client-timeline')
  await go(page, '/portal/docs/hair_guide')
  await shot(page, 'client-hair-guide')
  await go(page, '/portal/docs/skin_guide')
  await shot(page, 'client-skin-guide')
  await go(page, '/portal/settings')
  await shot(page, 'client-settings')
  await context.close()
}

/* ------------------------------ Admin studio ------------------------------- */
{
  const { context, page, state } = await newCtx({ persona: 'admin' })
  await go(page, '/admin')
  await page.click('text=Show past & archived')
  await shot(page, 'admin-clients')
  await go(page, '/admin/clients/new')
  await page.fill("input[placeholder=\"Bride's full name\"]", 'Simran Gill')
  await page.fill('input[placeholder="her@email.com"]', 'simran.gill@example.com')
  await page.fill('input[placeholder="+1 (000) 000-0000"]', '+1 (905) 555-0187')
  await page.selectOption('select', 'makeup')
  await page.fill('input[type=date]', '2026-10-03')
  const times = page.locator('input[type=time]')
  await times.nth(0).fill('11:00')
  await times.nth(1).fill('15:00')
  await page.fill('input[placeholder="Street, city"]', '12 Queen St W, Brampton')
  await page.fill('input[placeholder="e.g. 9"]', '2')
  const nums = page.locator('input[placeholder="0.00"]')
  await nums.nth(0).fill('650')
  await nums.nth(1).fill('60')
  await shot(page, 'admin-client-new')
  await page.click('button:has-text("Create client & invite link")')
  await page.waitForSelector('text=Client created')
  await shot(page, 'admin-client-created', { fullPage: false })

  await go(page, `/admin/clients/${CLIENT_ID}?tab=overview`)
  await shot(page, 'admin-client-overview')
  await go(page, `/admin/clients/${CLIENT_ID}?tab=intake`)
  await shot(page, 'admin-client-intake')
  await page.click('button:has-text("Request changes")')
  await page.fill('textarea', 'Could you double-check the getting-ready address? It looks like the venue rather than the hotel.')
  await shot(page, 'admin-client-intake-request')
  await go(page, `/admin/clients/${CLIENT_ID}?tab=intake&member=${BRIDE_ID}`)
  await page.waitForSelector('img')
  await shot(page, 'admin-client-profile')
  await go(page, `/admin/clients/${CLIENT_ID}?tab=agreement`)
  state.db.agreements[0].status = 'signed'
  await go(page, `/admin/clients/${CLIENT_ID}?tab=agreement`)
  await shot(page, 'admin-client-agreement')
  state.db.agreements[0].status = 'approved'
  await go(page, `/admin/clients/${CLIENT_ID}?tab=timeline`)
  await shot(page, 'admin-client-timeline')
  await page.click('button:has-text("Preview")')
  await shot(page, 'admin-client-timeline-preview')
  await go(page, `/admin/clients/${CLIENT_ID}?tab=docs`)
  await shot(page, 'admin-client-docs')
  await go(page, `/admin/clients/${CLIENT_ID}?tab=payments`)
  await shot(page, 'admin-client-payments')
  await go(page, `/admin/clients/${CLIENT_ID}?tab=notes`)
  await shot(page, 'admin-client-notes')

  await go(page, '/admin/queue')
  await shot(page, 'admin-queue')
  await page.locator('button:has-text("Request changes")').first().click()
  await page.fill('textarea', 'Could you add a clearer selfie in daylight? It helps me match your shade.')
  await shot(page, 'admin-queue-request')
  await go(page, '/admin/settings')
  await shot(page, 'admin-settings')
  await context.close()
}

/* ------------------------------ Phone views -------------------------------- */
{
  const { context, page } = await newCtx({ persona: 'client', viewport: PHONE })
  await go(page, '/portal')
  await shot(page, 'phone-journey', { fullPage: false })
  await go(page, '/portal/intake')
  await shot(page, 'phone-intake', { fullPage: false })
  await go(page, `/portal/intake/member/${BRIDE_ID}`)
  await page.waitForSelector('img')
  await shot(page, 'phone-profile', { fullPage: false })
  await go(page, '/portal/retainer')
  await shot(page, 'phone-payments', { fullPage: false })
  await go(page, '/portal/docs/timeline')
  await shot(page, 'phone-timeline', { fullPage: false })
  await context.close()
}
{
  const { context, page } = await newCtx({ persona: 'client', viewport: PHONE, session: false })
  await go(page, `/party/${PARTY_TOKEN}`)
  await page.waitForSelector('text=Send My Details')
  await shot(page, 'phone-party', { fullPage: false })
  await go(page, '/portal/login')
  await shot(page, 'phone-login', { fullPage: false })
  await context.close()
}
{
  const { context, page } = await newCtx({ persona: 'admin', viewport: PHONE })
  await go(page, '/admin/queue')
  await shot(page, 'phone-admin-queue', { fullPage: false })
  await go(page, '/admin')
  await shot(page, 'phone-admin-clients', { fullPage: false })
  await go(page, `/admin/clients/${CLIENT_ID}?tab=payments`)
  await shot(page, 'phone-admin-payments', { fullPage: false })
  await context.close()
}

/* ------------------------------ Emails ------------------------------------- */
{
  const WRAP = (heading, bodyHtml, ctaText, ctaUrl) => `
<div style="background:#F5EFEA;padding:40px 16px;font-family:Georgia,'Times New Roman',serif;color:#1A1A1A;">
  <div style="max-width:520px;margin:0 auto;background:#FFFFFF;padding:40px 32px;">
    <p style="text-align:center;letter-spacing:0.3em;font-size:11px;color:#7A5A32;text-transform:uppercase;margin:0 0 8px;">Belle Rose Artistry</p>
    <hr style="border:none;border-top:1px solid #C8B8AC;width:64px;margin:0 auto 28px;">
    <h1 style="font-size:22px;font-weight:500;text-align:center;margin:0 0 20px;">${heading}</h1>
    <div style="font-size:15px;line-height:1.7;color:#4A3828;">${bodyHtml}</div>
    ${ctaUrl ? `<p style="text-align:center;margin:32px 0 0;"><a href="${ctaUrl}" style="display:inline-block;border:1px solid #7A5A32;color:#7A5A32;text-decoration:none;padding:12px 28px;letter-spacing:0.2em;font-size:12px;text-transform:uppercase;">${ctaText}</a></p>` : ''}
    <hr style="border:none;border-top:1px solid #C8B8AC;width:64px;margin:36px auto 16px;">
    <p style="text-align:center;font-size:11px;letter-spacing:0.15em;color:#8A7A70;text-transform:uppercase;margin:0;">Beauty, Crafted Around You</p>
  </div>
</div>`
  const context = await browser.newContext({ viewport: { width: 640, height: 600 }, deviceScaleFactor: 2 })
  const page = await context.newPage()
  await page.setContent(
    `<body style="margin:0">${WRAP(
      'Welcome, Priya',
      '<p>We are so honoured to be part of your day. Your personal client portal is ready — your agreement, forms, and wedding-day details all live there.</p><p>The link below is valid for 7 days.</p>',
      'Set Up My Portal',
      '#'
    )}</body>`
  )
  await page.screenshot({ path: `${OUT}/email-invite.png`, fullPage: true })
  await page.setContent(
    `<body style="margin:0">${WRAP(
      'New client submission',
      '<p><strong>Priya Sharma</strong> (event 2026-11-14) just sent a client intake form.</p><p>3 items waiting for your review.</p>',
      'Review Now',
      '#'
    )}</body>`
  )
  await page.screenshot({ path: `${OUT}/email-alert.png`, fullPage: true })
  console.log('✓ emails')
  await context.close()
}

await browser.close()
console.log('done')
