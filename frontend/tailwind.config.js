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
        flux: {
          bg: '#0B0F14',
          surface: '#111821',
          elevated: '#17212B',
          border: '#273544',
          accent: '#2DD4BF', // Mint / Teal
          info: '#60A5FA',   // Blue
          warning: '#F59E0B',// Amber
          danger: '#EF4444', // Red
          muted: '#94A3B8',
          text: '#F1F5F9',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
