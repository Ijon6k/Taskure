/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]', '[data-theme="dim"]'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter-tight)', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          lavender: 'var(--color-brand-lavender)',
          'lavender-muted': 'var(--color-brand-lavender-muted)',
          blue: 'var(--color-brand-blue)',
          'blue-muted': 'var(--color-brand-blue-muted)',
          pink: 'var(--color-brand-pink)',
          'pink-muted': 'var(--color-brand-pink-muted)',
        },
        semantic: {
          info: 'var(--color-semantic-info)',
          success: 'var(--color-semantic-success)',
          warning: 'var(--color-semantic-warning)',
          error: 'var(--color-semantic-error)',
        },
        theme: {
          bg: 'var(--color-bg)',
          surface: 'var(--color-surface)',
          'surface-hover': 'var(--color-surface-hover)',
          'surface-active': 'var(--color-surface-active)',
          border: 'var(--color-border)',
          'border-hover': 'var(--color-border-hover)',
          text: 'var(--color-text)',
          'text-secondary': 'var(--color-text-secondary)',
          'text-tertiary': 'var(--color-text-tertiary)',
        },
      },
      borderRadius: {
        card: '8px',
        btn: '6px',
        input: '4px',
      },
    },
  },
  plugins: [],
};
