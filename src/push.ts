import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './api';

/**
 * Browser (Web Push) alerts. The service worker lives in public/sw.js; the server builds the
 * notification text. Permission is only ever requested from a user's click.
 */

export type PushState = 'unsupported' | 'unavailable' | 'denied' | 'off' | 'on';

const SW_URL = '/sw.js';

export function isPushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration(SW_URL);
  return registration ? registration.pushManager.getSubscription() : null;
}

/** Where this browser stands; `unavailable` means the server has push switched off. */
export async function getPushState(): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported';
  try { await api.notifications.pushPublicKey(); } catch { return 'unavailable'; }
  if (Notification.permission === 'denied') return 'denied';
  return Notification.permission === 'granted' && await currentSubscription() ? 'on' : 'off';
}

export async function enablePush(token: string, lang: string): Promise<PushState> {
  const publicKey = await api.notifications.pushPublicKey();
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';

  const registration = await navigator.serviceWorker.register(SW_URL);
  await navigator.serviceWorker.ready;
  const applicationServerKey = base64UrlToBytes(publicKey);
  let subscription = await registration.pushManager.getSubscription();
  if (subscription && !sameKey(subscription, applicationServerKey)) {
    // The server's keys changed since this browser subscribed.
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
  await api.notifications.savePushSubscription(token, subscription.toJSON(), lang);
  return 'on';
}

/**
 * Stops alerts on this browser. Unsubscribes locally first, so a rejected token (which signs the
 * user out again) cannot loop; the server also drops dead endpoints on the next push.
 */
export async function disablePush(token?: string) {
  try {
    const subscription = await currentSubscription();
    if (!subscription) return;
    const { endpoint } = subscription;
    await subscription.unsubscribe();
    if (token) await api.notifications.removePushSubscription(token, endpoint).catch(() => undefined);
  } catch {
    /* Best effort. */
  }
}

/** Re-sends an existing subscription, e.g. so pushes follow the user's chosen language. */
export async function syncPushSubscription(token: string, lang: string) {
  if (!isPushSupported() || Notification.permission !== 'granted') return;
  try {
    const subscription = await currentSubscription();
    if (subscription) await api.notifications.savePushSubscription(token, subscription.toJSON(), lang);
  } catch {
    /* Best effort; the notifications page shows the real state. */
  }
}

/** Messages from the service worker: a push arrived, or an alert was tapped while the app was open. */
export function useServiceWorkerMessages(onPush: () => void) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!isPushSupported()) return undefined;
    const onMessage = (event: MessageEvent) => {
      const message = event.data as { type?: string; url?: string } | null;
      if (message?.type === 'rfoof:push') onPush();
      if (message?.type === 'rfoof:open' && typeof message.url === 'string' && message.url.startsWith('/')) navigate(message.url);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [navigate, onPush]);
}

function base64UrlToBytes(value: string) {
  const base64 = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function sameKey(subscription: PushSubscription, key: Uint8Array) {
  const current = subscription.options.applicationServerKey;
  if (!current) return false;
  const bytes = new Uint8Array(current);
  return bytes.length === key.length && bytes.every((byte, index) => byte === key[index]);
}
