/**
 * Shared Tailwind class strings for patterns used on several pages.
 * Keep one-off styling inline in the component instead.
 */

/** `:hover` only while the element is not disabled (works on links too, unlike `enabled:`). */
export const hoverable = '[&:not(:disabled):hover]';

export const ui = {
  wrap: 'mx-auto w-full max-w-[1180px] px-[var(--gutter)]',
  page: 'pb-[72px] pt-5 md:pb-24 md:pt-8',

  pageTitle: 'font-book text-[clamp(1.75rem,4vw,2.375rem)] font-semibold leading-[1.15] tracking-[-0.015em]',
  sectionTitle: 'font-book text-[clamp(1.5rem,3vw,2rem)] font-semibold leading-[1.2] tracking-[-0.01em]',
  blockTitle: 'mb-3.5 font-book text-22 font-semibold leading-[1.25]',
  blockHead: 'mb-3.5 flex items-center justify-between gap-3',

  muted: 'text-ink-3',
  fine: 'text-13 text-ink-3',
  measure: 'max-w-[62ch]',
  textLink: 'font-semibold text-glaze underline decoration-1 underline-offset-[3px] hover:text-glaze-deep',
  sep: 'mx-2.5 inline-block h-[0.9em] w-px bg-line-strong align-[-0.1em]',
  stack: 'grid gap-4',

  field: 'flex flex-col gap-1.5',
  label: 'text-15 font-semibold',
  optional: 'text-sm font-normal text-ink-3',
  hint: 'text-13 text-ink-3',
  control:
    'min-h-12 w-full rounded-ctl border border-line-strong bg-surface px-3.5 py-[11px] text-base transition-[border-color,box-shadow] duration-150 ease-[ease] placeholder:text-ink-3/80 focus:border-glaze focus:shadow-[0_0_0_3px_rgb(var(--glaze-soft))] focus:outline-none aria-[invalid=true]:border-pom aria-[invalid=true]:focus:shadow-[0_0_0_3px_rgb(var(--pom-soft))]',
  textarea: 'min-h-24 resize-y leading-normal',

  rows: 'border-t border-line [&>li]:border-b [&>li]:border-line',
  rowMain: 'grid min-w-0 flex-1 content-start gap-1',
  rowTitle: 'font-book text-17 font-semibold leading-[1.3]',
  rowTitleLink: 'font-book text-17 font-semibold leading-[1.3] hover:underline hover:underline-offset-[3px]',
  rowMeta: 'text-sm text-ink-2',
  rowActions: 'mt-2 flex flex-wrap gap-2',

  skeleton: 'block animate-pulse-soft rounded-lg bg-line',
  backLink: 'mb-3 inline-flex min-h-11 items-center gap-1.5 font-medium text-ink-2 hover:text-ink',
  flipRtl: 'rtl:-scale-x-100',
};
