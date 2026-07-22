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
          bg: 'var(--color-bg)',
          surface: 'var(--color-surface)',
          elevated: 'var(--color-elevated)',
          hover: 'var(--color-hover)',
          border: 'var(--color-border)',
          'border-subtle': 'var(--color-border-subtle)',
          text: 'var(--color-text)',
          'text-secondary': 'var(--color-text-secondary)',
          'text-tertiary': 'var(--color-text-tertiary)',
        },
      },
    },
  },
  plugins: [],
};
