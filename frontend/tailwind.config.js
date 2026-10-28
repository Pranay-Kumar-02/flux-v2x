/** @type {import('tailwindcss').Config} */

function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${variableName}), ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
}

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
          bg: withOpacity('--flux-bg-rgb'),
          shell: withOpacity('--flux-shell-rgb'),
          nav: withOpacity('--flux-shell-rgb'),
          surface: withOpacity('--flux-surface-rgb'),
          subsurface: withOpacity('--flux-subsurface-rgb'),
          elevated: withOpacity('--flux-elevated-rgb'),
          hover: withOpacity('--flux-hover-rgb'),
          border: withOpacity('--flux-border-rgb'),
          separator: withOpacity('--flux-border-rgb'),
          text: withOpacity('--flux-text-rgb'),
          secondary: withOpacity('--flux-secondary-rgb'),
          muted: withOpacity('--flux-muted-rgb'),
          accent: withOpacity('--flux-accent-rgb'),
          bronze: withOpacity('--flux-accent-rgb'),
          champagne: withOpacity('--flux-champagne-rgb'),
          sage: withOpacity('--flux-sage-rgb'),
          success: withOpacity('--flux-sage-rgb'),
          warning: withOpacity('--flux-warning-rgb'),
          danger: withOpacity('--flux-danger-rgb'),
          info: withOpacity('--flux-info-rgb'),
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
