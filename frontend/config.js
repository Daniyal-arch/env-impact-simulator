# Create tailwind.config.js manually
@"
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f0fdf4',
          500: '#22c55e', 
          600: '#16a34a',
          700: '#15803d'
        }
      }
    },
  },
  plugins: [],
}
"@ > tailwind.config.js