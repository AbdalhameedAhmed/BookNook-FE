import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, FieldError } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { useAuth } from '../auth';
import { describeError } from '../errors';
import { useLanguage } from '../i18n';
import { ui } from '../lib/ui';
import { supabase } from '../supabase';
import { useToast } from '../components/ui/toast';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ResetPassword() {
  const { session, isLoading } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const sendResetLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!email.trim() || !emailPattern.test(email.trim())) {
      setEmailError(t(email.trim() ? 'fieldEmail' : 'fieldRequired'));
      return;
    }
    if (!supabase) {
      setError(t('supabaseMissing'));
      return;
    }

    setBusy(true);
    try {
      const { error: requestError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (requestError) {
        setError(describeError(requestError, t, 'somethingWrong'));
        return;
      }
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
    if (password.length < 6) {
      setError(t('fieldPasswordShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwordsMismatch'));
      return;
    }
    if (!supabase) {
      setError(t('supabaseMissing'));
      return;
    }

    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(describeError(updateError, t, 'somethingWrong'));
        return;
      }
      toast.success(t('passwordUpdated'));
      navigate('/account', { replace: true });
    } catch (reason) {
      setError(describeError(reason, t, 'somethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <div className="px-4 py-24 text-center text-ink-3" aria-live="polite">{t('loadingSession')}</div>;

  return (
    <div className={`${ui.wrap} ${ui.page}`}>
      <section className="mx-auto grid w-full max-w-[420px] gap-[18px]" aria-labelledby="reset-password-title">
        <h1 id="reset-password-title" className={ui.pageTitle}>{t('resetTitle')}</h1>
        <p className={ui.muted}>{session ? t('newPassword') : t('resetCopy')}</p>

        {error ? <Alert title={t('somethingWrong')} onDismiss={() => setError('')} dismissLabel={t('dismiss')}>{error}</Alert> : null}

        {session ? (
          <form onSubmit={updatePassword} className={ui.stack} noValidate>
            <div className={ui.field}>
              <label className={ui.label} htmlFor="reset-password">{t('newPassword')}</label>
              <input id="reset-password" className={ui.control} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
            </div>
            <div className={ui.field}>
              <label className={ui.label} htmlFor="reset-confirm-password">{t('confirmPassword')}</label>
              <input id="reset-confirm-password" className={ui.control} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={6} required />
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

        {!session ? <Link to="/signin" className={ui.textLink}>{t('backToSignIn')}</Link> : null}
      </section>
    </div>
  );
}