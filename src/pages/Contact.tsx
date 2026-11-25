import type { ReactNode } from 'react';
import { Copy, Headset, Mail, MessageCircle, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../i18n';
import { buttonClass, Button } from '../components/ui/button';
import { useToast } from '../components/ui/toast';
import { cn } from '../lib/utils';
import { ui } from '../lib/ui';

/** Support contacts shown on /contact. */
export const SUPPORT_WHATSAPP = '01109261212';
export const SUPPORT_EMAIL = 'rfoof2026@gmail.com';
// wa.me needs the international form without "+" or the leading 0.
const WHATSAPP_URL = `https://wa.me/2${SUPPORT_WHATSAPP}`;

export default function ContactPage() {
  const { t } = useLanguage();

  return (
    <div className={cn(ui.wrap, ui.page, 'max-w-[880px]')}>
      <header className="flex items-start gap-4">
        <span className="grid h-14 w-14 flex-none place-items-center rounded-card bg-glaze-soft text-glaze-deep" aria-hidden="true"><Headset size={26} /></span>
        <div>
          <h1 className={ui.pageTitle}>{t('contactTitle')}</h1>
          <p className={cn(ui.measure, 'mt-1 text-body-md text-ink-2')}>{t('contactIntro')}</p>
        </div>
      </header>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        <ContactCard
          icon={<MessageCircle size={22} />}
          tone="bg-glaze-soft text-glaze-deep"
          title={t('contactWhatsapp')}
          hint={t('contactWhatsappHint')}
          value={SUPPORT_WHATSAPP}
          href={WHATSAPP_URL}
          action={t('contactWhatsappAction')}
          external
        />
        <ContactCard
          icon={<Mail size={22} />}
          tone="bg-cobalt-soft text-cobalt"
          title={t('contactEmail')}
          hint={t('contactEmailHint')}
          value={SUPPORT_EMAIL}
          href={`mailto:${SUPPORT_EMAIL}`}
          action={t('contactEmailAction')}
        />
      </ul>

      <section className={cn(ui.card, 'mt-6 p-5 md:p-6')} aria-labelledby="contact-tips-heading">
        <h2 id="contact-tips-heading" className="text-title-md font-semibold text-ink">{t('contactTipsTitle')}</h2>
        <ul className="mt-3 grid list-disc gap-1.5 ps-5 text-body-md text-ink-2">
          <li>{t('contactTipAccount')}</li>
          <li>{t('contactTipBook')}</li>
          <li>{t('contactTipMoney')}</li>
        </ul>
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-sunk px-3 py-2 text-body-sm text-ink-2">
          <ShieldCheck size={16} className="mt-0.5 flex-none text-glaze-deep" aria-hidden="true" />{t('contactSafety')}
        </p>
      </section>
    </div>
  );
}

function ContactCard({ icon, tone, title, hint, value, href, action, external = false }: {
  icon: ReactNode; tone: string; title: string; hint: string; value: string; href: string; action: string; external?: boolean;
}) {
  const { t } = useLanguage();
  const toast = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t('contactCopied'));
    } catch {
      /* Clipboard can be blocked; the value stays visible and selectable. */
    }
  };

  return (
    <li className={cn(ui.card, 'grid content-start gap-3 p-5 md:p-6')}>
      <span className="flex items-center gap-3">
        <span className={cn('grid h-11 w-11 flex-none place-items-center rounded-xl', tone)} aria-hidden="true">{icon}</span>
        <span className="grid">
          <h2 className="text-title-md font-semibold text-ink">{title}</h2>
          <span className="text-body-sm text-ink-3">{hint}</span>
        </span>
      </span>
      <bdi dir="ltr" className="select-all break-all font-book text-headline-sm font-bold tabular-nums text-ink">{value}</bdi>
      <span className="flex flex-wrap gap-2">
        <a
          href={href}
          className={cn(buttonClass({ size: 'sm' }), 'min-h-11')}
          {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
        >
          {action}
        </a>
        <Button variant="secondary" size="sm" className="min-h-11" onClick={() => void copy()} aria-label={`${t('contactCopy')} ${title}`}>
          <Copy size={15} aria-hidden="true" />{t('contactCopy')}
        </Button>
      </span>
    </li>
  );
}
