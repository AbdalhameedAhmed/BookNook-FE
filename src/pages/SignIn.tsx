import { useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import { useLanguage } from '../i18n';
import type { MessageKey } from '../i18n';
import { describeError } from '../errors';
import { Alert, FieldError } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { useToast } from '../components/ui/toast';

type RedirectState = { from?: { pathname?: string } | string };
type Field = 'displayName' | 'email' | 'password';
type FieldErrors = Partial<Record<Field, MessageKey>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const benefits: MessageKey[] = ['authBenefitList', 'authBenefitRequest', 'authBenefitTrack'];

export default function SignIn() {
  const { session, isLoading } = useAuth();
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
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isLoading) return <div className="route-loading"><span className="loading-mark" />{t('loadingSession')}</div>;
  if (session) return <Navigate to={destination} replace />;

  const isSignUp = mode === 'sign_up';

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (isSignUp && !displayName.trim()) errors.displayName = 'fieldRequired';
    if (!email.trim()) errors.email = 'fieldRequired';
    else if (!emailPattern.test(email.trim())) errors.email = 'fieldEmail';
    if (!password) errors.password = 'fieldRequired';
    else if (password.length < 6) errors.password = 'fieldPasswordShort';
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
    if (!supabase) {
      setFormError(t('supabaseMissing'));
      return;
    }

    setBusy(true);
    try {
      const response = isSignUp
        ? await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() } },
        })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });

      if (response.error) {
        setFormError(describeError(response.error, t, 'somethingWrong'));
        return;
      }
      if (isSignUp && !response.data.session) {
        toast.success(t('accountCreatedToast'), t('checkInbox'));
        setMode('sign_in');
        setPassword('');
        return;
      }
      toast.success(isSignUp ? t('accountCreatedToast') : t('signedInToast'));
      navigate(destination, { replace: true });
    } catch (reason) {
      setFormError(describeError(reason, t, 'somethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next: 'sign_in' | 'sign_up') => {
    setMode(next);
    setFormError('');
    setFieldErrors({});
  };

  const fieldProps = (field: Field, describedBy?: string) => {
    const ids = [fieldErrors[field] ? `signin-${field}-error` : null, describedBy].filter(Boolean).join(' ');
    return {
      id: `signin-${field}`,
      className: 'control control-lg',
      'aria-invalid': fieldErrors[field] ? true : undefined,
      'aria-describedby': ids || undefined,
    };
  };

  return (
    <div className="auth-page">
      <div className="container">
        <div className="auth-shell">
          <section className="auth-form-side">
            <div className="auth-form-inner">
              <span className="auth-mark" aria-hidden="true"><BookOpen size={22} strokeWidth={2.25} /></span>
              <h1 className="auth-title">{isSignUp ? t('signUpTitle') : t('signInTitle')}</h1>
              <p className="auth-subtitle">{isSignUp ? t('signUpCopy') : t('signInCopy')}</p>

              <div className="segmented segmented-block auth-tabs" role="group" aria-label={t('signIn')}>
                <button type="button" className={isSignUp ? 'segmented-item' : 'segmented-item is-active'} aria-pressed={!isSignUp} onClick={() => switchMode('sign_in')}>{t('signIn')}</button>
                <button type="button" className={isSignUp ? 'segmented-item is-active' : 'segmented-item'} aria-pressed={isSignUp} onClick={() => switchMode('sign_up')}>{t('createAccount')}</button>
              </div>

              {formError ? (
                <Alert title={isSignUp ? t('signUpFailed') : t('signInFailed')} onDismiss={() => setFormError('')} dismissLabel={t('dismiss')}>
                  {formError}
                </Alert>
              ) : null}

              <form onSubmit={submit} className="form-stack" noValidate>
                {isSignUp ? (
                  <div className="field">
                    <label className="field-label" htmlFor="signin-displayName">{t('yourName')}</label>
                    <input {...fieldProps('displayName')} value={displayName} onChange={(event) => { setDisplayName(event.target.value); clearFieldError('displayName'); }} autoComplete="name" placeholder={t('nameHint')} maxLength={80} />
                    <FieldError id="signin-displayName-error">{fieldErrors.displayName ? t(fieldErrors.displayName) : null}</FieldError>
                  </div>
                ) : null}
                <div className="field">
                  <label className="field-label" htmlFor="signin-email">{t('email')}</label>
                  <input {...fieldProps('email')} type="email" inputMode="email" value={email} onChange={(event) => { setEmail(event.target.value); clearFieldError('email'); }} autoComplete="email" placeholder="you@example.com" dir="ltr" />
                  <FieldError id="signin-email-error">{fieldErrors.email ? t(fieldErrors.email) : null}</FieldError>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="signin-password">{t('password')}</label>
                  <div className="password-input">
                    <input {...fieldProps('password', isSignUp ? 'signin-password-hint' : undefined)} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => { setPassword(event.target.value); clearFieldError('password'); }} autoComplete={isSignUp ? 'new-password' : 'current-password'} placeholder={isSignUp ? t('passwordHint') : '••••••••'} />
                    <Button variant="ghost" size="icon-sm" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t('hidePassword') : t('showPassword')} aria-pressed={showPassword}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </Button>
                  </div>
                  {isSignUp && !fieldErrors.password ? <span id="signin-password-hint" className="field-hint">{t('passwordHint')}</span> : null}
                  <FieldError id="signin-password-error">{fieldErrors.password ? t(fieldErrors.password) : null}</FieldError>
                </div>
                <Button className="w-full" size="lg" type="submit" loading={busy}>
                  {busy ? t('working') : isSignUp ? t('createAccount') : t('signIn')}
                  {busy ? null : <ArrowRight size={18} className="flip-rtl" />}
                </Button>
              </form>

              <p className="auth-switch">
                {isSignUp ? t('alreadyAccount') : t('newHere')}{' '}
                <Button variant="link" onClick={() => switchMode(isSignUp ? 'sign_in' : 'sign_up')}>{isSignUp ? t('signIn') : t('createAccount')}</Button>
              </p>
              <p className="auth-privacy"><ShieldCheck size={16} aria-hidden="true" />{t('authPrivacy')}</p>
            </div>
          </section>

          <aside className="auth-visual" aria-label={t('authAsideTitle')}>
            <div className="auth-visual-content">
              <p className="eyebrow eyebrow-inverse">{t('authStoryEyebrow')}</p>
              <h2>{t('authAsideTitle')}</h2>
              <p>{t('authStoryCopy')}</p>
              <ul className="auth-benefits">
                {benefits.map((key) => <li key={key}><span className="auth-benefit-icon" aria-hidden="true"><CheckCircle2 size={16} /></span>{t(key)}</li>)}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
