import { useId, useMemo, useState } from 'react';
import { Copy, MessageCircle, Send, Sparkles } from 'lucide-react';
import { useLanguage } from '../i18n';
import { governorateName, sortedGovernorates } from '../lib/listing';
import { MAX_INTERESTS, buildInstinctMessage, chatShareUrl } from '../lib/instinct';
import type { ChatApp } from '../lib/instinct';
import { cn } from '../lib/utils';
import { ui } from '../lib/ui';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';
import { useToast } from './ui/toast';

const APPS: Array<{ id: ChatApp; label: string; icon: typeof Send }> = [
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'telegram', label: 'Telegram', icon: Send },
];

/** "Ask Instinct" button: writes a message for the user's Instinct chat and opens WhatsApp or Telegram. */
export function InstinctButton({ defaultGovernorate = '', className }: { defaultGovernorate?: string; className?: string }) {
  const { t, language } = useLanguage();
  const toast = useToast();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [interests, setInterests] = useState('');
  const [governorate, setGovernorate] = useState(defaultGovernorate);
  const [app, setApp] = useState<ChatApp>('whatsapp');
  const [error, setError] = useState(false);

  const siteUrl = window.location.origin;
  const message = useMemo(() => buildInstinctMessage({
    interests: interests || '…',
    siteUrl,
    governorateName: governorateName(governorate, language) || undefined,
    language,
  }), [interests, siteUrl, governorate, language]);

  const openDialog = () => { setGovernorate(defaultGovernorate); setError(false); setOpen(true); };

  const openChat = () => {
    if (!interests.trim()) { setError(true); document.getElementById(`${id}-interests`)?.focus(); return; }
    window.open(chatShareUrl(app, message, siteUrl), '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  const copyMessage = async () => {
    if (!interests.trim()) { setError(true); return; }
    try {
      await navigator.clipboard.writeText(message);
      toast.success(t('instinctCopied'));
    } catch { /* Clipboard can be blocked; the preview stays selectable. */ }
  };

  const appLabel = APPS.find((item) => item.id === app)?.label ?? '';

  return (
    <>
      <Button variant="secondary" className={cn('min-h-12 rounded-xl', className)} onClick={openDialog}>
        <Sparkles size={18} aria-hidden="true" />{t('instinctButton')}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('instinctTitle')}
        description={t('instinctCopy')}
        icon={<Sparkles size={22} />}
        closeLabel={t('dismiss')}
        footer={(
          <>
            <Button onClick={openChat}>{t('instinctOpen').replace('{app}', appLabel)}</Button>
            <Button variant="secondary" onClick={() => void copyMessage()}><Copy size={16} aria-hidden="true" />{t('instinctCopyMessage')}</Button>
          </>
        )}
      >
        <div className="grid gap-4">
          <div className={ui.field}>
            <label className={ui.label} htmlFor={`${id}-interests`}>{t('instinctInterests')}</label>
            <textarea
              id={`${id}-interests`} className={cn(ui.control, 'min-h-20 py-2.5')} rows={2} maxLength={MAX_INTERESTS}
              placeholder={t('instinctInterestsPlaceholder')} value={interests}
              onChange={(event) => { setInterests(event.target.value); setError(false); }}
              aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined}
            />
            {error ? <p id={`${id}-error`} className="text-body-sm text-pom" role="alert">{t('instinctInterestsRequired')}</p> : null}
          </div>

          <div className={ui.field}>
            <label className={ui.label} htmlFor={`${id}-governorate`}>{t('instinctNearMe')}</label>
            <select
              id={`${id}-governorate`} value={governorate} onChange={(event) => setGovernorate(event.target.value)}
              className={cn(ui.control, 'appearance-none bg-chevron bg-[position:right_12px_center] bg-no-repeat pe-9 rtl:bg-[position:left_12px_center]')}
            >
              <option value="">{t('instinctAnyGovernorate')}</option>
              {sortedGovernorates(language).map((item) => <option key={item.code} value={item.code}>{item[language]}</option>)}
            </select>
          </div>

          <fieldset className="grid gap-2">
            <legend className={cn(ui.label, 'mb-2')}>{t('instinctApp')}</legend>
            <div className="grid grid-cols-2 gap-2">
              {APPS.map(({ id: appId, label, icon: Icon }) => (
                <label key={appId} className={cn(
                  'flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-3 text-label-lg font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-glaze',
                  app === appId ? 'border-glaze bg-glaze-soft/50 text-glaze-deep' : 'border-line bg-surface text-ink-2',
                )}>
                  <input type="radio" name={`${id}-app`} value={appId} checked={app === appId} onChange={() => setApp(appId)} className="sr-only" />
                  <Icon size={18} aria-hidden="true" />{label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-1.5">
            <p className={ui.label}>{t('instinctPreview')}</p>
            <p dir="auto" className="max-h-40 select-all overflow-y-auto whitespace-pre-wrap rounded-xl bg-sunk p-3 text-body-sm text-ink-2 [overflow-wrap:anywhere]">{message}</p>
            <p className={ui.hint}>{t('instinctHint')}</p>
          </div>
        </div>
      </Dialog>
    </>
  );
}
