/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Playfair Display"', 'serif'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        beige: '#F5EFEA',
        'beige-dark': '#EDE3DB',
        'beige-card': '#EAE0D6',
        gold: '#7A5A32',
        'gold-light': '#B08A5A', // gold for dark surfaces: passes contrast where #7A5A32 does not
        dark: '#1A1A1A',
        'btn-dark': '#2B2521',
        // portal UI tokens (2026-09-26 polish) — the marketing pages don't use these
        body: '#4A3828', // long-form text in documents and notes
        muted: '#6B5D53', // descriptions, secondary text (5.4:1 on beige)
        faint: '#786A60', // hints, dates, meta (4.6:1 — still AA at small sizes)
        ghost: '#A89A8E', // locked / not-yet-available only
        line: '#E6DACD', // hairlines between rows and sections
        surface: '#FBF8F4', // soft panels
        soft: '#EFE6DA', // notes, pills, empty states
        danger: '#8A3A2A',
        success: '#4A6741',
      },
    },
  },
  plugins: [],
}
