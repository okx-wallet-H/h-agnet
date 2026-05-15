/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#05040A',
        surface: '#0B0A12',
        terminal: '#171322',
        gold: '#D8B45F',
        purple: '#7C3AED',
        violet: '#A855F7',
      },
    },
  },
  plugins: [],
}
