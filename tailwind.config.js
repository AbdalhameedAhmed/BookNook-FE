/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'var(--border)',
        input: 'var(--border-strong)',
        ring: 'var(--primary-500)',
        background: 'var(--bg)',
        foreground: 'var(--text)',
        primary: { DEFAULT: 'var(--primary)', hover: 'var(--primary-hover)', soft: 'var(--primary-50)', foreground: '#ffffff' },
        secondary: { DEFAULT: 'var(--gray-100)', hover: 'var(--gray-200)', foreground: 'var(--text)' },
        muted: { DEFAULT: 'var(--gray-100)', foreground: 'var(--text-muted)' },
        destructive: { DEFAULT: 'var(--danger-600)', hover: 'var(--danger-700)', soft: 'var(--danger-50)', line: 'var(--danger-200)', foreground: '#ffffff' },
        card: { DEFAULT: 'var(--surface)', foreground: 'var(--text)' },
      },
      borderColor: { DEFAULT: 'var(--border)' },
      fontFamily: {
        sans: ['var(--font)'],
      },
      borderRadius: { sm: 'var(--radius-sm)', md: 'var(--radius-sm)', lg: 'var(--radius)', xl: 'var(--radius-lg)' },
      boxShadow: { sm: 'var(--shadow-sm)', md: 'var(--shadow-md)', lg: 'var(--shadow-lg)' },
    },
  },
  plugins: [],
};
