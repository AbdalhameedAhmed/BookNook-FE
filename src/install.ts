import { useCallback, useEffect, useState } from 'react';

/**
 * "Add to Home Screen" support (installable web app; see public/manifest.webmanifest).
 *
 * Chrome/Edge/Android fire `beforeinstallprompt`, which we keep so an "Install" button can show the
 * browser's dialog later. Safari on iPhone has no such event: users install from Share → Add to
 * Home Screen, which is also what makes Web Push alerts work on iPhone.
 */

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

let deferredPrompt: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== 'undefined') {
  // Registered at import time (from main.tsx) so the event is not missed before React mounts.
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; notify(); });
}

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

/** iPhone/iPad in the browser: installing (manually) is the only way to get push alerts there. */
export function needsIosInstall() {
  return isIos() && !isStandalone();
}

export function useInstallPrompt() {
  const [canPrompt, setCanPrompt] = useState(() => deferredPrompt !== null);
  const [installed, setInstalled] = useState(() => isStandalone());

  useEffect(() => {
    const update = () => { setCanPrompt(deferredPrompt !== null); setInstalled(isStandalone()); };
    listeners.add(update);
    const media = window.matchMedia('(display-mode: standalone)');
    media.addEventListener('change', update);
    return () => { listeners.delete(update); media.removeEventListener('change', update); };
  }, []);

  /** Shows the browser's install dialog. Resolves true when the user accepted. */
  const install = useCallback(async () => {
    const prompt = deferredPrompt;
    if (!prompt) return false;
    deferredPrompt = null;
    notify();
    await prompt.prompt();
    return (await prompt.userChoice).outcome === 'accepted';
  }, []);

  return { canPrompt, installed, iosManual: needsIosInstall(), install };
}
