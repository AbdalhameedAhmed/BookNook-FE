import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, AtSign, BookPlus, Eye, EyeOff, Handshake, Lock, MessageSquareText, ShieldCheck, UserRound } from 'lucide-react';
import { DecorativeShelf } from '../components/book';
import { cn } from '../lib/utils';
import { ui } from '../lib/ui';

const switchButton = 'min-h-11 flex-1 rounded-ctl border-0 bg-transparent px-2 py-2 text-center text-label-lg font-semibold text-ink-2 transition-colors duration-200 hover:text-ink aria-pressed:bg-glaze aria-pressed:text-on-glaze aria-pressed:shadow-sm';
const fieldLabel = 'text-label-md font-semibold text-ink';
const fieldIcon = 'pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-3';
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
const benefits: Array<{ title: MessageKey; copy: MessageKey; Icon: LucideIcon }> = [
  { title: 'authBenefitList', copy: 'authBenefitListCopy', Icon: BookPlus },
  { title: 'authBenefitRequest', copy: 'authBenefitRequestCopy', Icon: MessageSquareText },
  { title: 'authBenefitTrack', copy: 'authBenefitTrackCopy', Icon: Handshake },
];

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
      className: cn(ui.control, 'rounded-ctl border-transparent bg-surface ps-11', className),
      'aria-invalid': fieldErrors[field] ? true : undefined,
      'aria-describedby': ids || undefined,
    };
  };

  return (
    <div className="mx-auto grid w-full max-w-[1080px] items-start gap-8 px-[var(--gutter)] pb-[72px] pt-6 md:pt-10 lg:grid-cols-2 lg:gap-10 lg:pb-24">
      <div className="grid gap-6 rounded-card bg-sunk p-5 shadow-sm sm:p-6">
        <div className="grid gap-1.5">
          <p className={ui.eyebrow}>{t('authFormEyebrow')}</p>
          <h1 className="font-book text-headline-md font-semibold text-ink ar:leading-[1.5] ar:tracking-normal">{isSignUp ? t('signUpTitle') : t('signInTitle')}</h1>
          <p className="text-body-md text-ink-2">{isSignUp ? t('signUpCopy') : t('signInCopy')}</p>
        </div>

        <div className="flex gap-1 rounded-xl bg-sunk-3 p-1" role="group" aria-label={t('authModeLabel')}>
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
              <label className={fieldLabel} htmlFor="signin-displayName">{t('yourName')}</label>
              <div className="relative">
                <UserRound className={fieldIcon} size={20} aria-hidden="true" />
                <input {...fieldProps('displayName')} value={displayName} onChange={(event) => { setDisplayName(event.target.value); clearFieldError('displayName'); }} autoComplete="name" placeholder={t('nameHint')} maxLength={80} />
              </div>
              <FieldError id="signin-displayName-error">{fieldErrors.displayName ? t(fieldErrors.displayName) : null}</FieldError>
            </div>
          ) : null}
          <div className={ui.field}>
            <label className={fieldLabel} htmlFor="signin-email">{t('email')}</label>
            <div className="relative">
              <AtSign className={fieldIcon} size={20} aria-hidden="true" />
              <input {...fieldProps('email')} type="email" inputMode="email" value={email} onChange={(event) => { setEmail(event.target.value); clearFieldError('email'); }} autoComplete="email" placeholder="name@example.com" dir="ltr" />
            </div>
            <FieldError id="signin-email-error">{fieldErrors.email ? t(fieldErrors.email) : null}</FieldError>
          </div>
          <div className={ui.field}>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <label className={fieldLabel} htmlFor="signin-password">{t('password')}</label>
              {!isSignUp ? <Link to="/reset-password" className="text-label-md font-semibold text-glaze-deep hover:underline hover:underline-offset-[3px]">{t('forgotPassword')}</Link> : null}
            </div>
            <div className="relative">
              <Lock className={fieldIcon} size={20} aria-hidden="true" />
              <input {...fieldProps('password', isSignUp ? 'signin-password-hint' : undefined, 'pe-12')} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => { setPassword(event.target.value); clearFieldError('password'); }} autoComplete={isSignUp ? 'new-password' : 'current-password'} />
              <Button variant="ghost" size="icon" className="absolute end-1 top-1/2 -translate-y-1/2 text-ink-3" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t('hidePassword') : t('showPassword')} aria-pressed={showPassword}>
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </Button>
            </div>
            {isSignUp && !fieldErrors.password ? <span id="signin-password-hint" className="text-label-sm text-ink-2">{t('passwordHint')}</span> : null}
            <FieldError id="signin-password-error">{fieldErrors.password ? t(fieldErrors.password) : null}</FieldError>
          </div>
          <Button block size="lg" type="submit" loading={busy} className="mt-2 rounded-ctl text-label-lg shadow-md">
            {busy ? t('working') : isSignUp ? t('createAccount') : t('signIn')}
            {!busy ? <ArrowRight className={ui.flipRtl} size={18} aria-hidden="true" /> : null}
          </Button>
          {!isSignUp && canResendCode ? (
            <Button variant="ghost" size="sm" className="justify-self-start text-label-md" onClick={() => void resendCode()} loading={busy}>
              {t('resendCode')}
            </Button>
          ) : null}
        </form>

        <div className="flex items-start gap-3 rounded-xl bg-sunk-3/60 p-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-glaze/20 text-glaze-deep" aria-hidden="true"><ShieldCheck size={18} /></span>
          <div className="grid gap-0.5">
            <p className="text-label-md font-semibold text-glaze-deep">{t('authSafetyTitle')}</p>
            <p className="text-body-sm text-ink-2">{t('authPrivacy')}</p>
          </div>
        </div>
      </div>

      <aside className="grid gap-6" aria-labelledby="auth-aside-title">
        <div className="relative grid gap-4 overflow-hidden rounded-card bg-sunk p-5 sm:p-6">
          <span className="pointer-events-none absolute -end-12 -top-12 h-48 w-48 rounded-full bg-cobalt-soft/60 blur-2xl" aria-hidden="true" />
          <div className="relative grid gap-1">
            <p className={ui.eyebrow}>{t('authAsideEyebrow')}</p>
            <h2 id="auth-aside-title" className="font-book text-headline-sm font-semibold text-ink ar:leading-[1.5]">{t('authAsideTitle')}</h2>
          </div>
          <div className="relative hidden xs:block">
            <DecorativeShelf />
          </div>
        </div>
        <ul className="grid gap-2">
          {benefits.map(({ title, copy, Icon }) => (
            <li key={title} className="flex items-start gap-3 rounded-xl bg-surface p-4 shadow-sm">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-ctl bg-sunk-3 text-glaze-deep" aria-hidden="true"><Icon size={20} /></span>
              <div className="grid gap-0.5">
                <p className="text-title-md font-semibold text-ink">{t(title)}</p>
                <p className="text-body-sm text-ink-2">{t(copy)}</p>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
