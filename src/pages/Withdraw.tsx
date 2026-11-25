import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, Banknote, Hourglass, Wallet as WalletIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { ApiError, describeError } from '../errors';
import { useLanguage } from '../i18n';
import type { MessageKey } from '../i18n';
import type { Wallet } from '../types';
import { Alert, FieldError } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { useToast } from '../components/ui/toast';
import { StatusPill } from '../components/book';
import { cn } from '../lib/utils';
import { ui } from '../lib/ui';
import { formatDateTime, formatEgp, normalizeEgyptMobile } from './Wallet';

const MAX_WITHDRAWAL = 50_000;

type Field = 'number' | 'amount' | 'confirm';

/**
 * Account → Wallet → Withdraw. The user asks for wallet money to be sent to their e-wallet;
 * a moderator sends it by hand and marks it paid (see docs/wallet.md).
 */
export function WithdrawPage() {
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

  const back = (
    <Link to="/account/wallet" className={cn(ui.textLink, 'inline-flex items-center gap-1.5 text-label-lg')}>
      <ArrowLeft size={17} className={ui.flipRtl} aria-hidden="true" />{t('backToWallet')}
    </Link>
  );

  if (error) return <div className="grid gap-4">{back}<Alert title={t('walletLoadError')} onRetry={load} retryLabel={t('tryAgain')}>{error}</Alert></div>;
  if (!wallet) {
    return (
      <div className="grid gap-4" aria-busy="true" aria-label={t('loadingWallet')}>
        <span className={cn(ui.skeleton, 'h-36 w-full rounded-card')} />
        <span className={cn(ui.skeleton, 'h-72 w-full rounded-card')} />
      </div>
    );
  }

  const pending = wallet.withdrawals.filter((item) => item.status === 'pending').reduce((sum, item) => sum + item.amount_egp, 0);
  // Prefill with the number used last time (a withdrawal, else the number they topped up from).
  const lastNumber = wallet.withdrawals[0]?.recipient_number ?? wallet.topups[0]?.sender_number ?? '';

  return (
    <div className="grid gap-8 md:gap-10">
      <div className="grid gap-3">
        {back}
        <div>
          <h2 className="font-book text-headline-md font-bold text-ink ar:leading-[1.5]">{t('withdrawTitle')}</h2>
          <p className={cn('mt-1 text-body-md text-ink-2', ui.measure)}>{t('withdrawCopy')}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="grid content-start gap-4 lg:col-span-5">
          <section className={cn(ui.card, 'relative overflow-hidden p-5 md:p-6')} aria-labelledby="withdraw-balance-heading">
            <span className="pointer-events-none absolute -end-10 -top-10 h-36 w-36 rounded-full bg-glaze-fixed/40 blur-2xl" aria-hidden="true" />
            <div className="relative flex items-center gap-3">
              <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-glaze-fixed text-glaze-deep" aria-hidden="true"><WalletIcon size={22} /></span>
              <h3 id="withdraw-balance-heading" className="text-label-lg font-semibold text-ink-2">{t('availableToWithdraw')}</h3>
            </div>
            <p className="relative mt-3 font-book text-display-lg-mobile font-bold text-glaze-deep md:text-display-lg ar:font-ui ar:leading-[1.7] ar:tracking-normal">{formatEgp(wallet.balance_egp, language, t)}</p>
            {pending > 0 ? (
              <p className="relative mt-3 flex items-center gap-2 rounded-lg bg-ochre-soft px-3 py-2 text-body-sm text-ink" role="status">
                <Hourglass size={16} className="flex-none text-ochre-ink" aria-hidden="true" />
                {formatEgp(pending, language, t)} · {t('withdrawalPendingNote')}
              </p>
            ) : null}
            {wallet.held_egp > 0 ? (
              <p className="relative mt-3 border-t border-line-strong/30 pt-3 text-body-sm text-ink-3">
                {t('walletHeld')} {formatEgp(wallet.held_egp, language, t)} · {t('withdrawHeldNote')}
              </p>
            ) : null}
          </section>

          <section className={cn(ui.card, 'p-5 md:p-6')} aria-label={t('withdrawTitle')}>
            <ol className="grid gap-2.5 text-body-md text-ink-2">
              {(['withdrawStepRequest', 'withdrawStepHold', 'withdrawStepPaid'] as const).map((key, index) => (
                <li key={key} className="flex gap-3">
                  <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-glaze-fixed text-label-sm font-bold text-glaze-deep" aria-hidden="true">{index + 1}</span>
                  <span>{t(key)}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-body-sm text-ink-3">
              <Link to="/contact" className={ui.textLink}>{t('navContact')}</Link>
            </p>
          </section>
        </div>

        {wallet.balance_egp > 0 ? (
          <WithdrawForm className="lg:col-span-7" balance={wallet.balance_egp} initialNumber={lastNumber} onSubmitted={load} />
        ) : (
          <div className={cn(ui.card, 'grid place-items-center p-5 md:p-6 lg:col-span-7')}>
            <EmptyState size="compact" icon={<Banknote size={22} />} title={t('withdrawNothing')} description={t('withdrawNothingCopy')} />
          </div>
        )}
      </div>

      <section aria-labelledby="withdraw-history-heading">
        <h2 id="withdraw-history-heading" className={cn(ui.blockTitle, 'text-ink')}>{t('withdrawalHistory')}</h2>
        {wallet.withdrawals.length === 0 ? (
          <EmptyState size="compact" icon={<Banknote size={22} />} title={t('noWithdrawals')} description={t('noWithdrawalsCopy')} />
        ) : (
          <ul className="grid gap-3">
            {wallet.withdrawals.map((item) => (
              <li key={item.id} className={cn(ui.card, 'flex flex-wrap items-start justify-between gap-3 p-4 md:p-5')}>
                <div className="grid min-w-0 gap-1">
                  <span className="font-book text-headline-sm font-semibold text-ink ar:font-ui ar:leading-[1.5]">{formatEgp(item.amount_egp, language, t)}</span>
                  <span className="text-body-sm text-ink-2">{t('sendTo')} <bdi dir="ltr">{item.recipient_number}</bdi></span>
                  <span className="text-body-sm text-ink-3">{formatDateTime(item.created_at, language)}</span>
                  {item.review_note ? (
                    <p className="mt-1 rounded-lg bg-sunk px-3 py-2 text-body-sm text-ink-2">
                      <strong className="font-semibold text-ink">{t(item.status === 'paid' ? 'transferReference' : 'reviewNote')}:</strong>{' '}
                      <span dir="auto">{item.review_note}</span>
                    </p>
                  ) : null}
                </div>
                <StatusPill status={item.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function WithdrawForm({ className, balance, initialNumber, onSubmitted }: {
  className?: string; balance: number; initialNumber: string; onSubmitted: () => void;
}) {
  const { session } = useAuth();
  const { t, language } = useLanguage();
  const toast = useToast();
  const [number, setNumber] = useState(initialNumber);
  const [amount, setAmount] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, MessageKey>>>({});
  const [submitting, setSubmitting] = useState(false);
  const max = Math.min(balance, MAX_WITHDRAWAL);

  const setFieldError = (field: Field, key?: MessageKey) => setErrors((current) => ({ ...current, [field]: key }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const recipientNumber = normalizeEgyptMobile(number);
    const amountEgp = Number(amount);
    const next: Partial<Record<Field, MessageKey>> = {};
    if (!recipientNumber) next.number = 'fieldMobile';
    if (!Number.isInteger(amountEgp) || amountEgp < 1 || amountEgp > max) next.amount = amountEgp > balance ? 'errorWithdrawTooMuch' : 'fieldWithdrawAmount';
    if (!confirmed) next.confirm = 'withdrawConfirmRequired';
    setErrors(next);
    const firstInvalid = (['number', 'amount', 'confirm'] as Field[]).find((field) => next[field]);
    if (firstInvalid) {
      document.getElementById(`withdraw-${firstInvalid}`)?.focus();
      return;
    }
    if (!session || !recipientNumber) return;

    setSubmitting(true);
    try {
      await api.createWithdrawal(session.access_token, { recipientNumber, amountEgp });
      toast.success(t('withdrawalSubmitted'), t('withdrawalSubmittedCopy'));
      setAmount('');
      setConfirmed(false);
      onSubmitted();
    } catch (reason) {
      const detail = reason instanceof ApiError && reason.status === 402 ? t('errorWithdrawTooMuch') : describeError(reason, t, 'withdrawalFailed');
      toast.error(t('withdrawalFailed'), detail);
      if (reason instanceof ApiError && reason.status === 402) onSubmitted();
    } finally {
      setSubmitting(false);
    }
  };

  const invalid = (field: Field) => ({
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `withdraw-${field}-error withdraw-${field}-hint` : `withdraw-${field}-hint`,
  });

  return (
    <form className={cn(ui.card, 'grid content-start gap-5 p-5 md:p-6', className)} onSubmit={(event) => void submit(event)} noValidate aria-labelledby="withdraw-form-heading">
      <h3 id="withdraw-form-heading" className="font-book text-headline-sm font-semibold text-ink ar:leading-[1.5]">{t('withdraw')}</h3>

      <label className={ui.field} htmlFor="withdraw-number">
        <span className={ui.label}>{t('withdrawNumber')}</span>
        <input
          id="withdraw-number" className={ui.control} dir="ltr" type="tel" inputMode="tel" autoComplete="tel" maxLength={20}
          placeholder="01XXXXXXXXX" value={number} onChange={(event) => { setNumber(event.target.value); setFieldError('number'); }}
          aria-required="true" {...invalid('number')}
        />
        <span id="withdraw-number-hint" className={ui.hint}>{t('withdrawNumberHint')}</span>
        <FieldError id="withdraw-number-error">{errors.number ? t(errors.number) : null}</FieldError>
      </label>

      <div className={ui.field}>
        <label className={ui.label} htmlFor="withdraw-amount">{t('withdrawAmount')}</label>
        <div className="flex gap-2">
          <span className="relative flex-1">
            <input
              id="withdraw-amount" className={cn(ui.control, 'w-full pe-16 font-semibold')} type="number" inputMode="numeric" min={1} max={max} step="1"
              value={amount} onChange={(event) => { setAmount(event.target.value); setFieldError('amount'); }}
              aria-required="true" {...invalid('amount')}
            />
            <span className="pointer-events-none absolute inset-y-0 end-4 flex items-center text-label-md font-semibold text-ink-3">{t('egpSuffix')}</span>
          </span>
          <Button variant="tonal" className="flex-none" onClick={() => { setAmount(String(max)); setFieldError('amount'); }}>{t('withdrawAll')}</Button>
        </div>
        <span id="withdraw-amount-hint" className={ui.hint}>{t('availableToWithdraw')}: {formatEgp(balance, language, t)}</span>
        <FieldError id="withdraw-amount-error">{errors.amount ? t(errors.amount) : null}</FieldError>
      </div>

      <div className={ui.field}>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl bg-sunk p-3 text-body-md text-ink" htmlFor="withdraw-confirm">
          <input
            id="withdraw-confirm" type="checkbox" className="mt-0.5 h-5 w-5 flex-none accent-[rgb(var(--glaze))]"
            checked={confirmed} onChange={(event) => { setConfirmed(event.target.checked); setFieldError('confirm'); }}
            aria-invalid={errors.confirm ? true : undefined} aria-describedby={errors.confirm ? 'withdraw-confirm-error' : undefined}
          />
          <span>{t('withdrawConfirmCheck')}</span>
        </label>
        <span id="withdraw-confirm-hint" hidden />
        <FieldError id="withdraw-confirm-error">{errors.confirm ? t(errors.confirm) : null}</FieldError>
      </div>

      <Button type="submit" size="lg" block loading={submitting}>{t('submitWithdrawal')}</Button>
    </form>
  );
}
