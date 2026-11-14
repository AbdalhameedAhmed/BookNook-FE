/**
 * The Rfoof logo from the Stitch brand board ("Normal F with shelf"):
 * an ink R, two F's whose middle arm is a shelf holding three books,
 * and a turquoise "OO" resting on an open book.
 * Colours come from the --logo-* tokens in styles.css so the mark follows light/dark theme.
 * Static copies for the favicon and emails live in public/favicon.svg and the backend templates.
 */
const shelfF = (
  <>
    <path fill="currentColor" d="M0 0H72V22H26V54H62V75H26V100H0Z" />
    <rect x="30" y="27" width="8" height="27" fill="rgb(var(--logo-glaze))" />
    <rect x="40" y="31" width="8" height="23" fill="rgb(var(--logo-cobalt))" />
    <rect x="50" y="29" width="8" height="25" fill="rgb(var(--logo-ochre))" transform="rotate(16 58 54)" />
  </>
);

/** Full "RFOOF" wordmark. Size it with a height class; ink parts use the current text colour. */
export function RfoofWordmark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg className={className} viewBox="0 -4 428 116" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
      <path fill="currentColor" fillRule="evenodd" d="M0 0H50C70 0 84 13 84 31C84 46 75 57 61 61L87 100H57L35 63H26V100H0Z M26 22V42H50C56 42 60 38 60 32C60 26 56 22 50 22Z" />
      <g transform="translate(96 0)">{shelfF}</g>
      <g transform="translate(176 0)" fill="rgb(var(--logo-glaze))">
        <path fillRule="evenodd" d="M40 4A40 40 0 1 1 40 84A40 40 0 1 1 40 4Z M40 25A19 19 0 1 0 40 63A19 19 0 1 0 40 25Z" />
        <path fillRule="evenodd" d="M124 4A40 40 0 1 1 124 84A40 40 0 1 1 124 4Z M124 25A19 19 0 1 0 124 63A19 19 0 1 0 124 25Z" />
        <path d="M-2 88C26 80 57 82 82 95C107 82 138 80 166 88V95C138 88 107 90 82 103C57 90 26 88 -2 95Z" />
        <path d="M2 99C28 93 57 95 82 107C107 95 136 93 162 99V103C136 98 107 100 82 111C57 100 28 98 2 103Z" opacity=".75" />
      </g>
      <g transform="translate(356 0)">{shelfF}</g>
    </svg>
  );
}

/** The app icon: a white shelf-F with its books on a turquoise tile. */
export function RfoofIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 512 512" aria-hidden="true" focusable="false">
      <rect width="512" height="512" rx="112" fill="#12797B" />
      <g transform="translate(150 106) scale(3)">
        <path fill="#FFFFFF" d="M0 0H72V22H26V54H62V75H26V100H0Z" />
        <rect x="30" y="27" width="8" height="27" fill="#FFFFFF" opacity=".92" />
        <rect x="40" y="31" width="8" height="23" fill="#B4C5FF" />
        <rect x="50" y="29" width="8" height="25" fill="#F9BC49" transform="rotate(16 58 54)" />
      </g>
    </svg>
  );
}
