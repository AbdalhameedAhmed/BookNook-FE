import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { MessageCircle, Send, ShieldCheck, Wallet as WalletIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { describeError } from '../errors';
import { useLanguage } from '../i18n';
import type { ChatMessage } from '../types';
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
          <dd className="tabular-nums text-ink">{egp(row.amount)}</dd>
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
  }, [messages]);

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
