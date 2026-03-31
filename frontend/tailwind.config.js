/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        emergency: {
          red: '#EF4444',
          yellow: '#F59E0B',
          green: '#10B981',
          blue: '#3B82F6',
        }
      }
    },
  },
  plugins: [],
}
