import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { ApiError, describeError } from '../errors';
import { useLanguage } from '../i18n';
import { ui } from '../lib/ui';
import { Alert } from '../components/ui/alert';
import { useToast } from '../components/ui/toast';
import { readLinkToken, useClearLinkToken } from './ResetPassword';

/** Landing page for the confirmation link in the sign-up email. */
export default function ConfirmEmail() {
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const navigate = useNavigate();
  const [token] = useState(readLinkToken);
  const [error, setError] = useState('');
  const started = useRef(false);
  useClearLinkToken();

  useEffect(() => {
    // The token is single-use, so never submit it twice (e.g. React StrictMode re-running effects).
    if (!token || started.current) return;
    started.current = true;

    api.auth.confirmEmail(token)
      .then((response) => {
        signIn(response);
        toast.success(t('emailConfirmedToast'));
        navigate('/account', { replace: true });
      })
      .catch((reason) => {
        if (reason instanceof ApiError && reason.status === 400) {
          navigate('/signin', { replace: true, state: { authError: 'expired' } });
          return;
        }
        setError(describeError(reason, t, 'somethingWrong'));
      });
  }, [token, signIn, toast, navigate, t]);

  if (!token) return <Navigate to="/signin" replace state={{ authError: 'expired' }} />;

  return (
    <div className={`${ui.wrap} ${ui.page}`}>
      <section className="mx-auto grid w-full max-w-[420px] gap-[18px]" aria-live="polite">
        <h1 className={ui.pageTitle}>{t('confirmingEmail')}</h1>
        {error ? <Alert title={t('somethingWrong')}>{error}</Alert> : <p className={ui.muted}>{t('working')}</p>}
      </section>
    </div>
  );
}
