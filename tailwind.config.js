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
    },
    extend: {
      colors: {
        paper: token('paper'),
        surface: token('surface'),
        sunk: token('sunk'),
        line: { DEFAULT: token('line'), strong: token('line-strong') },
        ink: { DEFAULT: token('ink'), 2: token('ink-2'), 3: token('ink-3') },
        ledge: token('ledge'),
        glaze: { DEFAULT: token('glaze'), deep: token('glaze-deep'), soft: token('glaze-soft') },
        'on-glaze': token('on-glaze'),
        cobalt: { DEFAULT: token('cobalt'), soft: token('cobalt-soft') },
        olive: { DEFAULT: token('olive'), soft: token('olive-soft') },
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
        ui: ['Readex Pro', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        book: ['Literata', 'Amiri', 'Georgia', 'serif'],
        wordmark: ['Literata', 'Amiri', 'Georgia', 'serif'],
      },
      borderRadius: { ctl: '10px' },
      boxShadow: { book: 'var(--shadow-book)' },
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
