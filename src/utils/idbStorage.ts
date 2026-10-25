/**
 * IndexedDB storage helper for 5LB Magazine PWA.
 * - Manages 'sync_meta' (compatible with Service Worker v1), 'articles', 'feed_meta', and 'app_state'.
 * - Upgrades DB to version 2 while preserving existing data.
 * - In-memory fallback if IndexedDB is unavailable, disabled, or fails (e.g. private browsing / quota).
 * - Persistent storage request via navigator.storage.persist().
 */

import { BloggerPost } from '../types';

export const DB_NAME = '5lb_magazine_sync_db_v1';
export const DB_VERSION = 2;

export const STORES = {
  SYNC_META: 'sync_meta',
  ARTICLES: 'articles',
  FEED_META: 'feed_meta',
  APP_STATE: 'app_state',
} as const;

export interface FeedMeta {
  key: string;
  downloadedAt: number;
  lastCheckedAt?: number;
  postIds: string[];
  totalResults?: number;
  hasMore?: boolean;
  posts?: BloggerPost[];
}

// In-memory fallback stores (used if IndexedDB is unavailable or errors)
const memorySyncMeta = new Map<string, any>();
const memoryArticles = new Map<string, BloggerPost>();
const memoryFeedMeta = new Map<string, FeedMeta>();
const memoryAppState = new Map<string, any>();

let dbPromise: Promise<IDBDatabase> | null = null;
let isIdbAvailable = true;

/**
 * Richiede la persistenza dello storage al browser per ridurre il rischio di cancellazione automatica.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
    try {
      const isPersisted = await navigator.storage.persisted?.();
      if (!isPersisted) {
        return await navigator.storage.persist();
      }
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Rimuove le vecchie chiavi di cache da localStorage (nessuna migrazione: archivio vuoto pulito).
 */
export function cleanupOldLocalStorageKeys(): void {
  if (typeof localStorage === 'undefined') return;
  const keysToRemove = [
    '5lb_magazine_posts_cache_v1',
    '5lb_magazine_feed_timestamp_v1',
    '5lb_read_posts_v1',
    '5lb_favorite_posts_v1',
    '5lb_accade_oggi_posts_v1',
    '5lb_accade_oggi_timestamp_v1',
    '5lb_magazine_unlocked_badges_v1',
  ];
  for (const k of keysToRemove) {
    try {
      localStorage.removeItem(k);
    } catch {
      // ignore
    }
  }

  // Assicura che articoli Telegram vengano rimossi dallo store 'articles'
  cleanLegacyAccadeOggiFromArticlesStore().catch(() => {});
}

function openDB(): Promise<IDBDatabase> {
  if (!isIdbAvailable || typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB not supported or disabled'));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        // 1. sync_meta (mantenuto intatto per Service Worker)
        if (!db.objectStoreNames.contains(STORES.SYNC_META)) {
          db.createObjectStore(STORES.SYNC_META);
        }

        // 2. articles (chiave primaria 'id')
        if (!db.objectStoreNames.contains(STORES.ARTICLES)) {
          const articleStore = db.createObjectStore(STORES.ARTICLES, { keyPath: 'id' });
          articleStore.createIndex('published', 'published', { unique: false });
        }

        // 3. feed_meta (chiavi es. 'main', 'category:${name}', 'accade_oggi')
        if (!db.objectStoreNames.contains(STORES.FEED_META)) {
          db.createObjectStore(STORES.FEED_META);
        }

        // 4. app_state (chiavi es. 'unlocked_badges', 'read_post_ids', 'favorite_post_ids')
        if (!db.objectStoreNames.contains(STORES.APP_STATE)) {
          db.createObjectStore(STORES.APP_STATE);
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = () => {
        isIdbAvailable = false;
        reject(request.error);
      };

      request.onblocked = () => {
        console.warn('IndexedDB upgrade blocked by another tab');
      };
    } catch (err) {
      isIdbAvailable = false;
      reject(err);
    }
  });

  return dbPromise;
}

export function isMagazineArticle(p: BloggerPost): boolean {
  if (!p) return false;
  if (p.isAccadeOggi) return false;
  if (Array.isArray(p.categories) && p.categories.some((c) => c.toLowerCase() === 'accade oggi')) return false;
  if (typeof p.id === 'string' && (p.id.includes('t.me/') || p.id.startsWith('today-'))) return false;
  return true;
}

/**
 * Rimuove eventuali articoli legacy di Accade Oggi accidentalmente salvati nello store 'articles'.
 */
export async function cleanLegacyAccadeOggiFromArticlesStore(): Promise<void> {
  // Pulisci cache in memoria
  for (const [id, post] of memoryArticles.entries()) {
    if (!isMagazineArticle(post)) {
      memoryArticles.delete(id);
    }
  }

  try {
    const db = await openDB();
    const tx = db.transaction(STORES.ARTICLES, 'readwrite');
    const store = tx.objectStore(STORES.ARTICLES);
    const req = store.getAll();
    req.onsuccess = () => {
      const all = req.result;
      if (Array.isArray(all)) {
        for (const item of all) {
          if (!isMagazineArticle(item)) {
            store.delete(item.id);
          }
        }
      }
    };
  } catch {
    // ignore
  }
}

// ============================================================================
// ARTICLES STORE
// ============================================================================

