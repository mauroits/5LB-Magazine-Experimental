/**
 * Service Worker Helper for 5LB Magazine PWA
 * Imported into Service Worker via importScripts('/sw-sync.js')
 * 
 * Hosting: GitHub Pages (static).
 * Le notifiche dei nuovi articoli vengono gestite da App.tsx tramite JSONP
 * quando l'app è aperta o torna in primo piano.
 */

const DB_NAME = '5lb_magazine_sync_db_v1';
const STORE_NAME = 'sync_meta';

// Helper per aprire IndexedDB all'interno del Service Worker (versione 2)
function openSyncDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IDB unavailable'));
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains('articles')) {
        const articleStore = db.createObjectStore('articles', { keyPath: 'id' });
        articleStore.createIndex('published', 'published', { unique: false });
      }
      if (!db.objectStoreNames.contains('feed_meta')) {
        db.createObjectStore('feed_meta');
      }
      if (!db.objectStoreNames.contains('app_state')) {
        db.createObjectStore('app_state');
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

// Gestione click sulle notifiche di sistema
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const scopeUrl = self.registration?.scope || '/';
  const rawUrlToOpen = event.notification.data?.url || scopeUrl;
  const postId = event.notification.data?.postId;

  let urlToOpen = scopeUrl;
  try {
    const parsed = new URL(rawUrlToOpen, scopeUrl);
    const scopeParsed = new URL(scopeUrl);
    const isSameOrigin = parsed.origin === scopeParsed.origin;
    const isMagazineHttps = parsed.protocol === 'https:' && parsed.hostname.toLowerCase().replace(/^www\./, '') === 'magazine.5lb.eu';

    if (isSameOrigin || isMagazineHttps) {
      urlToOpen = parsed.href;
    }
  } catch (e) {
    urlToOpen = scopeUrl;
  }

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

// Listener messaggi per sincronizzazione e aggiornamenti PWA
self.addEventListener('message', (event) => {
  if (!event.data) return;

  // Supporto skipWaiting per attivazione immediata di nuove versioni
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // Allineamento metadati da client
  if (event.data.type === '5lb:update-last-seen') {
    if (event.data.postId) setMetaValue('lastSeenPostId', event.data.postId);
    if (event.data.published) setMetaValue('lastSeenDate', event.data.published);
    if (event.data.lastModified) setMetaValue('lastModifiedHeader', event.data.lastModified);
    if (event.data.etag) setMetaValue('etagHeader', event.data.etag);
  }

  // Pre-caricamento proattivo delle immagini per visualizzazione offline
  if (event.data.type === '5lb:cache-images' && Array.isArray(event.data.urls)) {
    if (typeof caches !== 'undefined') {
      caches.open('5lb-article-images').then((cache) => {
        event.data.urls.forEach((imgUrl) => {
          if (imgUrl && typeof imgUrl === 'string') {
            fetch(imgUrl, { mode: 'no-cors' })
              .then((res) => {
                if (res && (res.ok || res.type === 'opaque')) {
                  cache.put(imgUrl, res);
                }
              })
              .catch(() => {});
          }
        });
      }).catch(() => {});
    }
  }
});

