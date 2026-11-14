import plugin from 'tailwindcss/plugin';

/** Colours are CSS variables holding RGB channels (see src/styles.css) so light/dark switch without `dark:` classes. */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: {
      xs: '520px',
      sm: '640px',
      md: '760px',
      lg: '900px',
      lgx: '940px',
      wide: '960px',
      xl: '1160px',
    },
    // Sizes only: line-height is inherited from the body (1.55) unless set explicitly.
    fontSize: {
      '2xs': '0.6875rem',
      xs: '0.75rem',
      13: '0.8125rem',
      sm: '0.875rem',
      15: '0.9375rem',
      base: '1rem',
      17: '1.0625rem',
      lg: '1.125rem',
      xl: '1.25rem',
      21: '1.3125rem',
      22: '1.375rem',
      '2xl': '1.5rem',
      28: '1.75rem',
      30: '1.875rem',
      '4xl': '2.25rem',
      // Type roles from the Stitch design system (Literata headlines, Plus Jakarta Sans UI).
      'display-lg': ['2.75rem', { lineHeight: '3.5rem', letterSpacing: '-0.02em' }],
      'display-lg-mobile': ['2rem', { lineHeight: '2.625rem', letterSpacing: '-0.01em' }],
      'headline-lg': ['2rem', { lineHeight: '2.5rem', letterSpacing: '-0.015em' }],
      'headline-lg-mobile': ['1.625rem', { lineHeight: '2.125rem', letterSpacing: '-0.01em' }],
      'headline-md': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.01em' }],
      'headline-sm': ['1.25rem', { lineHeight: '1.75rem' }],
      'title-lg': ['1.125rem', { lineHeight: '1.625rem' }],
      'title-md': ['1rem', { lineHeight: '1.5rem' }],
      'body-lg': ['1rem', { lineHeight: '1.625rem' }],
      'body-md': ['0.875rem', { lineHeight: '1.375rem' }],
      'body-sm': ['0.8125rem', { lineHeight: '1.125rem' }],
      'label-lg': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.01em' }],
      'label-md': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],
      'label-sm': ['0.6875rem', { lineHeight: '0.875rem', letterSpacing: '0.03em' }],
    },
    extend: {
      colors: {
        paper: token('paper'),
        surface: token('surface'),
        sunk: { DEFAULT: token('sunk'), 2: token('sunk-2'), 3: token('sunk-3') },
        line: { DEFAULT: token('line'), strong: token('line-strong') },
        ink: { DEFAULT: token('ink'), 2: token('ink-2'), 3: token('ink-3') },
        ledge: token('ledge'),
        glaze: { DEFAULT: token('glaze'), deep: token('glaze-deep'), soft: token('glaze-soft'), fixed: token('glaze-fixed') },
        'on-glaze': token('on-glaze'),
        cobalt: { DEFAULT: token('cobalt'), ink: token('cobalt-ink'), soft: token('cobalt-soft') },
        ochre: { DEFAULT: token('ochre'), ink: token('ochre-ink'), soft: token('ochre-soft') },
        pom: { DEFAULT: token('pom'), soft: token('pom-soft') },
        toast: {
          bg: token('toast-bg'),
          ink: token('toast-ink'),
          success: token('toast-success'),
          error: token('toast-error'),
          info: token('toast-info'),
        },
      },
      borderColor: { DEFAULT: token('line') },
      fontFamily: {
        ui: ['Plus Jakarta Sans', 'Readex Pro', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        book: ['Literata', 'Amiri', 'Georgia', 'serif'],
        wordmark: ['Literata', 'Amiri', 'Georgia', 'serif'],
      },
      borderRadius: { ctl: '8px', card: '16px' },
      boxShadow: { book: 'var(--shadow-book)', card: 'var(--shadow-card)', 'card-hover': 'var(--shadow-card-hover)', deck: 'var(--shadow-deck)' },
      backgroundImage: {
        chevron: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235F6B78' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
      },
      keyframes: {
        shelve: { from: { transform: 'translateY(-28px)', opacity: '0' } },
        'pulse-soft': { '50%': { opacity: '.5' } },
        rise: { from: { opacity: '0', transform: 'translateY(8px)' } },
        drain: { to: { transform: 'scaleX(0)' } },
      },
      animation: {
        shelve: 'shelve .55s cubic-bezier(.2, .8, .25, 1) both',
        'pulse-soft': 'pulse-soft 1.4s ease-in-out infinite',
        'spin-fast': 'spin .8s linear infinite',
        rise: 'rise .18s ease-out',
        'rise-toast': 'rise .2s ease-out',
        drain: 'drain linear forwards',
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      // Arabic-specific typography tweaks (taller line-height, no negative tracking).
      addVariant('ar', 'html[lang="ar"] &');
    }),
  ],
};
