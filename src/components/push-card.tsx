import { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { useAuth } from '../auth';
import { describeError } from '../errors';
import { useLanguage } from '../i18n';
import type { MessageKey } from '../i18n';
import { needsIosInstall } from '../install';
import { disablePush, enablePush, getPushState } from '../push';
import type { PushState } from '../push';
import { Button } from './ui/button';
import { useToast } from './ui/toast';
import { cn } from '../lib/utils';

/** Turns phone/desktop alerts (Web Push) on or off for this browser. Lives on Account → Settings. */
export function PushCard() {
  const { session } = useAuth();
  const { t, language } = useLanguage();
  const toast = useToast();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void getPushState().then((next) => { if (active) setState(next); });
    return () => { active = false; };
  }, []);

  // Push switched off on the server: nothing to offer. On iPhone in Safari, the install card explains alerts.
  if (state === null || state === 'unavailable' || (state === 'unsupported' && needsIosInstall())) return null;

  const turnOn = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const next = await enablePush(session.access_token, language);
      setState(next);
      if (next === 'on') toast.success(t('pushOnToast'));
    } catch (reason) {
      toast.error(t('pushFailed'), describeError(reason, t, 'pushFailed'));
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    await disablePush(session?.access_token);
    setState('off');
    setBusy(false);
    toast.success(t('pushOffToast'));
  };

  const copy: Record<Exclude<PushState, 'unavailable'>, MessageKey> = {
    unsupported: 'pushUnsupportedCopy', denied: 'pushDeniedCopy', off: 'pushOffCopy', on: 'pushOnCopy',
  };
  const Icon = state === 'on' ? BellRing : state === 'off' ? Bell : BellOff;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-card bg-sunk-3/60 p-4 sm:flex-nowrap sm:p-5">
      <span className={cn('grid h-12 w-12 flex-none place-items-center rounded-xl shadow-sm', state === 'on' ? 'bg-glaze text-on-glaze' : 'bg-surface text-glaze-deep')} aria-hidden="true">
        <Icon size={22} />
      </span>
      <div className="min-w-0 flex-1 basis-[14rem]">
        <h2 className="text-title-md font-bold text-ink">{t('pushTitle')}</h2>
        <p className="mt-0.5 text-body-sm text-ink-2">{t(copy[state])}</p>
      </div>
      {state === 'off' ? <Button className="w-full sm:w-auto" loading={busy} onClick={() => void turnOn()}>{t('pushTurnOn')}</Button> : null}
      {state === 'on' ? <Button className="w-full sm:w-auto" variant="secondary" loading={busy} onClick={() => void turnOff()}>{t('pushTurnOff')}</Button> : null}
    </div>
  );
}

