import { chromium } from 'playwright-core'
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
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const context = await browser.newContext({ viewport: { width: 640, height: 200 }, deviceScaleFactor: 2 })
const page = await context.newPage()
await page.setContent(`<body style="margin:0">${WRAP('Welcome, Priya','<p>We are so honoured to be part of your day. Your personal client portal is ready — your agreement, forms, and wedding-day details all live there.</p><p>The link below is valid for 7 days.</p>','Set Up My Portal','#')}</body>`)
await page.screenshot({ path: '../../.pitch/shots/email-invite.png', fullPage: true })
await page.setContent(`<body style="margin:0">${WRAP('New client submission','<p><strong>Priya Sharma</strong> (event 2026-11-14) just sent a client intake form.</p><p>3 items waiting for your review.</p>','Review Now','#')}</body>`)
await page.screenshot({ path: '../../.pitch/shots/email-alert.png', fullPage: true })
await browser.close()
console.log('ok')
