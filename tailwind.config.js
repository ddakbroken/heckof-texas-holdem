/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        'xs': '450px',
      },
      colors: {
        poker: {
          green: '#0f5132',
          red: '#dc2626',
          gold: '#fbbf24',
          dark: '#1f2937',
        }
      },
      fontFamily: {
        'poker': ['Georgia', 'serif'],
      }
    },
  },
  plugins: [],
} 