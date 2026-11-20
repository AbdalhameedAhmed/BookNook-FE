import { useState } from 'react';
import type React from 'react';
import { EyeOff, Flag, Info, MoreHorizontal, ShieldAlert, UserX } from 'lucide-react';
import { api } from '../api';
import { describeError } from '../errors';
import { useLanguage } from '../i18n';
import type { MessageKey } from '../i18n';
import { Alert } from './ui/alert';
import { Button } from './ui/button';
import { Dialog, dialogFooter } from './ui/dialog';
import { useToast } from './ui/toast';
import { cn } from '../lib/utils';
import { ui } from '../lib/ui';

const reportReasons: Array<{ value: string; label: MessageKey; icon: typeof Info }> = [
  { value: 'inappropriate', label: 'reasonInappropriate', icon: EyeOff },
  { value: 'misleading', label: 'reasonMisleading', icon: Info },
  { value: 'spam_or_scam', label: 'reasonSpam', icon: ShieldAlert },
  { value: 'personal_info', label: 'reasonPersonalInfo', icon: UserX },
  { value: 'other', label: 'reasonOther', icon: MoreHorizontal },
];

/** Report a listing or a person. Reports are private and go to moderators. */
export function ReportDialog({ open, onClose, target, token }: {
  open: boolean;
  onClose: () => void;
  target: { listingId: string } | { userId: string };
  token: string;
}) {
  const { t } = useLanguage();
  const toast = useToast();
  const [reason, setReason] = useState(reportReasons[0].value);
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const close = () => {
    if (sending) return;
    setError('');
    onClose();
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      if ('listingId' in target) await api.reportListing(token, target.listingId, reason, details.trim() || null);
      else await api.reportUser(token, target.userId, reason, details.trim() || null);
      toast.success(t('reportSent'));
      setDetails('');
      onClose();
    } catch (failure) {
      setError(describeError(failure, t, 'reportFailed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} title={t('listingId' in target ? 'reportListing' : 'reportUser')} description={t('reportCopy')} icon={<Flag size={20} />} tone="danger" closeLabel={t('dismiss')}>
      <form className={ui.stack} onSubmit={submit}>
        <fieldset className="grid gap-2">
          <legend className={cn(ui.label, 'mb-2')}>{t('reportReason')}</legend>
          {reportReasons.map(({ value, label, icon: Icon }) => (
            <label
              key={value}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl bg-sunk px-4 py-2.5 text-body-lg font-medium text-ink transition-colors hover:bg-sunk-2 has-[:checked]:bg-glaze-soft/60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-glaze"
            >
              <Icon size={20} className="shrink-0 text-ink-2" aria-hidden="true" />
              <span className="flex-1">{t(label)}</span>
              <input className="h-5 w-5 shrink-0 accent-glaze" type="radio" name="report-reason" value={value} checked={reason === value} onChange={() => setReason(value)} />
            </label>
          ))}
        </fieldset>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="report-details">{t('reportDetails')} <span className={ui.optional}>{t('optional')}</span></label>
          <textarea id="report-details" className={cn(ui.control, ui.textarea)} value={details} onChange={(event) => setDetails(event.target.value)} rows={3} maxLength={1000} placeholder={t('reportDetailsPlaceholder')} />
        </div>
        {error ? <Alert title={t('reportFailed')}>{error}</Alert> : null}
        <div className={dialogFooter}>
          <Button variant="secondary" onClick={close} disabled={sending}>{t('cancel')}</Button>
          <Button type="submit" variant="danger" loading={sending}>{t('sendReport')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
