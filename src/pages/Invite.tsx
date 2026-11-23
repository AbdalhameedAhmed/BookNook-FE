import { useCallback, useEffect, useState } from 'react';
import { Copy, Gift, Share2, Ticket, UserPlus } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import { describeError } from '../errors';
import { useLanguage } from '../i18n';
import type { MessageKey } from '../i18n';
import type { InviteSummary } from '../types';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { useToast } from '../components/ui/toast';
import { cn } from '../lib/utils';
import { ui } from '../lib/ui';

const steps: MessageKey[] = ['inviteStep1', 'inviteStep2', 'inviteStep3'];

/** Account → Invite friends: the user's invite link and free requests (see docs/referrals.md). */
export function InvitePage() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const [invite, setInvite] = useState<InviteSummary | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!session) return undefined;
    let active = true;
    setError('');
    api.account.invite(session.access_token)
      .then((result) => { if (active) setInvite(result); })
      .catch((reason) => { if (active) setError(describeError(reason, t, 'inviteLoadFailed')); });
    return () => { active = false; };
  }, [session, t]);
  useEffect(() => load(), [load]);

  if (error) return <Alert title={t('inviteLoadFailed')} onRetry={load} retryLabel={t('tryAgain')}>{error}</Alert>;

  const link = invite ? `${window.location.origin}/signin?invite=${invite.invite_code}` : '';
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t('inviteCopied'));
    } catch {
      toast.error(t('inviteCopyFailed'));
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: 'Rfoof', text: t('inviteShareText'), url: link });
    } catch {
      /* The person closed the share sheet. */
    }
  };

  const stats: Array<{ label: MessageKey; value: number | undefined; Icon: typeof Gift; tone: string }> = [
    { label: 'inviteFriendsJoined', value: invite?.friends_joined, Icon: UserPlus, tone: 'bg-cobalt-soft text-cobalt' },
    { label: 'inviteEarned', value: invite?.free_requests_earned, Icon: Gift, tone: 'bg-ochre-soft text-ochre-ink' },
    { label: 'inviteAvailable', value: invite?.free_requests_available, Icon: Ticket, tone: 'bg-glaze-soft text-glaze-deep' },
  ];

  return (
    <div className="grid gap-6" aria-busy={!invite}>
      <section className={cn(ui.card, 'grid gap-5 p-5 md:p-8')} aria-labelledby="invite-heading">
        <div className="grid gap-1.5">
          <p className={ui.eyebrow}>{t('inviteEyebrow')}</p>
          <h2 id="invite-heading" className={ui.sectionTitle}>{t('inviteTitle')}</h2>
          <p className={cn('text-body-md text-ink-2', ui.measure)}>{t('inviteCopy')}</p>
        </div>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="invite-link">{t('inviteLinkLabel')}</label>
          {invite ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input id="invite-link" className={cn(ui.control, 'min-w-0 flex-1')} value={link} readOnly dir="ltr" onFocus={(event) => event.currentTarget.select()} />
              <div className="flex gap-2">
                <Button className="min-h-12 flex-1 rounded-xl sm:flex-none" onClick={() => void copy()}><Copy size={17} aria-hidden="true" />{t('inviteCopyLink')}</Button>
                {canShare ? (
                  <Button variant="secondary" className="min-h-12 flex-1 rounded-xl sm:flex-none" onClick={() => void share()}><Share2 size={17} aria-hidden="true" />{t('inviteShare')}</Button>
                ) : null}
              </div>
            </div>
          ) : (
            <span className={cn(ui.skeleton, 'h-12 w-full')} role="status" aria-label={t('loadingInvite')} />
          )}
        </div>
      </section>

      <ul className="grid grid-cols-3 gap-3 md:gap-4">
        {stats.map(({ label, value, Icon, tone }) => (
          <li key={label} className={cn(ui.card, 'flex flex-col items-center gap-2 p-3 text-center md:flex-row md:justify-between md:p-5 md:text-start')}>
            <div className="flex flex-col-reverse gap-1">
              <span className="text-label-sm font-semibold text-ink-2 md:text-label-md">{t(label)}</span>
              {value === undefined
                ? <span className={cn(ui.skeleton, 'mx-auto h-9 w-9 md:mx-0')} />
                : <span className="font-book text-headline-md font-bold text-ink">{value}</span>}
            </div>
            <span className={cn('hidden h-11 w-11 flex-none place-items-center rounded-xl md:grid', tone)} aria-hidden="true"><Icon size={20} /></span>
          </li>
        ))}
      </ul>

      <section className={cn(ui.card, 'grid gap-4 p-5 md:p-8')} aria-labelledby="invite-how-heading">
        <h2 id="invite-how-heading" className="font-book text-headline-sm font-semibold text-ink ar:leading-[1.5]">{t('inviteHowTitle')}</h2>
        <ol className="grid gap-3">
          {steps.map((step, index) => (
            <li key={step} className="flex items-start gap-3">
              <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-glaze-soft text-label-lg font-bold text-glaze-deep" aria-hidden="true">{index + 1}</span>
              <p className="pt-1 text-body-md text-ink">{t(step)}</p>
            </li>
          ))}
        </ol>
        <p className={cn(ui.hint, ui.measure)}>{t('inviteFinePrint')}</p>
      </section>
    </div>
  );
}
