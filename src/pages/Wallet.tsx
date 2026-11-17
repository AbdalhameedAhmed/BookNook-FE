import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Copy, ImageUp, ReceiptText, RefreshCw, Smartphone, Wallet as WalletIcon } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import { describeError } from '../errors';
import { useLanguage } from '../i18n';
import type { Language, MessageKey } from '../i18n';
import type { Wallet } from '../types';
import { Alert, FieldError } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { useToast } from '../components/ui/toast';
import { StatusPill } from '../components/book';
import { cn } from '../lib/utils';
import { ui } from '../lib/ui';

const allowedReceiptTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxReceiptBytes = 5 * 1024 * 1024;
const MIN_TOPUP = 1;
const MAX_TOPUP = 50_000;

type Field = 'sender' | 'amount' | 'receipt';

/** Mirrors the backend: accepts spaces/dashes and a +20 / 0020 prefix, returns 01XXXXXXXXX or null. */
export function normalizeEgyptMobile(value: string): string | null {
  let digits = value.replace(/[\s\-()]/g, '');
  for (const prefix of ['+20', '0020']) {
    if (digits.startsWith(prefix)) digits = `0${digits.slice(prefix.length)}`;
  }
  return /^01[0125]\d{8}$/.test(digits) ? digits : null;
}

export function formatEgp(amount: number, language: Language, t: (key: MessageKey) => string) {
  return `${amount.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} ${t('egpSuffix')}`;
}

