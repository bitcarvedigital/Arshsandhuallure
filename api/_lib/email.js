export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

// Minimal Resend sender (REST via fetch — no SDK). Email is a courtesy
// notification, never a security gate: missing config logs and moves on.

const WRAP = (heading, bodyHtml, ctaText, ctaUrl) => `
<div style="background:#F5EFEA;padding:40px 16px;font-family:Georgia,'Times New Roman',serif;color:#1A1A1A;">
  <div style="max-width:520px;margin:0 auto;background:#FFFFFF;padding:40px 32px;">
    <p style="text-align:center;letter-spacing:0.3em;font-size:11px;color:#7A5A32;text-transform:uppercase;margin:0 0 8px;">Arsh Sandhu Allure</p>
    <hr style="border:none;border-top:1px solid #C8B8AC;width:64px;margin:0 auto 28px;">
    <h1 style="font-size:22px;font-weight:500;text-align:center;margin:0 0 20px;">${heading}</h1>
    <div style="font-size:15px;line-height:1.7;color:#4A3828;">${bodyHtml}</div>
    ${ctaUrl ? `<p style="text-align:center;margin:32px 0 0;"><a href="${ctaUrl}" style="display:inline-block;border:1px solid #7A5A32;color:#7A5A32;text-decoration:none;padding:12px 28px;letter-spacing:0.2em;font-size:12px;text-transform:uppercase;">${ctaText}</a></p>` : ''}
    <hr style="border:none;border-top:1px solid #C8B8AC;width:64px;margin:36px auto 16px;">
    <p style="text-align:center;font-size:11px;letter-spacing:0.15em;color:#8A7A70;text-transform:uppercase;margin:0;">Where Elegance Meets Artistry</p>
  </div>
</div>`

export async function sendEmail({ to, subject, heading, bodyHtml, ctaText, ctaUrl, attachments }) {
  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM || 'onboarding@resend.dev'
  if (!key) {
    console.warn(`[email skipped — no RESEND_API_KEY] to=${to} subject="${subject}"`)
    return { skipped: true }
  }
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Arsh Sandhu Allure <${from}>`,
        to: [to],
        subject,
        html: WRAP(heading, bodyHtml, ctaText, ctaUrl),
        ...(attachments ? { attachments } : {}),
      }),
    })
    if (!resp.ok) {
      console.error('[email failed]', resp.status, await resp.text())
      return { skipped: true }
    }
    return { skipped: false }
  } catch (err) {
    console.error('[email failed]', err)
    return { skipped: true }
  }
}
