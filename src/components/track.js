import { track } from '@vercel/analytics'

// Inquiry-intent events for Vercel Analytics. Never throws: analytics must
// not be able to break a tap-to-call or a form submit.
export function trackInquiry(channel, placement) {
  try { track('inquiry_click', { channel, placement }) } catch {}
}
export function trackEvent(name, data) {
  try { track(name, data) } catch {}
}
