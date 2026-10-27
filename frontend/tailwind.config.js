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
          bg: '#090909',         // Application background
          shell: '#0C0C0C',      // Navigation / shell background
          nav: '#0C0C0C',        // Navigation background
          surface: '#111110',    // Main work surface
          subsurface: '#171715', // Secondary surface
          elevated: '#1D1B18',   // Elevated surface
          hover: '#24211D',      // Warm hover surface
          border: '#292723',     // Subtle separator
          separator: '#292723',  // Subtle separator
          text: '#F0EDE7',       // Primary text
          secondary: '#B6B0A6',  // Secondary text
          muted: '#898277',      // Muted text
          accent: '#AD8D69',     // Muted bronze
          bronze: '#AD8D69',     // Muted bronze
          champagne: '#C4AE8D',  // Soft champagne
          sage: '#8B9B83',       // Muted sage
          success: '#8B9B83',    // Accessible muted sage
          warning: '#C4924A',    // Accessible muted amber
          danger: '#B85951',     // Accessible restrained red
          info: '#7E8F96',       // Accessible muted slate
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