export async function getAllArticlesFromDB(): Promise<BloggerPost[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.ARTICLES, 'readonly');
      const store = tx.objectStore(STORES.ARTICLES);
      const req = store.getAll();
      req.onsuccess = () => {
        const raw = Array.isArray(req.result) ? (req.result as BloggerPost[]) : [];
        const posts = raw.filter(isMagazineArticle);
        posts.sort((a, b) => {
          const diff = new Date(b.published).getTime() - new Date(a.published).getTime();
          if (diff !== 0) return diff;
          return (b.id || '').localeCompare(a.id || '');
        });
        resolve(posts);
      };
      req.onerror = () => {
        const mem = Array.from(memoryArticles.values()).filter(isMagazineArticle);
        resolve(mem);
      };
    });
  } catch {
    const list = Array.from(memoryArticles.values()).filter(isMagazineArticle);
    list.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());
    return list;
  }
}

export async function saveArticlesToDB(posts: BloggerPost[]): Promise<void> {
  const magazinePosts = posts.filter(isMagazineArticle);
  // Always update in-memory fallback
  for (const p of magazinePosts) {
    if (p.id) memoryArticles.set(p.id, p);
  }

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.ARTICLES, 'readwrite');
      const store = tx.objectStore(STORES.ARTICLES);
      for (const post of magazinePosts) {
        if (post && post.id) {
          store.put(post);
        }
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // In-memory already updated
  }
}

export async function saveSingleArticleToDB(post: BloggerPost): Promise<void> {
  if (!post || !post.id) return;
  memoryArticles.set(post.id, post);

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.ARTICLES, 'readwrite');
      const store = tx.objectStore(STORES.ARTICLES);
      store.put(post);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // In-memory already updated
  }
}

export async function getArticleByIdFromDB(id: string): Promise<BloggerPost | null> {
  if (!id) return null;
  if (memoryArticles.has(id)) return memoryArticles.get(id) || null;

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.ARTICLES, 'readonly');
      const store = tx.objectStore(STORES.ARTICLES);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(memoryArticles.get(id) || null);
    });
  } catch {
    return memoryArticles.get(id) || null;
  }
}

// ============================================================================
// FEED METADATA STORE (with downloadedAt)
// ============================================================================

export async function getFeedMeta(key: string): Promise<FeedMeta | null> {
  if (!key) return null;
  if (memoryFeedMeta.has(key)) return memoryFeedMeta.get(key) || null;

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.FEED_META, 'readonly');
      const store = tx.objectStore(STORES.FEED_META);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(memoryFeedMeta.get(key) || null);
    });
  } catch {
    return memoryFeedMeta.get(key) || null;
  }
}

export async function setFeedMeta(key: string, meta: Omit<FeedMeta, 'key'>): Promise<void> {
  if (!key) return;
  const fullMeta: FeedMeta = { ...meta, key };
  memoryFeedMeta.set(key, fullMeta);

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.FEED_META, 'readwrite');
      const store = tx.objectStore(STORES.FEED_META);
      store.put(fullMeta, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // in-memory fallback already updated
  }
}

export async function getFeedDownloadedAt(key: string): Promise<number> {
  const meta = await getFeedMeta(key);
  return meta?.downloadedAt || 0;
}

// ============================================================================
// APP STATE STORE (Badges, Read IDs, Favorite IDs)
// ============================================================================

export async function getAppStateItem<T = any>(key: string): Promise<T | null> {
  if (!key) return null;
  if (memoryAppState.has(key)) return memoryAppState.get(key) ?? null;

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.APP_STATE, 'readonly');
      const store = tx.objectStore(STORES.APP_STATE);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result !== undefined && req.result !== null) {
          memoryAppState.set(key, req.result);
          resolve(req.result);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(memoryAppState.get(key) ?? null);
    });
  } catch {
    return memoryAppState.get(key) ?? null;
  }
}

export async function setAppStateItem<T = any>(key: string, value: T): Promise<void> {
  if (!key) return;
  memoryAppState.set(key, value);

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.APP_STATE, 'readwrite');
      const store = tx.objectStore(STORES.APP_STATE);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // in-memory fallback already updated
  }
}

// ============================================================================
// SYNC META STORE (Compatibilità retroattiva con Service Worker)
// ============================================================================

export async function getSyncMetaItem<T = string>(key: string): Promise<T | null> {
  if (memorySyncMeta.has(key)) return memorySyncMeta.get(key) ?? null;

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.SYNC_META, 'readonly');
      const store = tx.objectStore(STORES.SYNC_META);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(memorySyncMeta.get(key) ?? null);
    });
  } catch {
    return memorySyncMeta.get(key) ?? null;
  }
}

export async function setSyncMetaItem<T = string>(key: string, value: T): Promise<void> {
  memorySyncMeta.set(key, value);

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.SYNC_META, 'readwrite');
      const store = tx.objectStore(STORES.SYNC_META);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // in-memory fallback
  }
}

export interface SyncMetaState {
  lastSeenPostId: string | null;
  lastSeenDate: string | null;
  lastModifiedHeader: string | null;
}

export async function getSyncMetaState(): Promise<SyncMetaState> {
  const [lastSeenPostId, lastSeenDate, lastModifiedHeader] = await Promise.all([
    getSyncMetaItem<string>('lastSeenPostId'),
    getSyncMetaItem<string>('lastSeenDate'),
    getSyncMetaItem<string>('lastModifiedHeader'),
  ]);
  return { lastSeenPostId, lastSeenDate, lastModifiedHeader };
}

export async function updateSyncMetaState(state: Partial<SyncMetaState>): Promise<void> {
  const promises: Promise<void>[] = [];
  if (state.lastSeenPostId !== undefined) {
    promises.push(setSyncMetaItem('lastSeenPostId', state.lastSeenPostId));
  }
  if (state.lastSeenDate !== undefined) {
    promises.push(setSyncMetaItem('lastSeenDate', state.lastSeenDate));
  }
  if (state.lastModifiedHeader !== undefined) {
    promises.push(setSyncMetaItem('lastModifiedHeader', state.lastModifiedHeader));
  }
  await Promise.all(promises);
}
