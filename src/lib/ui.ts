/**
 * Shared Tailwind class strings for patterns used on several pages.
 * Keep one-off styling inline in the component instead.
 */

/** `:hover` only while the element is not disabled (works on links too, unlike `enabled:`). */
export const hoverable = '[&:not(:disabled):hover]';

export const ui = {
  wrap: 'mx-auto w-full max-w-[1240px] px-[var(--gutter)]',
  page: 'pb-[72px] pt-5 md:pb-24 md:pt-8',

  pageTitle: 'font-book text-headline-lg-mobile font-bold text-ink md:text-headline-lg ar:leading-[1.4] ar:tracking-normal',
  sectionTitle: 'font-book text-headline-sm font-bold text-ink md:text-headline-md ar:leading-[1.5] ar:tracking-normal',
  blockTitle: 'mb-3.5 font-book text-headline-sm font-semibold ar:leading-[1.5]',
  blockHead: 'mb-3.5 flex items-center justify-between gap-3',

  muted: 'text-ink-3',
  fine: 'text-13 text-ink-3',
  measure: 'max-w-[62ch]',
  textLink: 'font-semibold text-glaze-deep underline decoration-1 underline-offset-[3px] hover:text-glaze',
  sep: 'mx-2.5 inline-block h-[0.9em] w-px bg-line-strong align-[-0.1em]',
  stack: 'grid gap-4',

  field: 'flex flex-col gap-1.5',
  label: 'text-label-lg font-semibold text-ink',
  optional: 'text-sm font-normal text-ink-3',
  hint: 'text-body-sm text-ink-3',
  control:
    'min-h-12 w-full rounded-xl border border-line bg-sunk px-3.5 py-[11px] text-base text-ink transition-[border-color,box-shadow,background-color] duration-150 ease-[ease] placeholder:text-ink-3/80 focus:border-glaze focus:bg-surface focus:shadow-[0_0_0_3px_rgb(var(--glaze-soft))] focus:outline-none aria-[invalid=true]:border-pom aria-[invalid=true]:focus:shadow-[0_0_0_3px_rgb(var(--pom-soft))]',
  textarea: 'min-h-24 resize-y leading-normal',

  rows: 'border-t border-line [&>li]:border-b [&>li]:border-line',
  rowMain: 'grid min-w-0 flex-1 content-start gap-1',
  rowTitle: 'text-title-md font-bold',
  rowTitleLink: 'text-title-md font-bold hover:text-glaze-deep',
  rowMeta: 'text-body-md text-ink-2',
  rowActions: 'mt-2 flex flex-wrap gap-2',

  /** White rounded panel with a soft shadow (Stitch cards and form sections). */
  card: 'rounded-card bg-surface shadow-card',
  /** Small uppercase kicker above a heading. */
  eyebrow: 'text-label-md font-bold uppercase tracking-[0.08em] text-glaze-deep ar:normal-case ar:tracking-normal',
  skeleton: 'block animate-pulse-soft rounded-lg bg-line',
  backLink: 'mb-3 inline-flex min-h-11 items-center gap-1.5 font-medium text-ink-2 hover:text-ink',
  flipRtl: 'rtl:-scale-x-100',
};
