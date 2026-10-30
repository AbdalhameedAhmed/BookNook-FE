import { useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
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

  if (isLoading) return <main className="route-loading"><span className="loading-mark" />{t('loadingSession')}</main>;
  if (session) return <Navigate to={destination} replace />;

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (mode === 'sign_up' && !displayName.trim()) errors.displayName = 'fieldRequired';
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
      const response = mode === 'sign_in'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() } },
        });

      if (response.error) {
        setFormError(describeError(response.error, t, 'somethingWrong'));
        return;
      }
      if (mode === 'sign_up' && !response.data.session) {
        toast.success(t('accountCreatedToast'), t('checkInbox'));
        setMode('sign_in');
        setPassword('');
        return;
      }
      toast.success(mode === 'sign_in' ? t('signedInToast') : t('accountCreatedToast'));
      navigate(destination, { replace: true });
    } catch (reason) {
      setFormError(describeError(reason, t, 'somethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'sign_in' ? 'sign_up' : 'sign_in');
    setFormError('');
    setFieldErrors({});
  };

  const fieldProps = (field: Field) => ({
    id: `signin-${field}`,
    'aria-invalid': fieldErrors[field] ? true : undefined,
    'aria-describedby': fieldErrors[field] ? `signin-${field}-error` : undefined,
  });

  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="auth-story-image" aria-hidden="true" />
        <Link to="/" className="auth-brand"><span className="brand-symbol">b<span>.</span></span> BookNook</Link>
        <div className="auth-story-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> {t('authStoryEyebrow')}</span>
          <h1>{t('authStoryTitleOne')}<br />{t('authStoryTitleTwo')}<br /><em>{t('authStoryTitleThree')}</em></h1>
          <p>{t('authStoryCopy')}</p>
        </div>
        <span className="auth-story-caption">{t('authMade')} &nbsp; / &nbsp; 29°18′N 30°50′E</span>
      </section>

      <section className="auth-form-side">
        <Link to="/" className="auth-back"><ArrowLeft size={16} className="flip-rtl" /> {t('backBrowse')}</Link>
        <div className="auth-form-wrap">
          <div className="auth-form-icon"><LockKeyhole size={19} /></div>
          <p className="eyebrow eyebrow-ink">{mode === 'sign_in' ? t('welcomeBack') : t('joinShelf')}</p>
          <h2>{mode === 'sign_in' ? t('signInTitle') : t('signUpTitle')}</h2>
          <p className="auth-subtitle">{mode === 'sign_in' ? t('signInCopy') : t('signUpCopy')}</p>

          {formError ? (
            <Alert className="auth-alert" title={mode === 'sign_in' ? t('signInFailed') : t('signUpFailed')} onDismiss={() => setFormError('')} dismissLabel={t('dismiss')}>
              {formError}
            </Alert>
          ) : null}

          <form onSubmit={submit} className="signin-form" noValidate>
            {mode === 'sign_up' ? (
              <label className="form-field">
                <span>{t('yourName')}</span>
                <input {...fieldProps('displayName')} value={displayName} onChange={(event) => { setDisplayName(event.target.value); clearFieldError('displayName'); }} autoComplete="name" placeholder={t('nameHint')} maxLength={80} />
                <FieldError id="signin-displayName-error">{fieldErrors.displayName ? t(fieldErrors.displayName) : null}</FieldError>
              </label>
            ) : null}
            <label className="form-field">
              <span>{t('email')}</span>
              <input {...fieldProps('email')} type="email" inputMode="email" value={email} onChange={(event) => { setEmail(event.target.value); clearFieldError('email'); }} autoComplete="email" placeholder="you@example.com" dir="ltr" />
              <FieldError id="signin-email-error">{fieldErrors.email ? t(fieldErrors.email) : null}</FieldError>
            </label>
            <label className="form-field">
              <span>{t('password')}</span>
              <span className="password-input">
                <input {...fieldProps('password')} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => { setPassword(event.target.value); clearFieldError('password'); }} autoComplete={mode === 'sign_in' ? 'current-password' : 'new-password'} placeholder={t('passwordHint')} />
                <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t('hidePassword') : t('showPassword')}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
              <FieldError id="signin-password-error">{fieldErrors.password ? t(fieldErrors.password) : null}</FieldError>
            </label>
            <Button className="signin-submit" type="submit" loading={busy}>
              <span>{busy ? t('working') : mode === 'sign_in' ? t('signIn') : t('createAccount')}</span>
              {busy ? null : <ArrowRight size={18} className="flip-rtl" />}
            </Button>
          </form>
          <p className="auth-switch">
            {mode === 'sign_in' ? t('newHere') : t('alreadyAccount')}{' '}
            <button type="button" onClick={switchMode}>
              {mode === 'sign_in' ? t('createAccount') : t('signIn')}
            </button>
          </p>
          <p className="auth-privacy">{t('authPrivacy')}</p>
        </div>
        <span className="auth-copyright">BOOKNOOK / {t('authMade')}</span>
      </section>
    </main>
  );
}
