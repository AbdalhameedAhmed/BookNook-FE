import { useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { DecorativeShelf } from '../components/book';
import { cn } from '../lib/utils';
import { ui } from '../lib/ui';

const switchButton = 'min-h-[42px] rounded-[9px] border-0 bg-transparent px-1.5 py-px font-medium text-ink-2 aria-pressed:bg-surface aria-pressed:font-semibold aria-pressed:text-ink aria-pressed:shadow-[0_1px_2px_rgb(23_32_46/.12)]';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { ApiError } from '../errors';
import { useAuth } from '../auth';
import { useLanguage } from '../i18n';
import type { MessageKey } from '../i18n';
import { describeError } from '../errors';
import { Alert, FieldError } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { useToast } from '../components/ui/toast';

type RedirectState = { from?: { pathname?: string } | string; authError?: 'expired' };
type Field = 'displayName' | 'email' | 'password';
type FieldErrors = Partial<Record<Field, MessageKey>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const benefits: MessageKey[] = ['authBenefitList', 'authBenefitRequest', 'authBenefitTrack'];

export default function SignIn() {
  const { session, isLoading, signIn } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const redirectState = location.state as RedirectState | null;
  const destination = typeof redirectState?.from === 'string'
    ? redirectState.from
    : redirectState?.from?.pathname || '/account';
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState(() => redirectState?.authError === 'expired' ? t('expiredEmailLink') : '');
  const [busy, setBusy] = useState(false);
  const [canResendCode, setCanResendCode] = useState(redirectState?.authError === 'expired');

  if (isLoading) return <div className="px-4 py-24 text-center text-ink-3" aria-live="polite">{t('loadingSession')}</div>;
  if (session) return <Navigate to={destination} replace />;

  const isSignUp = mode === 'sign_up';

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (isSignUp && !displayName.trim()) errors.displayName = 'fieldRequired';
    if (!email.trim()) errors.email = 'fieldRequired';
    else if (!emailPattern.test(email.trim())) errors.email = 'fieldEmail';
    if (!password) errors.password = 'fieldRequired';
    else if (isSignUp && password.length < 8) errors.password = 'fieldPasswordShort';
    return errors;
  };

  const clearFieldError = (field: Field) => setFieldErrors((current) => ({ ...current, [field]: undefined }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    const errors = validate();
    setFieldErrors(errors);
    const firstInvalid = (Object.keys(errors) as Field[]).find((field) => errors[field]);
    if (firstInvalid) {
      document.getElementById(`signin-${firstInvalid}`)?.focus();
      return;
    }

    setBusy(true);
    try {
      if (isSignUp) {
        await api.auth.signUp(email.trim(), password, displayName.trim());
        toast.success(t('accountCreatedToast'), t('checkInbox'));
        setCanResendCode(true);
        setMode('sign_in');
        setPassword('');
        return;
      }
      signIn(await api.auth.logIn(email.trim(), password));
      setCanResendCode(false);
      toast.success(t('signedInToast'));
      navigate(destination, { replace: true });
    } catch (reason) {
      setCanResendCode(!isSignUp && reason instanceof ApiError && reason.detail === 'Email not confirmed');
      setFormError(describeError(reason, t, 'somethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next: 'sign_in' | 'sign_up') => {
    setMode(next);
    setFormError('');
    setFieldErrors({});
    setCanResendCode(false);
  };

  const resendCode = async () => {
    if (!email.trim() || !emailPattern.test(email.trim())) {
      setFieldErrors({ email: email.trim() ? 'fieldEmail' : 'fieldRequired' });
      document.getElementById('signin-email')?.focus();
      return;
    }

    setBusy(true);
    setFormError('');
    try {
      await api.auth.resendConfirmation(email.trim());
      toast.success(t('confirmationResent'), t('checkInbox'));
    } catch (reason) {
      setFormError(describeError(reason, t, 'somethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  const fieldProps = (field: Field, describedBy?: string, className?: string) => {
    const ids = [fieldErrors[field] ? `signin-${field}-error` : null, describedBy].filter(Boolean).join(' ');
    return {
      id: `signin-${field}`,
      className: cn(ui.control, className),
      'aria-invalid': fieldErrors[field] ? true : undefined,
      'aria-describedby': ids || undefined,
    };
  };

  return (
    <div className="mx-auto grid w-full max-w-[1080px] gap-12 px-[var(--gutter)] pb-[72px] pt-8 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-20 lg:pt-16">
      <div className="grid w-full max-w-[420px] gap-[18px]">
        <h1 className={ui.pageTitle}>{isSignUp ? t('signUpTitle') : t('signInTitle')}</h1>
        <p className={ui.muted}>{isSignUp ? t('signUpCopy') : t('signInCopy')}</p>

        <div className="grid grid-cols-[1fr_1fr] gap-1 rounded-xl bg-sunk p-1" role="group" aria-label={t('signIn')}>
          <button type="button" className={switchButton} aria-pressed={!isSignUp} onClick={() => switchMode('sign_in')}>{t('signIn')}</button>
          <button type="button" className={switchButton} aria-pressed={isSignUp} onClick={() => switchMode('sign_up')}>{t('createAccount')}</button>
        </div>

        {formError ? (
          <Alert title={isSignUp ? t('signUpFailed') : t('signInFailed')} onDismiss={() => setFormError('')} dismissLabel={t('dismiss')}>
            {formError}
          </Alert>
        ) : null}

        <form onSubmit={submit} className={ui.stack} noValidate>
          {isSignUp ? (
            <div className={ui.field}>
              <label className={ui.label} htmlFor="signin-displayName">{t('yourName')}</label>
              <input {...fieldProps('displayName')} value={displayName} onChange={(event) => { setDisplayName(event.target.value); clearFieldError('displayName'); }} autoComplete="name" placeholder={t('nameHint')} maxLength={80} />
              <FieldError id="signin-displayName-error">{fieldErrors.displayName ? t(fieldErrors.displayName) : null}</FieldError>
            </div>
          ) : null}
          <div className={ui.field}>
            <label className={ui.label} htmlFor="signin-email">{t('email')}</label>
            <input {...fieldProps('email')} type="email" inputMode="email" value={email} onChange={(event) => { setEmail(event.target.value); clearFieldError('email'); }} autoComplete="email" placeholder="name@example.com" dir="ltr" />
            <FieldError id="signin-email-error">{fieldErrors.email ? t(fieldErrors.email) : null}</FieldError>
          </div>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="signin-password">{t('password')}</label>
            <div className="relative">
              <input {...fieldProps('password', isSignUp ? 'signin-password-hint' : undefined, 'pe-14')} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => { setPassword(event.target.value); clearFieldError('password'); }} autoComplete={isSignUp ? 'new-password' : 'current-password'} />
              <Button variant="ghost" size="icon" className="absolute end-1 top-1/2 -translate-y-1/2" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t('hidePassword') : t('showPassword')} aria-pressed={showPassword}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </Button>
            </div>
            {isSignUp && !fieldErrors.password ? <span id="signin-password-hint" className={ui.hint}>{t('passwordHint')}</span> : null}
            <FieldError id="signin-password-error">{fieldErrors.password ? t(fieldErrors.password) : null}</FieldError>
          </div>
          <Button block size="lg" type="submit" loading={busy}>
            {busy ? t('working') : isSignUp ? t('createAccount') : t('signIn')}
          </Button>
        </form>

        {!isSignUp ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-14">
            <Link to="/reset-password" className={ui.textLink}>{t('forgotPassword')}</Link>
            {canResendCode ? (
              <Button variant="ghost" size="sm" onClick={() => void resendCode()} loading={busy}>
                {t('resendCode')}
              </Button>
            ) : null}
          </div>
        ) : null}

        <p className={cn(ui.fine, 'flex gap-2')}><ShieldCheck className="shrink-0 text-glaze" size={16} aria-hidden="true" />{t('authPrivacy')}</p>
      </div>

      <aside className="hidden lg:grid lg:gap-5" aria-labelledby="auth-aside-title">
        <DecorativeShelf />
        <h2 id="auth-aside-title" className="mt-4 font-book text-30 font-semibold leading-[1.2]">{t('authAsideTitle')}</h2>
        <ul>
          {benefits.map((key) => <li key={key} className="border-t border-line py-3 text-ink-2">{t(key)}</li>)}
        </ul>
      </aside>
    </div>
  );
}
