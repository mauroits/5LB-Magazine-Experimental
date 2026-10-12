import { FEED_SYNC_CONFIG } from '../config/syncConfig';
import { updateSyncMetaState, getSyncMetaState } from '../utils/idbStorage';
import { BloggerPost } from '../types';

/**
 * Registers Periodic Background Sync with the Service Worker (12-hour interval).
 * Supported in Chromium browsers (Android and Desktop).
 */
export async function registerPeriodicSync(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if ('periodicSync' in registration) {
      const periodicSync = (registration as any).periodicSync;
      const tags: string[] = await periodicSync.getTags();
      if (!tags.includes(FEED_SYNC_CONFIG.PERIODIC_SYNC_TAG)) {
        await periodicSync.register(FEED_SYNC_CONFIG.PERIODIC_SYNC_TAG, {
          minInterval: FEED_SYNC_CONFIG.BACKGROUND_PERIODIC_SYNC_MS,
        });
        console.log(`✅ Periodic Background Sync registrato (${FEED_SYNC_CONFIG.BACKGROUND_PERIODIC_SYNC_HOURS}h)`);
      }
      return true;
    }
  } catch (err) {
    // Periodic sync might be disabled if permissions not granted or not installed standalone
    console.info('Periodic background sync non disponibile:', err);
  }
  return false;
}

/**
 * Keeps IndexedDB and Service Worker in sync with the newest known post.
 */
export async function syncNewestPostWithSW(latestPosts: BloggerPost[]): Promise<void> {
  if (!latestPosts || latestPosts.length === 0) return;
  const newest = latestPosts[0];
  if (!newest || !newest.id) return;

  const current = await getSyncMetaState();
  const isDifferent = current.lastSeenPostId !== newest.id;

  if (isDifferent || !current.lastSeenDate) {
    await updateSyncMetaState({
      lastSeenPostId: newest.id,
      lastSeenDate: newest.published,
      lastModifiedHeader: new Date(newest.published).toUTCString(),
    });

    // Also notify active Service Worker controller
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: '5lb:update-last-seen',
        postId: newest.id,
        published: newest.published,
        lastModified: new Date(newest.published).toUTCString(),
      });
    }
  }
}

/**
 * Listen for messages from Service Worker (e.g. user clicked notification to open an article)
 */
export function initSWMessageListener(): () => void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {};
  }

  const handleMessage = (event: MessageEvent) => {
    if (event.data && event.data.type === '5lb:open-post' && event.data.postId) {
      window.dispatchEvent(new CustomEvent('5lb:open-post', { detail: event.data.postId }));
    }
  };

  navigator.serviceWorker.addEventListener('message', handleMessage);
  return () => {
    navigator.serviceWorker.removeEventListener('message', handleMessage);
  };
}
