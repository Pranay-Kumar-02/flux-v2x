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
          bg: '#090909',         // Deep Obsidian application background
          shell: '#0B0B0A',      // Navigation / shell background
          nav: '#0B0B0A',        // Navigation background
          surface: '#121110',    // Elevated primary work surface
          subsurface: '#181715', // Secondary container surface
          elevated: '#1E1D1A',   // Elevated interaction surface / hover
          hover: '#24221F',      // Warm hover surface
          border: '#262420',     // Low-contrast warm hairline separator
          separator: '#262420',  // Low-contrast separator
          text: '#F2EFEB',       // Primary warm off-white typography
          secondary: '#B8B2A8',  // Secondary descriptive copy
          muted: '#807A70',      // Muted metadata
          accent: '#B0906C',     // Muted warm bronze
          bronze: '#B0906C',     // Muted warm bronze
          champagne: '#C8B291',  // Soft champagne highlight
          sage: '#8A9983',       // Muted sage for neutral-positive & health
          success: '#8A9983',    // Semantic success
          warning: '#C4924A',    // Accessible warm amber
          danger: '#B85951',     // Restrained red for security anomalies
          info: '#7E8F96',       // Neutral slate
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      boxShadow: {
        'flux-subtle': '0 1px 3px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.25)',
        'flux-elevated': '0 8px 32px -4px rgba(0, 0, 0, 0.6), 0 2px 8px rgba(0, 0, 0, 0.3)',
      }
    },
  },
  plugins: [],
}
