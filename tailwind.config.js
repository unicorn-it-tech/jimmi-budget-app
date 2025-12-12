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
        'primary': '#0D9488',
        'secondary': '#F0F9F9',
        'accent': '#F59E0B',
        'dark': '#111827',
        'light': '#FFFFFF',
        'dark-secondary': '#1F2937',
        'blue': {
          100: '#DBEAFE',
          200: '#BFDBFE',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A'
        }
      }
    },
  },
  plugins: [],
}