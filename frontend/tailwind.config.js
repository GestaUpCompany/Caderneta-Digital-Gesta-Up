/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'grid-cols-2',
    'grid-cols-5',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef5f0',
          100: '#d9e8de',
          200: '#b5d1c0',
          300: '#8cb8a0',
          400: '#639c80',
          500: '#458062',
          600: '#35684e',
          700: '#23503a',
          800: '#1d4030',
          900: '#1a3a2a',
          950: '#142b20',
        },
        accent: {
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
        },
        surface: '#f3f5f2',
      },
      fontSize: {
        'base': '18px',
        'lg': '20px',
        'xl': '24px',
        '2xl': '28px',
      },
      minHeight: {
        'touch': '60px',
        'touch-lg': '80px',
      },
      minWidth: {
        'touch': '60px',
        'touch-lg': '80px',
      },
    },
  },
  plugins: [],
}
