import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Gift, MessageCircle, Send, ShieldCheck, TicketPercent, Wallet as WalletIcon, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { useActivity } from '../activity';
import { describeError } from '../errors';
import { useLanguage } from '../i18n';
import type { ChatMessage, PromoPreview } from '../types';
import { Button, buttonClass } from './ui/button';
import { cn } from '../lib/utils';
import { ui } from '../lib/ui';
import { formatDateTime, formatEgp } from '../pages/Wallet';

/** Fills `{name}` placeholders in a translated string. */
export function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

export function useEgp() {
  const { t, language } = useLanguage();
  return (amount: number) => formatEgp(amount, language, t);
}

/** Price / fee / total rows shown before a paid request is sent. */
export function CostBreakdown({ rows, total, balance }: {
  rows: Array<{ label: string; amount: number }>;
  total: { label: string; amount: number };
  balance?: number;
}) {
  const { t } = useLanguage();
  const egp = useEgp();
  return (
    <dl className="grid gap-1.5 rounded-xl bg-sunk p-4 text-body-md">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-2">{row.label}</dt>
          <dd className={cn('tabular-nums', row.amount < 0 ? 'font-semibold text-glaze-deep' : 'text-ink')}>{row.amount < 0 ? `−${egp(-row.amount)}` : egp(row.amount)}</dd>
        </div>
      ))}
      <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-line-strong/40 pt-2">
        <dt className="font-semibold text-ink">{total.label}</dt>
        <dd className="font-book text-title-lg font-bold tabular-nums text-glaze-deep">{egp(total.amount)}</dd>
      </div>
      {balance !== undefined ? (
        <div className="flex items-baseline justify-between gap-3 text-body-sm">
          <dt className="flex items-center gap-1.5 text-ink-3"><WalletIcon size={14} aria-hidden="true" />{t('yourBalance')}</dt>
          <dd className={cn('tabular-nums', balance < total.amount ? 'font-semibold text-pom' : 'text-ink-2')}>{egp(balance)}</dd>
        </div>
      ) : null}
    </dl>
  );
}

/** Shown instead of a paid action when the wallet can't cover it. */
export function TopUpNotice({ title, children }: { title: string; children: string }) {
  const { t } = useLanguage();
  return (
    <div className="grid gap-2.5 rounded-xl border border-ochre/30 bg-ochre-soft p-4 text-body-md" role="status">
      <strong className="flex items-center gap-2 text-label-lg font-semibold text-ink"><WalletIcon size={18} className="text-ochre-ink" aria-hidden="true" />{title}</strong>
      <p className="text-ink-2">{children}</p>
      <Link className={cn(buttonClass({ size: 'sm' }), 'justify-self-start')} to="/account/wallet">{t('topUpWallet')}</Link>
    </div>
  );
}

const POLL_MS = 5000;

/**
 * Message thread for one handover. Polls while open (no websockets in the MVP).
 * `canSend` is false once the handover is closed; the thread stays readable.
 */
export function ChatThread({ transactionId, otherName, canSend }: { transactionId: string; otherName: string; canSend: boolean }) {
  const { session } = useAuth();
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  const token = session?.access_token;
  const { markRead } = useActivity();

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const next = await api.messages(token, transactionId);
      setMessages((current) => (current && current.length === next.length ? current : next));
      setError('');
    } catch (reason) {
      setError(describeError(reason, t, 'chatLoadError'));
    }
  }, [token, transactionId, t]);

  useEffect(() => {
    void load();
    if (!canSend) return undefined;
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [load, canSend]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
    // Seeing the thread counts as reading it (clears the "new message" marker).
    const latest = messages?.[messages.length - 1];
    if (latest) markRead(transactionId, latest.created_at);
  }, [messages, markRead, transactionId]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!token || !body) return;
    setSending(true);
    try {
      const message = await api.sendMessage(token, transactionId, body);
      setMessages((current) => [...(current ?? []), message]);
      setDraft('');
      setError('');
    } catch (reason) {
      setError(describeError(reason, t, 'chatSendFailed'));
    } finally {
      setSending(false);
    }
  };

  const headingId = `chat-${transactionId}`;
  return (
    <section className="grid gap-3 rounded-xl border border-line bg-paper p-3" aria-labelledby={headingId}>
      <h4 id={headingId} className="flex items-center gap-2 text-label-lg font-semibold text-ink"><MessageCircle size={17} className="text-glaze-deep" aria-hidden="true" />{t('chatTitle')} · {otherName}</h4>
      <ol ref={listRef} className="grid max-h-72 min-h-24 content-start gap-2 overflow-y-auto pe-1" aria-live="polite" aria-busy={messages === null}>
        {messages === null ? <li className={cn(ui.skeleton, 'h-10 w-2/3')} /> : messages.length === 0 ? (
          <li className="text-body-sm text-ink-3">{t('chatEmpty')}</li>
        ) : messages.map((message) => {
          const mine = message.sender_id === session?.user.id;
          return (
            <li key={message.id} className={cn('grid max-w-[85%] gap-0.5 rounded-2xl px-3.5 py-2 text-body-md', mine ? 'justify-self-end rounded-ee-sm bg-glaze text-on-glaze' : 'justify-self-start rounded-es-sm bg-sunk-2 text-ink')}>
              <span className="sr-only">{mine ? t('chatYou') : otherName}:</span>
              <span className="whitespace-pre-wrap [overflow-wrap:anywhere]">{message.body}</span>
              <time className={cn('text-2xs', mine ? 'text-on-glaze/80' : 'text-ink-3')} dateTime={message.created_at}>{formatDateTime(message.created_at, language)}</time>
            </li>
          );
        })}
      </ol>
      {error ? <p className="text-body-sm text-pom" role="alert">{error}</p> : null}
      {canSend ? (
        <form className="flex items-end gap-2" onSubmit={(event) => void send(event)}>
          <label className="sr-only" htmlFor={`${headingId}-input`}>{t('chatPlaceholder')}</label>
          <textarea
            id={`${headingId}-input`} className={cn(ui.control, 'min-h-11 resize-none py-2.5')} rows={1} maxLength={1000}
            placeholder={t('chatPlaceholder')} value={draft} onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}
          />
          <Button type="submit" className="min-h-11 flex-none rounded-xl" loading={sending} disabled={!draft.trim()} aria-label={t('chatSend')}>
            {sending ? null : <Send size={17} className={ui.flipRtl} aria-hidden="true" />}
          </Button>
        </form>
      ) : <p className="text-body-sm text-ink-3">{t('chatClosed')}</p>}
      <p className="flex items-center gap-1.5 text-label-sm text-ink-3"><ShieldCheck size={14} aria-hidden="true" />{t('chatSafety')}</p>
    </section>
  );
}

