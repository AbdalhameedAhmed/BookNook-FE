import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, MailX } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import { ApiError, describeError } from '../errors';
import { useLanguage } from '../i18n';
import { ui } from '../lib/ui';
import { cn } from '../lib/utils';
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
    <div className={cn(ui.wrap, ui.page)}>
      <section className={cn(ui.card, 'relative mx-auto flex w-full max-w-[480px] flex-col items-center overflow-hidden p-6 text-center shadow-md')} aria-live="polite" aria-busy={!error}>
        <span className="pointer-events-none absolute -end-12 -top-12 h-36 w-36 rounded-full bg-glaze/5 blur-xl" aria-hidden="true" />
        <span className="pointer-events-none absolute -bottom-10 -start-10 h-32 w-32 rounded-full bg-ochre-soft/60 blur-lg" aria-hidden="true" />

        {error ? (
          <span className="relative my-4 grid h-24 w-24 place-items-center" aria-hidden="true">
            <span className="absolute inset-0 scale-105 rounded-full bg-pom-soft/50" />
            <span className="relative grid h-20 w-20 place-items-center rounded-full bg-pom-soft text-pom shadow-md"><MailX size={36} /></span>
          </span>
        ) : (
          <span className="relative my-4 grid h-28 w-28 place-items-center" aria-hidden="true">
            <span className="absolute inset-0 rounded-full bg-sunk shadow-inner" />
            <span className="absolute inset-2 animate-spin rounded-full border-4 border-glaze border-b-transparent border-s-transparent motion-reduce:animate-none [animation-duration:3s]" />
            <span className="absolute inset-5 animate-spin rounded-full border-2 border-glaze-deep/70 border-e-transparent border-t-transparent motion-reduce:animate-none [animation-direction:reverse] [animation-duration:6s]" />
            <span className="relative grid h-12 w-12 place-items-center rounded-full bg-sunk-2 text-glaze-deep shadow-sm"><BookOpen className="animate-pulse-soft" size={22} /></span>
          </span>
        )}

        <h1 className="relative mt-2 max-w-xs font-book text-headline-md font-semibold text-ink ar:leading-[1.5] ar:tracking-normal">
          {error ? t('confirmFailedTitle') : `${t('confirmingEmail')}…`}
        </h1>

        {error ? (
          <>
            <Alert className="relative mt-4 w-full text-start" title={t('somethingWrong')}>{error}</Alert>
            <Link to="/signin" className="relative mt-4 inline-flex min-h-11 items-center gap-1.5 text-label-lg font-semibold text-ink-2 hover:text-glaze-deep">
              <ArrowLeft className={ui.flipRtl} size={16} aria-hidden="true" />{t('backToSignIn')}
            </Link>
          </>
        ) : (
          <>
            <p className="relative mt-3 max-w-xs text-body-md text-ink-2">{t('confirmingCopy')}</p>
            <span className="relative mt-6 inline-flex items-center gap-2 rounded-full bg-sunk-2 px-4 py-1.5 text-label-md font-semibold text-ink-2">
              <span className="h-2 w-2 animate-ping rounded-full bg-glaze motion-reduce:animate-none" aria-hidden="true" />{t('working')}
            </span>
          </>
        )}

        <div className="relative mt-6 w-full pt-4" aria-hidden="true">
          <div className="h-1 w-full rounded-full bg-ledge/90 shadow-md" />
        </div>
      </section>
    </div>
  );
}
