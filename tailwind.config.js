/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'primary': '#5a6b5a',
        'primary-light': '#6b7c6b',
        'primary-dark': '#4a5b4a',
        'secondary': '#F0F9F9',
        'accent': '#F59E0B',
        'dark': '#000000',
        'light': '#FFFFFF',
        'dark-secondary': '#0a0a0a',
        'dark-card': '#111111',
        'dark-border': '#1a1a1a',
        'green-brand': '#5a6b5a',
        'green-brand-light': '#6b7c6b',
        'green-brand-dark': '#4a5b4a',
        'blue': {
          100: '#DBEAFE',
          200: '#BFDBFE',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A'
        },
        'pressure': {
          'bassissima': '#008000',
          'bassa': '#8fbc8f',
          'media': '#daa520',
          'alta': '#ffa500',
          'altissima': '#ff4500'
        }
      }
    },
  },
  plugins: [],
}