import { useState } from 'react';
import { cn } from '../lib/utils';

/** Profile photo, or the first letter of the name when there is none (or it fails to load). */
export function Avatar({ name, url, className, alt = '' }: { name: string; url?: string | null; className?: string; alt?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = Boolean(url) && failedUrl !== url;
  return (
    <span
      className={cn('grid flex-none place-items-center overflow-hidden rounded-card bg-sunk-3 font-book font-semibold text-glaze shadow-[inset_0_2px_4px_rgb(0_0_0/.06)]', className)}
      aria-hidden={alt ? undefined : true}
    >
      {showPhoto ? (
        <img src={url ?? undefined} alt={alt} className="h-full w-full object-cover" onError={() => setFailedUrl(url ?? null)} />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}
