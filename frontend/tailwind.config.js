/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: 'var(--canvas)',
          soft: 'var(--canvas-soft)',
          deep: 'var(--canvas-deep)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          muted: 'var(--ink-muted)',
          soft: 'var(--ink-soft)',
        },
        primary: {
          50: '#eef7ff',
          100: '#d9ecff',
          200: '#bcdcff',
          300: '#8fc4f5',
          400: '#5aa6e4',
          500: '#3b8fd0',
          600: '#2f74ad',
          700: '#285d8c',
          800: '#244e73',
          900: '#214260',
        },
        mint: {
          50: '#effaf5',
          100: '#d8f3e7',
          200: '#b4e6d0',
          300: '#84d2b4',
          400: '#55b793',
          500: '#369b78',
          600: '#287c60',
        },
        peach: {
          50: '#fff4ef',
          100: '#ffe4d6',
          200: '#ffc9ae',
          300: '#f5a882',
          400: '#e8875a',
          500: '#d46b3c',
        },
        lavender: {
          50: '#f5f3ff',
          100: '#ece7ff',
          200: '#d9d0ff',
          300: '#bfb0f5',
          400: '#9f8ae0',
          500: '#7f6ac4',
        },
        success: {
          50: '#effaf5',
          100: '#d8f3e7',
          500: '#369b78',
          600: '#287c60',
        },
        warning: {
          50: '#fff7eb',
          100: '#ffecd0',
          500: '#d4923a',
          600: '#b57528',
        },
        danger: {
          50: '#fff1f1',
          100: '#ffd9d9',
          500: '#d45a5a',
          600: '#b64343',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Source Sans 3"', 'ui-sans-serif', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px -18px rgba(31, 42, 50, 0.35)',
        lift: '0 16px 40px -24px rgba(31, 42, 50, 0.4)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        softIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.45s ease-out both',
        'soft-in': 'softIn 0.35s ease-out both',
      },
    },
  },
  plugins: [],
};
