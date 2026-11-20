import { useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Bell, Camera, KeyRound, Mail, MailCheck, Trash2, UserRound } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { describeError } from '../errors';
import { useLanguage } from '../i18n';
import { Avatar } from '../components/avatar';
import { InstallCard } from '../components/install-card';
import { PushCard } from '../components/push-card';
import { Alert, FieldError } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { useConfirm } from '../components/ui/dialog';
import { useToast } from '../components/ui/toast';
import { fill } from '../components/deals';
import { cn } from '../lib/utils';
import { ui } from '../lib/ui';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const settingsTabs = [
  { to: '/settings', end: true, icon: UserRound, label: 'settingsProfileTab' },
  { to: '/settings/sign-in', end: false, icon: KeyRound, label: 'settingsSignInTab' },
  { to: '/settings/notifications', end: false, icon: Bell, label: 'settingsNotificationsTab' },
] as const;

/**
 * Settings, separate from the Account activity pages. Phones get pill tabs under the title;
 * wider screens get a side rail, so it reads as a different place from Account's top tabs.
 */
export function SettingsLayout() {
  const { t } = useLanguage();
  return (
    <div className={cn(ui.wrap, ui.page)}>
      <div className="md:grid md:grid-cols-[240px_minmax(0,1fr)] md:gap-10 lg:gap-14">
        <aside className="md:sticky md:top-[calc(var(--topbar-h)+24px)] md:self-start">
          <h1 className={ui.pageTitle}>{t('settingsTitle')}</h1>
          <p className="mt-1 text-body-md text-ink-2">{t('settingsIntro')}</p>
          <nav className="mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-sunk-2 p-1 md:mt-6 md:grid-cols-1 md:bg-transparent md:p-0" aria-label={t('settingsSections')}>
            {settingsTabs.map(({ to, end, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => cn(
                  // Phones: all three tabs visible as a segmented control. Wider: a vertical rail.
                  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-center text-label-md font-semibold leading-tight transition-colors',
                  'md:min-h-11 md:flex-row md:justify-start md:gap-2.5 md:px-3.5 md:text-start md:text-label-lg',
                  isActive
                    ? 'bg-surface text-glaze-deep shadow-sm md:bg-glaze-soft/50 md:shadow-[inset_3px_0_0_rgb(var(--glaze-deep))] md:rtl:shadow-[inset_-3px_0_0_rgb(var(--glaze-deep))]'
                    : 'text-ink-2 hover:text-ink md:hover:bg-sunk',
                )}
              >
                <Icon size={18} aria-hidden="true" />{t(label)}
              </NavLink>
            ))}
          </nav>
        </aside>
        <div className="mt-6 grid content-start gap-6 md:mt-0"><Outlet /></div>
      </div>
    </div>
  );
}

export function SettingsNotifications() {
  const { t } = useLanguage();
  return (
    <Section id="notifications" icon={<Bell size={20} />} title={t('notificationSettingsTitle')} copy={t('notificationSettingsCopy')}>
      <div className="grid gap-4">
        <PushCard />
        <InstallCard dismissible={false} />
      </div>
    </Section>
  );
}

