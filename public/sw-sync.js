/**
 * Periodic Background Sync & Notification Handler for 5LB Magazine PWA
 * Imported into Service Worker via importScripts('/sw-sync.js')
 */

const SYNC_TAG = '5lb-magazine-periodic-sync';
const DB_NAME = '5lb_magazine_sync_db_v1';
const STORE_NAME = 'sync_meta';

// Helper to open IndexedDB inside Service Worker
function openSyncDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IDB unavailable'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getMetaValue(key) {
  return openSyncDB()
    .then((db) => {
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    })
    .catch(() => null);
}

function setMetaValue(key, val) {
  return openSyncDB()
    .then((db) => {
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(val, key);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    })
    .catch(() => {});
}

// Background update checker using conditional HTTP requests (If-Modified-Since)
async function checkFeedUpdatesInBackground() {
  try {
    const [lastSeenId, lastSeenDate, lastModifiedHeader] = await Promise.all([
      getMetaValue('lastSeenPostId'),
      getMetaValue('lastSeenDate'),
      getMetaValue('lastModifiedHeader'),
    ]);

    const headers = {
      Accept: 'application/json',
      'User-Agent': '5LB-Magazine-PWA/1.0 (+https://5lb.eu)',
    };

    if (lastModifiedHeader) {
      headers['If-Modified-Since'] = lastModifiedHeader;
    }

    // Attempt checking via backend proxy endpoint first, fallback to Blogger feed directly
    let res = null;
    try {
      res = await fetch('/api/check-updates', { headers });
    } catch (e) {
      // Proxy unavailable, try direct Blogger feed
      const bloggerUrl = 'https://magazine.5lb.eu/feeds/posts/default?alt=json&max-results=3';
      try {
        res = await fetch(bloggerUrl, { headers });
      } catch (errDirect) {
        return;
      }
    }

    if (!res) return;

    // HTTP 304: Not Modified -> Zero bytes, feed hasn't changed!
    if (res.status === 304) {
      return;
    }

    if (!res.ok) return;

    const data = await res.json();
    const newLastModified = res.headers.get('Last-Modified') || res.headers.get('Date') || new Date().toUTCString();

    let postInfo = null;

    if (data.id && data.title) {
      // Format from /api/check-updates
      postInfo = {
        id: data.id,
        title: data.title,
        summary: data.summary || '',
        published: data.published,
        link: data.link || 'https://magazine.5lb.eu',
      };
    } else if (data.feed && Array.isArray(data.feed.entry) && data.feed.entry.length > 0) {
      // Direct Blogger format
      const entry = data.feed.entry[0];
      const id = entry.id?.$t;
      const title = entry.title?.$t || 'Nuovo articolo';
      const published = entry.published?.$t || new Date().toISOString();
      const content = entry.summary?.$t || entry.content?.$t || '';
      const summary = content.replace(/<[^>]+>/g, ' ').slice(0, 150).trim();
      let link = 'https://magazine.5lb.eu';
      if (Array.isArray(entry.link)) {
        const alt = entry.link.find((l) => l.rel === 'alternate');
        if (alt && alt.href) link = alt.href;
      }
      postInfo = { id, title, summary, published, link };
    }

    if (!postInfo || !postInfo.id) return;

    // Verify if article is genuinely newer
    const isDifferentId = !lastSeenId || postInfo.id !== lastSeenId;
    const isNewerDate = !lastSeenDate || new Date(postInfo.published).getTime() > new Date(lastSeenDate).getTime();

    if (isDifferentId && isNewerDate) {
      // Save new state to IndexedDB
      await Promise.all([
        setMetaValue('lastSeenPostId', postInfo.id),
        setMetaValue('lastSeenDate', postInfo.published),
        setMetaValue('lastModifiedHeader', newLastModified),
      ]);

      // Trigger native notification
      if (self.registration && self.registration.showNotification) {
        await self.registration.showNotification('Nuovo articolo: ' + postInfo.title, {
          body: (postInfo.summary || 'Un nuovo articolo è disponibile su 5LB Magazine. Tocca per leggere.').slice(0, 110) + '...',
          icon: '/pwa-192x192.png',
          badge: '/icon.svg',
          tag: postInfo.id,
          data: {
            postId: postInfo.id,
            url: postInfo.link,
          },
        });
      }
    }
  } catch (err) {
    // Silent fail in background sync
  }
}

// Listen to Periodic Background Sync events
self.addEventListener('periodicsync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(checkFeedUpdatesInBackground());
  }
});

// Handle clicking on native push/periodic notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  const postId = event.notification.data?.postId;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (postId) {
            client.postMessage({ type: '5lb:open-post', postId });
          }
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Sync message from client to keep lastSeenPostId updated
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === '5lb:update-last-seen') {
    if (event.data.postId) setMetaValue('lastSeenPostId', event.data.postId);
    if (event.data.published) setMetaValue('lastSeenDate', event.data.published);
    if (event.data.lastModified) setMetaValue('lastModifiedHeader', event.data.lastModified);
  }
});
