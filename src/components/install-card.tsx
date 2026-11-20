import { useState } from 'react';
import { Share, Smartphone, SquarePlus, X } from 'lucide-react';
import { useInstallPrompt } from '../install';
import { useLanguage } from '../i18n';
import { Button } from './ui/button';
import { useToast } from './ui/toast';
import { cn } from '../lib/utils';

const DISMISS_KEY = 'rfoof.installDismissed';

function wasDismissed() {
  try { return window.localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
}

/**
 * Invites the user to add Rfoof to their home screen. Shows the browser's install dialog where
 * supported (Android/Chrome), or the Share → Add to Home Screen steps on iPhone. Renders nothing
 * once installed or when the browser can't install.
 */
export function InstallCard({ dismissible = true, className }: { dismissible?: boolean; className?: string }) {
  const { t } = useLanguage();
  const toast = useToast();
  const { canPrompt, installed, iosManual, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => dismissible && wasDismissed());

  if (installed || dismissed || !(canPrompt || iosManual)) return null;

  const dismiss = () => {
    setDismissed(true);
    try { window.localStorage.setItem(DISMISS_KEY, '1'); } catch { /* Private mode: hidden for this visit only. */ }
  };

  const onInstall = async () => {
    if (await install()) toast.success(t('installDone'));
  };

  return (
    <div className={cn('relative flex flex-wrap items-center gap-4 rounded-card bg-glaze-soft/40 p-4 sm:flex-nowrap sm:p-5', className)}>
      <span className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-glaze text-on-glaze shadow-sm" aria-hidden="true">
        <Smartphone size={22} />
      </span>
      <div className={cn('min-w-0 flex-1 basis-[14rem]', dismissible && 'pe-8')}>
        <h2 className="text-title-md font-bold text-ink">{t('installTitle')}</h2>
        {iosManual ? (
          <ol className="mt-1 grid gap-1 text-body-sm text-ink-2">
            <li className="flex items-center gap-1.5">
              <span className="font-semibold text-ink">1.</span>{t('installIosStepShare')}
              <Share size={16} className="flex-none text-cobalt" aria-label={t('installShareIcon')} />
            </li>
            <li className="flex items-center gap-1.5">
              <span className="font-semibold text-ink">2.</span>{t('installIosStepAdd')}
              <SquarePlus size={16} className="flex-none text-ink" aria-hidden="true" />
            </li>
            <li className="text-ink-3">{t('installIosAlerts')}</li>
          </ol>
        ) : (
          <p className="mt-0.5 text-body-sm text-ink-2">{t('installCopy')}</p>
        )}
      </div>
      {canPrompt && !iosManual ? <Button className="w-full sm:w-auto" onClick={() => void onInstall()}>{t('installButton')}</Button> : null}
      {dismissible ? (
        <button
          type="button"
          onClick={dismiss}
          className="absolute end-2 top-2 grid h-10 w-10 place-items-center rounded-full text-ink-3 hover:bg-sunk hover:text-ink"
          aria-label={t('installDismiss')}
        >
          <X size={18} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
