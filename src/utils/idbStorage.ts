/**
 * IndexedDB storage helper for sharing sync metadata between window and Service Worker.
 */

const DB_NAME = '5lb_magazine_sync_db_v1';
const STORE_NAME = 'sync_meta';

function openSyncDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getSyncMetaItem<T = string>(key: string): Promise<T | null> {
  try {
    const db = await openSyncDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setSyncMetaItem<T = string>(key: string, value: T): Promise<void> {
  try {
    const db = await openSyncDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // ignore
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
