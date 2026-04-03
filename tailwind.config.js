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
        dark: '#1A1A1A',
        'btn-dark': '#2B2521',
      },
    },
  },
  plugins: [],
}
