/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#FF6B00',
          'orange-light': '#FF8533',
          gold: '#D4AF37',
          'gold-light': '#FCD34D',
          wood: '#8B5A2B',
          'wood-dark': '#5C3A21',
        }
      },
      fontFamily: {
        sans: ['Cairo', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