function Section({ id, icon, title, copy, children }: { id: string; icon: ReactNode; title: string; copy?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn(ui.card, 'p-5 md:p-6')}>
      <div className="mb-5 flex items-start gap-3">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-glaze-soft text-glaze-deep" aria-hidden="true">{icon}</span>
        <div className="min-w-0">
          <h3 id={`${id}-title`} className="text-title-lg font-bold text-ink">{title}</h3>
          {copy ? <p className="mt-0.5 text-body-sm text-ink-2">{copy}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function SettingsProfile() {
  const { session, updateUser } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const confirm = useConfirm();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
  const [error, setError] = useState('');
  const user = session?.user;
  if (!session || !user) return null;
  const name = user.display_name || user.email;

  const upload = async (file: File | undefined) => {
    if (input.current) input.current.value = '';
    if (!file) return;
    setError('');
    if (!PHOTO_TYPES.includes(file.type)) { setError(t('invalidImageType')); return; }
    if (file.size > MAX_PHOTO_BYTES) { setError(t('imageTooLarge')); return; }
    setBusy('upload');
    try {
      updateUser({ avatar_url: await api.account.uploadAvatar(session.access_token, file) });
      toast.success(t('photoSaved'));
    } catch (reason) {
      setError(describeError(reason, t, 'photoFailed'));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    const confirmed = await confirm({ title: t('confirmRemovePhotoTitle'), description: t('confirmRemovePhotoCopy'), confirmLabel: t('photoRemove'), cancelLabel: t('cancel') });
    if (!confirmed) return;
    setBusy('remove');
    setError('');
    try {
      await api.account.removeAvatar(session.access_token);
      updateUser({ avatar_url: null });
      toast.success(t('photoRemoved'));
    } catch (reason) {
      setError(describeError(reason, t, 'photoFailed'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Section id="photo" icon={<UserRound size={20} />} title={t('photoTitle')} copy={t('photoCopy')}>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={name} url={user.avatar_url} alt={user.avatar_url ? t('photoAlt') : ''} className="h-20 w-20 text-headline-lg" />
        <div className="flex flex-wrap gap-2">
          <input ref={input} id="photo-input" type="file" accept={PHOTO_TYPES.join(',')} className="sr-only" onChange={(event) => void upload(event.target.files?.[0])} />
          <Button size="sm" className="min-h-11" loading={busy === 'upload'} disabled={busy !== null} onClick={() => input.current?.click()}>
            <Camera size={17} aria-hidden="true" />{user.avatar_url ? t('photoChange') : t('photoAdd')}
          </Button>
          {user.avatar_url ? (
            <Button size="sm" variant="ghost" className="min-h-11 [&:not(:disabled):hover]:text-pom" loading={busy === 'remove'} disabled={busy !== null} onClick={() => void remove()}>
              <Trash2 size={17} aria-hidden="true" />{t('photoRemove')}
            </Button>
          ) : null}
        </div>
      </div>
      {error ? <Alert className="mt-4">{error}</Alert> : null}
    </Section>
  );
}

export function SettingsSignIn() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');
  if (!session) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const address = newEmail.trim().toLowerCase();
      await api.account.changeEmail(session.access_token, address, password);
      setSentTo(address);
      setNewEmail('');
      setPassword('');
    } catch (reason) {
      setError(describeError(reason, t, 'emailChangeFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section id="email" icon={<Mail size={20} />} title={t('emailTitle')} copy={t('emailCopy')}>
      <p className="mb-4 flex min-w-0 flex-wrap items-center gap-x-1.5 text-body-md text-ink-2">
        {t('emailCurrent')} <span className="truncate font-semibold text-ink" dir="ltr">{session.user.email}</span>
      </p>
      {sentTo ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl bg-glaze-soft/40 p-4" role="status">
          <MailCheck size={20} className="mt-0.5 flex-none text-glaze-deep" aria-hidden="true" />
          <div>
            <p className="text-label-lg font-bold text-ink">{t('emailChangeSentTitle')}</p>
            <p className="mt-0.5 text-body-sm text-ink-2">{fill(t('emailChangeSent'), { email: sentTo })}</p>
          </div>
        </div>
      ) : null}
      <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void submit(event)}>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="settings-new-email">{t('newEmail')}</label>
          <div className="relative">
            <Mail size={18} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden="true" />
            <input id="settings-new-email" className={cn(ui.control, 'ps-11')} type="email" inputMode="email" autoComplete="email" dir="ltr" placeholder="name@example.com" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} required maxLength={320} />
          </div>
        </div>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="settings-current-password">{t('currentPassword')}</label>
          <div className="relative">
            <KeyRound size={18} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden="true" />
            <input id="settings-current-password" className={cn(ui.control, 'ps-11')} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required maxLength={200} aria-describedby="settings-current-password-hint" aria-invalid={Boolean(error)} />
          </div>
          <span id="settings-current-password-hint" className={ui.hint}>{t('currentPasswordHint')}</span>
        </div>
        <FieldError id="settings-email-error">{error}</FieldError>
        <div className="md:col-span-2">
          <Button type="submit" className="min-h-11 w-full sm:w-auto" loading={busy}>{t('emailChangeSubmit')}</Button>
        </div>
      </form>
    </Section>
  );
}