export function formatDateTime(value: string, language: Language) {
  return new Date(value).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export function WalletPage() {
  const { session } = useAuth();
  const { t, language } = useLanguage();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    let active = true;
    const token = session?.access_token;
    if (!token) return () => { active = false; };
    setError('');
    api.wallet(token)
      .then((next) => { if (active) setWallet(next); })
      .catch((reason) => { if (active) setError(describeError(reason, t, 'walletLoadError')); });
    return () => { active = false; };
  }, [session?.access_token, t]);

  useEffect(() => load(), [load]);

  if (error) return <Alert title={t('walletLoadError')} onRetry={load} retryLabel={t('tryAgain')}>{error}</Alert>;
  if (!wallet) {
    return (
      <div className="grid gap-4" aria-busy="true" aria-label={t('loadingWallet')}>
        <span className={cn(ui.skeleton, 'h-36 w-full rounded-card')} />
        <span className={cn(ui.skeleton, 'h-72 w-full rounded-card')} />
      </div>
    );
  }

  const recipient = wallet.options.find((option) => option.method === 'e_wallet')?.recipient_number ?? '';

  return (
    <div className="grid gap-8 md:gap-10">
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="grid content-start gap-4 lg:col-span-5">
          <section className={cn(ui.card, 'relative overflow-hidden p-5 md:p-6')} aria-labelledby="wallet-balance-heading">
            <span className="pointer-events-none absolute -end-10 -top-10 h-36 w-36 rounded-full bg-glaze-fixed/40 blur-2xl" aria-hidden="true" />
            <div className="relative flex items-center gap-3">
              <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-glaze-fixed text-glaze-deep" aria-hidden="true"><WalletIcon size={22} /></span>
              <h2 id="wallet-balance-heading" className="text-label-lg font-semibold text-ink-2">{t('walletBalance')}</h2>
            </div>
            <p className="relative mt-3 font-book text-display-lg-mobile font-bold text-glaze-deep md:text-display-lg">{formatEgp(wallet.balance_egp, language, t)}</p>
            <p className="relative mt-1 text-body-sm text-ink-3">{t('walletBalanceNote')}</p>
          </section>

          <ChargingOptionCard recipient={recipient} />
        </div>

        <TopupForm className="lg:col-span-7" onSubmitted={load} />
      </div>

      <section aria-labelledby="topup-history-heading">
        <h2 id="topup-history-heading" className={cn(ui.blockTitle, 'text-ink')}>{t('topupHistory')}</h2>
        {wallet.topups.length === 0 ? (
          <EmptyState size="compact" icon={<ReceiptText size={22} />} title={t('noTopups')} description={t('noTopupsCopy')} />
        ) : (
          <ul className="grid gap-3">
            {wallet.topups.map((topup) => (
              <li key={topup.id} className={cn(ui.card, 'flex flex-wrap items-start justify-between gap-3 p-4 md:p-5')}>
                <div className="grid min-w-0 gap-1">
                  <span className="font-book text-headline-sm font-semibold text-ink">{formatEgp(topup.amount_egp, language, t)}</span>
                  <span className="text-body-sm text-ink-2">
                    {t('optionEwallet')} · {t('sentFrom')} <bdi dir="ltr">{topup.sender_number}</bdi>
                  </span>
                  <span className="text-body-sm text-ink-3">{formatDateTime(topup.created_at, language)}</span>
                  {topup.review_note ? (
                    <p className="mt-1 rounded-lg bg-sunk px-3 py-2 text-body-sm text-ink-2"><strong className="font-semibold text-ink">{t('reviewNote')}:</strong> {topup.review_note}</p>
                  ) : null}
                </div>
                <StatusPill status={topup.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ChargingOptionCard({ recipient }: { recipient: string }) {
  const { t } = useLanguage();
  const toast = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(recipient);
      toast.success(t('numberCopied'));
    } catch {
      /* Clipboard can be blocked; the number stays visible and selectable. */
    }
  };

  return (
    <section className={cn(ui.card, 'p-5 md:p-6')} aria-labelledby="charging-options-heading">
      <h2 id="charging-options-heading" className="font-book text-headline-sm font-semibold text-ink ar:leading-[1.5]">{t('chargingOptions')}</h2>
      {/* Only one method exists today, so it is shown as the chosen option rather than a real choice. */}
      <div className="mt-4 flex items-start gap-3 rounded-xl border-2 border-glaze bg-glaze-soft/40 p-4">
        <span className="mt-1 grid h-5 w-5 flex-none place-items-center rounded-full border-2 border-glaze" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-glaze" />
        </span>
        <span className="grid gap-0.5">
          <span className="flex items-center gap-1.5 text-label-lg font-semibold text-ink"><Smartphone size={17} className="text-glaze-deep" aria-hidden="true" />{t('optionEwallet')}</span>
          <span className="text-body-sm text-ink-2">{t('optionEwalletHint')}</span>
        </span>
      </div>

      <div className="mt-4 rounded-xl bg-sunk p-4">
        <p className="text-label-md font-semibold text-ink-2">{t('sendMoneyTo')}</p>
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
          <bdi dir="ltr" className="select-all font-book text-headline-md font-bold tabular-nums tracking-wide text-ink">{recipient}</bdi>
          <Button variant="secondary" size="sm" onClick={() => void copy()}><Copy size={15} aria-hidden="true" />{t('copyNumber')}</Button>
        </div>
      </div>

      <ol className="mt-4 grid gap-2.5 text-body-md text-ink-2">
        {(['topupStepSend', 'topupStepScreenshot', 'topupStepSubmit'] as const).map((key, index) => (
          <li key={key} className="flex gap-3">
            <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-glaze-fixed text-label-sm font-bold text-glaze-deep" aria-hidden="true">{index + 1}</span>
            <span>{t(key)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function TopupForm({ className, onSubmitted }: { className?: string; onSubmitted: () => void }) {
  const { session } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [sender, setSender] = useState('');
  const [amount, setAmount] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field, MessageKey>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!receipt) { setPreview(null); return; }
    const url = URL.createObjectURL(receipt);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [receipt]);

  const setFieldError = (field: Field, key?: MessageKey) => setErrors((current) => ({ ...current, [field]: key }));

  const pickReceipt = (file: File | null) => {
    setFieldError('receipt');
    if (!file) return;
    if (!allowedReceiptTypes.includes(file.type)) { setFieldError('receipt', 'invalidImageType'); return; }
    if (file.size > maxReceiptBytes) { setFieldError('receipt', 'receiptTooLarge'); return; }
    setReceipt(file);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const senderNumber = normalizeEgyptMobile(sender);
    const amountEgp = Number(amount);
    const next: Partial<Record<Field, MessageKey>> = {};
    if (!senderNumber) next.sender = 'fieldMobile';
    if (!Number.isInteger(amountEgp) || amountEgp < MIN_TOPUP || amountEgp > MAX_TOPUP) next.amount = 'fieldAmount';
    if (!receipt) next.receipt = 'receiptRequired';
    setErrors(next);
    const firstInvalid = (['sender', 'amount', 'receipt'] as Field[]).find((field) => next[field]);
    if (firstInvalid) {
      document.getElementById(`topup-${firstInvalid}`)?.focus();
      return;
    }
    if (!session || !senderNumber || !receipt) return;

    setSubmitting(true);
    try {
      await api.createTopup(session.access_token, { senderNumber, amountEgp, receipt });
      toast.success(t('topupSubmitted'), t('topupSubmittedCopy'));
      setSender('');
      setAmount('');
      setReceipt(null);
      onSubmitted();
    } catch (reason) {
      toast.error(t('topupFailed'), describeError(reason, t, 'topupFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const invalid = (field: Field) => ({
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `topup-${field}-error topup-${field}-hint` : `topup-${field}-hint`,
  });

  return (
    <form className={cn(ui.card, 'grid content-start gap-5 p-5 md:p-6', className)} onSubmit={(event) => void submit(event)} noValidate aria-labelledby="topup-form-heading">
      <h2 id="topup-form-heading" className="font-book text-headline-sm font-semibold text-ink ar:leading-[1.5]">{t('chargeWallet')}</h2>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={ui.field} htmlFor="topup-sender">
          <span className={ui.label}>{t('senderNumber')}</span>
          <input
            id="topup-sender" className={ui.control} dir="ltr" type="tel" inputMode="tel" autoComplete="tel" maxLength={20}
            placeholder="01XXXXXXXXX" value={sender} onChange={(event) => { setSender(event.target.value); setFieldError('sender'); }}
            aria-required="true" {...invalid('sender')}
          />
          <span id="topup-sender-hint" className={ui.hint}>{t('senderNumberHint')}</span>
          <FieldError id="topup-sender-error">{errors.sender ? t(errors.sender) : null}</FieldError>
        </label>

        <label className={ui.field} htmlFor="topup-amount">
          <span className={ui.label}>{t('amountPaid')}</span>
          <span className="relative">
            <input
              id="topup-amount" className={cn(ui.control, 'pe-16 font-semibold')} type="number" inputMode="numeric" min={MIN_TOPUP} max={MAX_TOPUP} step="1"
              value={amount} onChange={(event) => { setAmount(event.target.value); setFieldError('amount'); }}
              aria-required="true" {...invalid('amount')}
            />
            <span className="pointer-events-none absolute inset-y-0 end-4 flex items-center text-label-md font-semibold text-ink-3">{t('egpSuffix')}</span>
          </span>
          <span id="topup-amount-hint" className="sr-only">{t('fieldAmount')}</span>
          <FieldError id="topup-amount-error">{errors.amount ? t(errors.amount) : null}</FieldError>
        </label>
      </div>

      <div className={ui.field}>
        <span className={ui.label} id="topup-receipt-label">{t('transferReceipt')}</span>
        <button
          id="topup-receipt"
          type="button"
          className={cn(
            'group flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-line-strong bg-sunk p-5 text-center transition-colors hover:border-glaze hover:bg-surface',
            preview ? 'sm:flex-row sm:text-start' : 'min-h-[160px] justify-center',
            errors.receipt && 'border-pom',
          )}
          onClick={() => fileInput.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.preventDefault(); pickReceipt(event.dataTransfer.files?.[0] ?? null); }}
          aria-labelledby="topup-receipt-label topup-receipt-action"
          {...invalid('receipt')}
        >
          {preview ? <img className="max-h-48 w-auto max-w-full rounded-lg object-contain shadow-sm" src={preview} alt="" /> : null}
          <span className={cn('flex flex-col items-center gap-1', preview && 'sm:items-start')}>
            <span id="topup-receipt-hint" className="max-w-sm text-body-sm text-ink-3">{t('receiptHint')}</span>
            <span id="topup-receipt-action" className="mt-1 inline-flex items-center gap-1.5 rounded-ctl bg-sunk-3 px-4 py-2 text-label-md font-semibold text-ink shadow-sm transition-colors group-hover:bg-glaze-soft group-hover:text-glaze-deep">
              {preview ? <RefreshCw size={15} aria-hidden="true" /> : <ImageUp size={15} aria-hidden="true" />}
              {preview ? t('replaceReceipt') : t('chooseReceipt')}
            </span>
          </span>
        </button>
        <input ref={fileInput} className="sr-only" type="file" accept={allowedReceiptTypes.join(',')} tabIndex={-1} aria-hidden="true" onChange={(event) => { pickReceipt(event.target.files?.[0] ?? null); event.target.value = ''; }} />
        <FieldError id="topup-receipt-error">{errors.receipt ? t(errors.receipt) : null}</FieldError>
      </div>

      <Button type="submit" size="lg" block loading={submitting}>{t('submitTopup')}</Button>
    </form>
  );
}
