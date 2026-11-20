import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { useAuth } from './auth';
import { useLanguage } from './i18n';
import { syncPushSubscription, useServiceWorkerMessages } from './push';
import type { BookRequest, Transaction } from './types';

/**
 * What needs the signed-in user's attention, for nav badges and "new message" markers.
 *
 * Polled every minute and on focus, plus right away when a Web Push alert reaches an open tab.
 * Which chat messages have been read is remembered per device in localStorage (the "New" marker
 * on a handover); the unread notification count comes from the server, so it is the same everywhere.
 */
type ActivityValue = {
  /** Requests for the user's books waiting for an answer. */
  pendingIncoming: number;
  /** Open handovers waiting on the user: a confirmation to give or an unread message. */
  handoversNeedingYou: number;
  /** Unread notifications (the header bell). */
  unreadNotifications: number;
  setUnreadNotifications: (count: number) => void;
  isUnread: (transaction: Transaction) => boolean;
  markRead: (transactionId: string, at: string) => void;
  refresh: () => void;
};

const POLL_MS = 60_000;
const noop = () => undefined;
const ActivityContext = createContext<ActivityValue>({
  pendingIncoming: 0, handoversNeedingYou: 0, unreadNotifications: 0, setUnreadNotifications: noop,
  isUnread: () => false, markRead: noop, refresh: noop,
});

const readKey = (userId: string) => `rfoof.chatRead.${userId}`;

function loadReadState(userId: string): Record<string, string> {
  try { return JSON.parse(window.localStorage.getItem(readKey(userId)) ?? '{}') as Record<string, string>; }
  catch { return {}; }
}

/** True when the user still has to act on an open handover (mirrors the confirm rules in the API). */
export function awaitsConfirmation(transaction: Transaction, userId: string | undefined) {
  if (transaction.status !== 'arranging' || !userId) return false;
  const isBuyer = transaction.buyer_id === userId;
  if (transaction.kind === 'sale') return isBuyer;
  if (transaction.kind === 'exchange') return !(isBuyer ? transaction.buyer_confirmed_at : transaction.seller_confirmed_at);
  return false;
}

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { language } = useLanguage();
  const token = session?.access_token;
  const userId = session?.user.id;
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [readAt, setReadAt] = useState<Record<string, string>>({});

  useEffect(() => { setReadAt(userId ? loadReadState(userId) : {}); }, [userId]);

  const refresh = useCallback(() => {
    if (!token) { setRequests([]); setTransactions([]); setUnreadNotifications(0); return; }
    api.activity(token)
      .then((next) => { setRequests(next.requests); setTransactions(next.transactions); })
      .catch(() => { /* Badges are best effort; pages show their own errors. */ });
    api.notifications.unreadCount(token)
      .then(setUnreadNotifications)
      .catch(() => { /* Best effort, as above. */ });
  }, [token]);

  useServiceWorkerMessages(refresh);

  // Phone alerts are written in the language the user last chose on this device.
  useEffect(() => { if (token) void syncPushSubscription(token, language); }, [token, language]);

  useEffect(() => {
    refresh();
    if (!token) return undefined;
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, POLL_MS);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [refresh, token]);

  const isUnread = useCallback((transaction: Transaction) => Boolean(
    transaction.last_message_at && transaction.last_message_sender_id && transaction.last_message_sender_id !== userId
      && (!readAt[transaction.id] || readAt[transaction.id] < transaction.last_message_at),
  ), [readAt, userId]);

  const markRead = useCallback((transactionId: string, at: string) => {
    if (!userId) return;
    setReadAt((current) => {
      if (current[transactionId] && current[transactionId] >= at) return current;
      const next = { ...current, [transactionId]: at };
      try { window.localStorage.setItem(readKey(userId), JSON.stringify(next)); } catch { /* Private mode: read state lasts for this tab. */ }
      return next;
    });
  }, [userId]);

  const value = useMemo<ActivityValue>(() => ({
    pendingIncoming: requests.filter((r) => r.status === 'pending' && r.seller_id === userId).length,
    handoversNeedingYou: transactions.filter((t) => t.status === 'arranging' && (isUnread(t) || awaitsConfirmation(t, userId))).length,
    unreadNotifications,
    setUnreadNotifications,
    isUnread,
    markRead,
    refresh,
  }), [requests, transactions, userId, unreadNotifications, isUnread, markRead, refresh]);

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
}

export function useActivity() {
  return useContext(ActivityContext);
}

/** Small count bubble for nav items. Renders nothing at zero. */
export function CountBadge({ count, label, className = '' }: { count: number; label: string; className?: string }) {
  if (count <= 0) return null;
  return (
    <span className={`inline-grid min-w-5 place-items-center rounded-full bg-pom px-1.5 text-[11px] font-bold leading-5 text-white ${className}`}>
      <span aria-hidden="true">{count > 9 ? '9+' : count}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
