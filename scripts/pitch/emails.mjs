// Renders the portal's emails (same markup as api/_lib/email.js) with the
// placeholder brand: the invite, the studio's submission alert, and an invoice.
import { chromium } from 'playwright-core'
import { fileURLToPath } from 'node:url'
import { BRAND } from './brand.mjs'

const OUT = fileURLToPath(new URL('../../.pitch/shots/', import.meta.url))

const WRAP = (heading, bodyHtml, ctaText, ctaUrl) => `
<div style="background:#F5EFEA;padding:40px 16px;font-family:Georgia,'Times New Roman',serif;color:#1A1A1A;">
  <div style="max-width:520px;margin:0 auto;background:#FFFFFF;padding:40px 32px;">
    <p style="text-align:center;letter-spacing:0.3em;font-size:11px;color:#7A5A32;text-transform:uppercase;margin:0 0 8px;">${BRAND.name}</p>
    <hr style="border:none;border-top:1px solid #C8B8AC;width:64px;margin:0 auto 28px;">
    <h1 style="font-size:22px;font-weight:500;text-align:center;margin:0 0 20px;">${heading}</h1>
    <div style="font-size:15px;line-height:1.7;color:#4A3828;">${bodyHtml}</div>
    ${ctaUrl ? `<p style="text-align:center;margin:32px 0 0;"><a href="${ctaUrl}" style="display:inline-block;border:1px solid #7A5A32;color:#7A5A32;text-decoration:none;padding:12px 28px;letter-spacing:0.2em;font-size:12px;text-transform:uppercase;">${ctaText}</a></p>` : ''}
    <hr style="border:none;border-top:1px solid #C8B8AC;width:64px;margin:36px auto 16px;">
    <p style="text-align:center;font-size:11px;letter-spacing:0.15em;color:#8A7A70;text-transform:uppercase;margin:0;">${BRAND.tagline}</p>
  </div>
</div>`

const EMAILS = {
  'email-invite': WRAP(
    'Welcome, Priya',
    '<p>We are so honoured to be part of your day. Your personal client portal is ready — your agreement, forms, and wedding-day details all live there.</p><p>The link below is valid for 7 days.</p>',
    'Set Up My Portal',
    '#',
  ),
  'email-alert': WRAP(
    'New client submission',
    '<p><strong>Priya Sharma</strong> (event 2026-11-12) just sent a client intake form.</p><p>3 items waiting for your review.</p>',
    'Review Now',
    '#',
  ),
  'email-invoice': WRAP(
    'Your invoice, Priya',
    [
      '<p>Please find invoice <strong>BRA-2026-0012</strong> attached.</p>',
      '<p style="font-size:20px;margin:18px 0;"><strong>$2,181.00</strong> due by Thu, Nov 12, 2026</p>',
      '<p>Send an Interac e-Transfer to <strong>pay@bellerose.example</strong> with <strong>BRA-2026-0012</strong> in the message.</p>',
      '<p style="border-left:2px solid #7A5A32;padding-left:12px;color:#5A4030;">Thank you! Your retainer secures all three dates.</p>',
      '<p>You can see every event, price and payment any time in your client portal.</p>',
    ].join(''),
    'View in your portal',
    '#',
  ),
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 640, height: 200 }, deviceScaleFactor: 2 })
for (const [name, html] of Object.entries(EMAILS)) {
  await page.setContent(`<body style="margin:0">${html}</body>`)
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage: true })
  console.log('✓', name)
}
await browser.close()
