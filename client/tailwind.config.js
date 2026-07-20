/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fffbe6',
          100: '#fff3b3',
          200: '#ffe880',
          300: '#ffd94d',
          400: '#ffcb1a',
          500: '#e6b000',
          600: '#b38600',
          700: '#805d00',
          800: '#4d3600',
          900: '#1f1300',
        },
        dark: {
          bg: '#0f172a',
          card: '#1e293b',
          border: '#334155',
          accent: '#38bdf8'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
