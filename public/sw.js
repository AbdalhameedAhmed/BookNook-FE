/* Rfoof service worker: shows Web Push alerts and opens the right page when one is tapped.
 * The API builds the title and body (in the user's language); this file only displays them.
 * It does no caching. See docs/notifications.md. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { /* Malformed push: show a generic alert. */ }

  event.waitUntil((async () => {
    await self.registration.showNotification(payload.title || 'Rfoof', {
      body: payload.body || '',
      icon: '/apple-touch-icon.png',
      badge: '/apple-touch-icon.png',
      dir: 'auto',
      tag: payload.tag,
      renotify: Boolean(payload.tag),
      data: { url: safePath(payload.url) },
    });
    // Let open tabs refresh their bell right away.
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    windows.forEach((client) => client.postMessage({ type: 'rfoof:push' }));
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = safePath(event.notification.data && event.notification.data.url);

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (open) {
      await open.focus();
      open.postMessage({ type: 'rfoof:open', url: path });
      return;
    }
    await self.clients.openWindow(path);
  })());
});

/** Only same-site paths, never an absolute URL from the payload. */
function safePath(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/account/notifications';
}
