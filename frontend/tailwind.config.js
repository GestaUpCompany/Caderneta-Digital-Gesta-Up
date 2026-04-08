/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
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
