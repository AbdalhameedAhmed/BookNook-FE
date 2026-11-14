import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, FieldError } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { api } from '../api';
import { useAuth } from '../auth';
import { ApiError, describeError } from '../errors';
import { useLanguage } from '../i18n';
import { ui } from '../lib/ui';
import { useToast } from '../components/ui/toast';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  return (
    <div className={`${ui.wrap} ${ui.page}`}>
      <section className="mx-auto grid w-full max-w-[420px] gap-[18px]" aria-labelledby="reset-password-title">
        <h1 id="reset-password-title" className={ui.pageTitle}>{t('resetTitle')}</h1>
        <p className={ui.muted}>{token ? t('newPassword') : linkExpired ? t('expiredResetLink') : t('resetCopy')}</p>

        {error ? <Alert title={t('somethingWrong')} onDismiss={() => setError('')} dismissLabel={t('dismiss')}>{error}</Alert> : null}

        {token ? (
          <form onSubmit={updatePassword} className={ui.stack} noValidate>
            <div className={ui.field}>
              <label className={ui.label} htmlFor="reset-password">{t('newPassword')}</label>
              <input id="reset-password" className={ui.control} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={72} required aria-describedby="reset-password-hint" />
              <span id="reset-password-hint" className={ui.hint}>{t('passwordHint')}</span>
            </div>
            <div className={ui.field}>
              <label className={ui.label} htmlFor="reset-confirm-password">{t('confirmPassword')}</label>
              <input id="reset-confirm-password" className={ui.control} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} maxLength={72} required />
            </div>
            <Button block size="lg" type="submit" loading={busy}>{t('updatePassword')}</Button>
          </form>
        ) : sent ? (
          <p className="rounded-e-xl border-s-[3px] border-glaze bg-surface px-[18px] py-4 text-ink-2" role="status">{t('resetEmailSent')}</p>
        ) : (
          <form onSubmit={sendResetLink} className={ui.stack} noValidate>
            <div className={ui.field}>
              <label className={ui.label} htmlFor="reset-email">{t('email')}</label>
              <input id="reset-email" className={ui.control} type="email" inputMode="email" autoComplete="email" dir="ltr" value={email} onChange={(event) => { setEmail(event.target.value); setEmailError(''); }} aria-invalid={Boolean(emailError)} aria-describedby={emailError ? 'reset-email-error' : undefined} />
              <FieldError id="reset-email-error">{emailError}</FieldError>
            </div>
            <Button block size="lg" type="submit" loading={busy}>{t('sendResetLink')}</Button>
          </form>
        )}

        <Link to="/signin" className={ui.textLink}>{t('backToSignIn')}</Link>
      </section>
    </div>
  );
}
