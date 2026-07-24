/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]', '[data-theme="dim"]'],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          lavender: '#B4A0E5',
          'lavender-muted': '#8B7EC1',
          blue: '#A0C4E8',
          'blue-muted': '#7DACD4',
          pink: '#E8B4C8',
          'pink-muted': '#D495AF',
        },
        semantic: {
          info: '#3B82F6',
          success: '#22C55E',
          warning: '#F59E0B',
          error: '#EF4444',
        },
        theme: {
          bg: 'var(--surface-l0)',
          surface: 'var(--surface-l1)',
          elevated: 'var(--surface-l3)',
          hover: 'var(--surface-hover)',
          border: 'var(--border-default)',
          'border-subtle': 'var(--border-subtle)',
          text: 'var(--text-primary)',
          'text-secondary': 'var(--text-secondary)',
          'text-tertiary': 'var(--text-tertiary)',
        },
      },
    },
  },
  plugins: [],
};
