/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        border: 'var(--line)',
        input: 'var(--line)',
        ring: 'var(--forest)',
        background: 'var(--paper)',
        foreground: 'var(--ink)',
        primary: { DEFAULT: 'var(--forest)', foreground: 'var(--white)' },
        secondary: { DEFAULT: 'var(--paper-dark)', foreground: 'var(--ink)' },
        muted: { DEFAULT: 'var(--paper-dark)', foreground: 'var(--muted)' },
        accent: { DEFAULT: 'var(--leaf)', foreground: 'var(--ink)' },
        destructive: { DEFAULT: 'var(--rust)', foreground: 'var(--white)' },
        card: { DEFAULT: 'var(--white)', foreground: 'var(--ink)' },
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
      borderRadius: { sm: '3px', md: '5px', lg: '7px' },
    },
  },
  plugins: [],
};