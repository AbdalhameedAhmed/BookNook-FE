import { useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import { useLanguage } from '../i18n';

type RedirectState = { from?: { pathname?: string } | string };

export default function SignIn() {
  const { session, isLoading } = useAuth();
  const { t } = useLanguage();
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
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  if (isLoading) return <main className="route-loading"><span className="loading-mark" />{t('loadingSession')}</main>;
  if (session) return <Navigate to={destination} replace />;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice('');
    if (!supabase) {
      setNotice(t('supabaseMissing'));
      return;
    }

    setBusy(true);
    const response = mode === 'sign_in'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: displayName.trim() } },
      });
    setBusy(false);

    if (response.error) {
      setNotice(response.error.message);
      return;
    }
    if (mode === 'sign_up' && !response.data.session) {
      setNotice(t('checkInbox'));
      setMode('sign_in');
      setPassword('');
      return;
    }
    navigate(destination, { replace: true });
  };

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
        <Link to="/" className="auth-back"><ArrowLeft size={16} /> {t('backBrowse')}</Link>
        <div className="auth-form-wrap">
          <div className="auth-form-icon"><LockKeyhole size={19} /></div>
          <p className="eyebrow eyebrow-ink">{mode === 'sign_in' ? t('welcomeBack') : t('joinShelf')}</p>
          <h2>{mode === 'sign_in' ? t('signInTitle') : t('signUpTitle')}</h2>
          <p className="auth-subtitle">{mode === 'sign_in' ? t('signInCopy') : t('signUpCopy')}</p>

          <form onSubmit={submit} className="signin-form">
            {mode === 'sign_up' ? (
              <label>
                <span>{t('yourName')}</span>
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" placeholder={t('nameHint')} required maxLength={80} />
              </label>
            ) : null}
            <label>
              <span>{t('email')}</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required />
            </label>
            <label>
              <span>{t('password')}</span>
              <span className="password-input">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'sign_in' ? 'current-password' : 'new-password'} minLength={6} placeholder={t('passwordHint')} required />
                <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t('hidePassword') : t('showPassword')}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>
            <button className="signin-submit" disabled={busy} type="submit">
              {busy ? t('working') : mode === 'sign_in' ? t('signIn') : t('createAccount')}
              <ArrowRight size={18} />
            </button>
          </form>
          {notice ? <p className="auth-notice" role="status">{notice}</p> : null}
          <p className="auth-switch">
            {mode === 'sign_in' ? t('newHere') : t('alreadyAccount')}{' '}
            <button type="button" onClick={() => { setMode(mode === 'sign_in' ? 'sign_up' : 'sign_in'); setNotice(''); }}>
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
