import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, CheckCheck, CircleCheck, KeyRound, Lock, Mail, MailCheck, RotateCcwKey, Send, TimerOff, TriangleAlert } from 'lucide-react';
import { Alert, FieldError } from '../components/ui/alert';
import { Button, buttonClass } from '../components/ui/button';
import { api } from '../api';
import { useAuth } from '../auth';
import { ApiError, describeError } from '../errors';
import { useLanguage } from '../i18n';
import { ui } from '../lib/ui';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/toast';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const card = cn(ui.card, 'relative overflow-hidden');
const fieldIcon = 'pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-3';
const inputClass = cn(ui.control, 'ps-11');

/** Reads the one-time token from an email link (`#token=…`). Kept in the fragment so it never reaches server logs. */
export function readLinkToken(): string {
  return new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';
}

/** Removes the one-time token from the address bar and browser history once it has been read. */
export function useClearLinkToken() {
  useEffect(() => {
    if (window.location.hash) window.history.replaceState(window.history.state, '', window.location.pathname);
  }, []);
}

export default function ResetPassword() {
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const navigate = useNavigate();
  const [token, setToken] = useState(readLinkToken);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);
  useClearLinkToken();

  const sendResetLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!email.trim() || !emailPattern.test(email.trim())) {
      setEmailError(t(email.trim() ? 'fieldEmail' : 'fieldRequired'));
      return;
    }

    setBusy(true);
    try {
      await api.auth.forgotPassword(email.trim());
      setLinkExpired(false);
      setSent(true);
    } catch (reason) {
      setError(describeError(reason, t, 'somethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  const updatePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) {
      setError(t('fieldPasswordShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwordsMismatch'));
      return;
    }

    setBusy(true);
    try {
      signIn(await api.auth.resetPassword(token, password));
      toast.success(t('passwordUpdated'));
      navigate('/account', { replace: true });
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 400) {
        setToken('');
        setLinkExpired(true);
        return;
      }
      setError(describeError(reason, t, 'somethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  const title = token ? t('resetSetTitle') : sent ? t('resetSentTitle') : t('resetTitle');
  const HeadingIcon = token ? KeyRound : RotateCcwKey;

  return (
    <div className={cn(ui.wrap, ui.page)}>
      <section className="mx-auto grid w-full max-w-[480px] gap-4" aria-labelledby="reset-password-title">
        {sent && !token ? (
          <div className={cn(card, 'flex flex-col items-center px-5 pb-6 pt-7 text-center')} role="status">
            <span className="absolute inset-x-0 top-0 h-1 bg-glaze" aria-hidden="true" />
            <span className="relative mb-4 grid h-20 w-20 place-items-center rounded-full bg-sunk-2 shadow-inner" aria-hidden="true">
              <MailCheck className="text-glaze" size={38} />
              <span className="absolute end-1 top-1 h-3 w-3 rounded-full bg-ochre ring-2 ring-surface" />
            </span>
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-sunk-2 px-3 py-1 text-label-sm font-semibold uppercase tracking-wider text-glaze-deep ar:normal-case ar:tracking-normal">
              <Send className={ui.flipRtl} size={14} aria-hidden="true" />{t('resetSentChip')}
            </span>
            <h1 id="reset-password-title" className={cn(ui.pageTitle, 'mb-3')}>{title}</h1>
            <p className="mb-4 w-full rounded-xl bg-sunk p-3 text-body-md font-medium text-ink">{t('resetEmailSent')}</p>
            <Link to="/signin" className={buttonClass({ variant: 'tonal', block: true })}>
              <ArrowLeft className={ui.flipRtl} size={18} aria-hidden="true" />{t('backToSignIn')}
            </Link>
            <p className="mt-4 text-body-sm text-ink-3">
              {t('resetSentHelp')}{' '}
              <button type="button" className="font-semibold text-glaze-deep hover:underline hover:underline-offset-[3px]" onClick={() => setSent(false)}>{t('resetTryAnother')}</button>.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-1 flex items-start gap-3">
              <span className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sunk-2 text-glaze-deep shadow-sm" aria-hidden="true"><HeadingIcon size={22} /></span>
              <h1 id="reset-password-title" className={ui.pageTitle}>{title}</h1>
            </div>

            {linkExpired && !token ? (
              <div className={cn(card, 'flex flex-col items-center px-5 pb-5 pt-6 text-center')}>
                <span className="absolute inset-x-0 top-0 h-1 bg-ochre" aria-hidden="true" />
                <span className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-ochre-soft text-ochre-ink" aria-hidden="true"><TimerOff size={28} /></span>
                <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-ochre-soft px-3 py-1 text-label-sm font-semibold uppercase tracking-wider text-ochre-ink ar:normal-case ar:tracking-normal">
                  <TriangleAlert size={14} aria-hidden="true" />{t('linkExpiredChip')}
                </span>
                <p className="text-body-md text-ink-2">{t('expiredResetLink')}</p>
              </div>
            ) : null}

            {error ? <Alert title={t('somethingWrong')} onDismiss={() => setError('')} dismissLabel={t('dismiss')}>{error}</Alert> : null}

            <div className={cn(card, 'p-5 pt-6')}>
              <span className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-glaze rtl:bg-gradient-to-l', token ? 'to-cobalt' : 'via-glaze-fixed to-cobalt-soft')} aria-hidden="true" />
              <p className="mb-4 text-body-md text-ink-2">{token ? t('resetSetCopy') : t('resetCopy')}</p>
              {token ? (
                <form onSubmit={updatePassword} className={ui.stack} noValidate>
                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="reset-password">{t('newPassword')}</label>
                    <div className="relative">
                      <KeyRound className={fieldIcon} size={20} aria-hidden="true" />
                      <input id="reset-password" className={inputClass} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={72} required aria-describedby="reset-password-hint" />
                    </div>
                  </div>
                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="reset-confirm-password">{t('confirmPassword')}</label>
                    <div className="relative">
                      <Lock className={fieldIcon} size={20} aria-hidden="true" />
                      <input id="reset-confirm-password" className={inputClass} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} maxLength={72} required />
                    </div>
                  </div>
                  <p id="reset-password-hint" className="flex items-center gap-2 rounded-ctl bg-sunk p-2.5 text-body-sm text-ink-2">
                    <CircleCheck className="shrink-0 text-glaze" size={18} aria-hidden="true" />{t('passwordHint')}
                  </p>
                  <Button block size="lg" type="submit" loading={busy} className="mt-1 text-label-lg">
                    {t('updatePassword')}
                    {!busy ? <CheckCheck size={18} aria-hidden="true" /> : null}
                  </Button>
                </form>
              ) : (
                <form onSubmit={sendResetLink} className={ui.stack} noValidate>
                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="reset-email">{t('email')}</label>
                    <div className="relative">
                      <Mail className={fieldIcon} size={20} aria-hidden="true" />
                      <input id="reset-email" className={inputClass} type="email" inputMode="email" autoComplete="email" dir="ltr" placeholder="name@example.com" value={email} onChange={(event) => { setEmail(event.target.value); setEmailError(''); }} aria-invalid={Boolean(emailError)} aria-describedby={emailError ? 'reset-email-error reset-email-hint' : 'reset-email-hint'} />
                    </div>
                    <FieldError id="reset-email-error">{emailError}</FieldError>
                    <span id="reset-email-hint" className="flex items-center gap-1.5 text-body-sm text-ink-2">
                      <BadgeCheck className="shrink-0 text-glaze" size={14} aria-hidden="true" />{t('resetEmailPrivacy')}
                    </span>
                  </div>
                  <Button block size="lg" type="submit" loading={busy} className="mt-1 text-label-lg">
                    {t('sendResetLink')}
                    {!busy ? <Send className={ui.flipRtl} size={18} aria-hidden="true" /> : null}
                  </Button>
                </form>
              )}
            </div>

            <Link to="/signin" className="mx-auto inline-flex min-h-11 items-center gap-1.5 text-label-lg font-semibold text-glaze-deep hover:text-glaze">
              <ArrowLeft className={ui.flipRtl} size={16} aria-hidden="true" />{t('backToSignIn')}
            </Link>
          </>
        )}

        <div className="mt-6 h-1.5 w-full rounded-full bg-ledge opacity-90 shadow-md" aria-hidden="true" />
      </section>
    </div>
  );
}