/** Shown where a free request (earned by inviting a friend) will waive the user's Rfoof fee. */
export function FreeRequestNote() {
  const { t } = useLanguage();
  return (
    <p className="flex items-start gap-2 rounded-xl bg-glaze/10 p-3.5 text-body-md text-ink">
      <Gift size={18} className="mt-0.5 flex-none text-glaze-deep" aria-hidden="true" />
      <span>{t('freeRequestNote')} <Link to="/account/invite" className="font-semibold text-glaze-deep hover:underline hover:underline-offset-[3px]">{t('freeRequestLink')}</Link></span>
    </p>
  );
}

/**
 * Optional promo code input. "Apply" only previews the discount; the code is used
 * when the request is sent or accepted, and given back if the deal is refunded.
 */
export function PromoCodeField({ id, applied, onChange }: { id: string; applied: PromoPreview | null; onChange: (promo: PromoPreview | null) => void }) {
  const { session } = useAuth();
  const { t } = useLanguage();
  const egp = useEgp();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const apply = async () => {
    const code = draft.trim();
    if (!session || !code) return;
    setChecking(true);
    setError('');
    try {
      onChange(await api.checkPromo(session.access_token, code));
      setDraft('');
    } catch (reason) {
      setError(describeError(reason, t, 'errorPromoInvalid'));
    } finally {
      setChecking(false);
    }
  };

  if (applied) {
    return (
      <p className="flex items-center justify-between gap-2 rounded-xl border border-glaze/40 bg-glaze-soft/40 px-3 py-2 text-body-sm text-ink" role="status">
        <span className="flex items-center gap-2"><TicketPercent size={17} className="flex-none text-glaze-deep" aria-hidden="true" />{fill(t('promoApplied'), { code: applied.code, amount: egp(applied.discount_egp) })}</span>
        <Button variant="ghost" size="sm" className="min-h-9 flex-none px-2" onClick={() => onChange(null)} aria-label={t('promoRemove')}><X size={16} aria-hidden="true" /></Button>
      </p>
    );
  }
  return (
    <div className="grid gap-1">
      <label className="text-label-md font-medium text-ink-2" htmlFor={id}>{t('promoCode')} <span className={ui.optional}>{t('optional')}</span></label>
      <div className="flex gap-2">
        <input
          id={id} className={cn(ui.control, 'min-h-11 py-2 uppercase')} value={draft} maxLength={32} autoComplete="off" spellCheck={false}
          placeholder={t('promoPlaceholder')} onChange={(event) => { setDraft(event.target.value); setError(''); }}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void apply(); } }}
          aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : `${id}-hint`}
        />
        <Button variant="secondary" className="min-h-11 flex-none rounded-xl" onClick={() => void apply()} loading={checking} disabled={!draft.trim()}>{t('promoApply')}</Button>
      </div>
      {error ? <p id={`${id}-error`} className="text-body-sm text-pom" role="alert">{error}</p> : <p id={`${id}-hint`} className={ui.hint}>{t('promoHint')}</p>}
    </div>
  );
}
