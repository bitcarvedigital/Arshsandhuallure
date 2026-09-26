// Placeholder studio used everywhere in the pitch deck, so the PDF can be sent
// to anyone. Every screenshot and rendered PDF swaps the real studio's name,
// tagline and contact details for these.

export const BRAND = {
  name: 'Belle Rose Artistry',
  short: 'Belle Rose',
  tagline: 'Beauty, Crafted Around You',
  email: 'hello@bellerose.example',
  phone: '+1 (000) 000-0000',
  handle: '@belleroseartistry',
  domain: 'bellerose.example',
  region: 'Greater Toronto Area',
}

// Order matters: longer, more specific strings first.
export const REPLACEMENTS = [
  ['Arsh Sandhu Allure', BRAND.name],
  ['ARSH SANDHU ALLURE', BRAND.name.toUpperCase()],
  ['arshsandhuallure@gmail.com', BRAND.email],
  ['portal@arshsandhuallure.com', BRAND.email],
  ['@arshsandhuallure', BRAND.handle],
  ['arshsandhuallure.com', BRAND.domain],
  ['+1 (437) 221-0004', BRAND.phone],
  ['Where Elegance Meets Artistry', BRAND.tagline],
  ['WHERE ELEGANCE MEETS ARTISTRY', BRAND.tagline.toUpperCase()],
  ['Mississauga · Greater Toronto Area', BRAND.region],
  ['Arsh', BRAND.short],
]

export const rebrand = (text) => REPLACEMENTS.reduce((acc, [a, b]) => acc.split(a).join(b), String(text))
