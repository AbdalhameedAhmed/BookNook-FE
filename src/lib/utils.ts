import { extendTailwindMerge } from 'tailwind-merge';

// Teach tailwind-merge the custom font-size keys, so `text-13` isn't mistaken for a colour.
// Our font sizes don't set line-height (see tailwind.config.js), so `text-*` must not drop `leading-*`.
const twMerge = extendTailwindMerge({
  override: {
    conflictingClassGroups: { 'font-size': [] },
  },
  extend: {
    classGroups: {
      'font-size': [{ text: ['2xs', '13', '15', '17', '21', '22', '28', '30'] }],
    },
  },
});

/** Joins class names, letting later Tailwind classes override earlier conflicting ones. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return twMerge(classes.filter(Boolean).join(' '));
}
