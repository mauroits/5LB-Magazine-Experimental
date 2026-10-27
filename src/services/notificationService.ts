import { BloggerPost, NotificationItem } from '../types';
import { getAssetUrl } from '../utils/assets';
import { decodeHtmlEntities } from '../utils/textUtils';

const NOTIFICATIONS_STORAGE_KEY = '5lb_magazine_notifications_v1';
const LAST_SEEN_DATE_KEY = '5lb_magazine_last_seen_date_v1';
const NOTIFICATION_SOUND_KEY = '5lb_magazine_sound_enabled_v1';

// Web Audio API chime synthesizer for notifications
export function playNotificationChime() {
  try {
    const isSoundEnabled = localStorage.getItem(NOTIFICATION_SOUND_KEY) !== 'false';
    if (!isSoundEnabled) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Tone 1: 523.25 Hz (C5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: 783.99 Hz (G5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.12);
    gain2.gain.setValueAtTime(0.2, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch (e) {
    // Audio autoplay might be blocked before first user gesture
  }
}

export function getStoredNotifications(): NotificationItem[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function saveNotification(item: NotificationItem) {
  try {
    const current = getStoredNotifications();
    const updated = [item, ...current.slice(0, 49)]; // keep latest 50
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('5lb:new-notification', { detail: item }));
  } catch (e) {
    console.error(e);
  }
}

export function markNotificationAsRead(id: string) {
  const current = getStoredNotifications();
  const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('5lb:notifications-updated'));
}

export function toggleNotificationRead(id: string) {
  const current = getStoredNotifications();
  const updated = current.map((n) => (n.id === id ? { ...n, read: !n.read } : n));
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('5lb:notifications-updated'));
}

export function markAllNotificationsAsRead() {
  const current = getStoredNotifications();
  const updated = current.map((n) => ({ ...n, read: true }));
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('5lb:notifications-updated'));
}

export async function requestPushPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) {
    return 'unsupported';
  }

  try {
    let permission: NotificationPermission;
    try {
      const promiseResult = Notification.requestPermission();
      if (promiseResult && typeof promiseResult.then === 'function') {
        permission = await promiseResult;
      } else {
        // Fallback per ambienti Chromium/Android che accettano solo callback
        permission = await new Promise((resolve) => {
          Notification.requestPermission((p) => resolve(p));
        });
      }
    } catch {
      permission = await new Promise((resolve) => {
        Notification.requestPermission((p) => resolve(p));
      });
    }

    // Se autorizzato, prova ad allineare il ServiceWorker push manager
    if (permission === 'granted' && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.pushManager) {
          await registration.pushManager.getSubscription();
        }
      } catch {
        // Push manager opzionale
      }
    }

    return permission;
  } catch (e) {
    return 'denied';
  }
}

export type DetectedPlatform = 'android' | 'ios' | 'desktop';

export function getDetectedPlatform(): DetectedPlatform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  return 'desktop';
}

export function isAndroidDevice(): boolean {
  return getDetectedPlatform() === 'android';
}

export function isIOSDevice(): boolean {
  return getDetectedPlatform() === 'ios';
}

export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export async function getLiveNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) {
    return 'unsupported';
  }

  if ('permissions' in navigator && navigator.permissions && navigator.permissions.query) {
    try {
      const status = await navigator.permissions.query({ name: 'notifications' as PermissionName });
      if (status && status.state) {
        if (status.state === 'granted') return 'granted';
        if (status.state === 'denied') return 'denied';
        return 'default';
      }
    } catch {
      // Fallback a Notification.permission
    }
  }

  return Notification.permission;
}

export function canSendNotification(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

export function triggerPushNotification(title: string, body: string, url?: string, postId?: string) {
  playNotificationChime();

  const notificationItem: NotificationItem = {
    id: 'notif-' + Date.now(),
    title,
    body,
    date: new Date().toISOString(),
    read: false,
    url,
    postId,
  };

  saveNotification(notificationItem);

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const n = new Notification(title, {
        body,
        icon: getAssetUrl('pwa-192x192.png'),
        badge: getAssetUrl('icon.svg'),
        tag: postId || title,
      });
      n.onclick = () => {
        window.focus();
        if (postId) {
          window.dispatchEvent(new CustomEvent('5lb:open-post', { detail: postId }));
        }
      };
    } catch (e) {
      console.warn('Errore apertura notifica nativa:', e);
    }
  }
}

export function checkForNewPostsAndNotify(latestPosts: BloggerPost[]) {
  if (!latestPosts || latestPosts.length === 0) return;

  const newest = latestPosts[0];
  const lastSeenStr = localStorage.getItem(LAST_SEEN_DATE_KEY);

  if (!lastSeenStr) {
    // First run: initialize last seen timestamp without spamming notifications
    localStorage.setItem(LAST_SEEN_DATE_KEY, newest.published);
    return;
  }

  const lastSeenDate = new Date(lastSeenStr).getTime();
  const newestDate = new Date(newest.published).getTime();

  if (newestDate > lastSeenDate) {
    // A genuinely new article was posted!
    localStorage.setItem(LAST_SEEN_DATE_KEY, newest.published);
    triggerPushNotification(
      'Nuovo articolo: ' + decodeHtmlEntities(newest.title),
      decodeHtmlEntities(newest.summary).slice(0, 100) + '...',
      newest.link,
      newest.id
    );
  }
}

// ============================================================================
// ACCADE OGGI FEED NOTIFICATION SETTINGS & DETECTOR
// ============================================================================
const ACCADE_OGGI_NOTIF_ENABLED_KEY = '5lb_magazine_accade_oggi_notif_enabled_v1';
const ACCADE_OGGI_LAST_SEEN_KEY = '5lb_magazine_accade_oggi_last_seen_v1';

export function isAccadeOggiNotificationEnabled(): boolean {
  try {
    return localStorage.getItem(ACCADE_OGGI_NOTIF_ENABLED_KEY) !== 'false';
  } catch (e) {
    return true;
  }
}

export function setAccadeOggiNotificationEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(ACCADE_OGGI_NOTIF_ENABLED_KEY, enabled ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('5lb:notification-settings-updated'));
  } catch (e) {
    console.error(e);
  }
}

export function checkForNewAccadeOggiAndNotify(latestPosts: BloggerPost[]) {
  if (!latestPosts || latestPosts.length === 0) return;
  // If user disabled Accade Oggi notifications, do not notify
  if (!isAccadeOggiNotificationEnabled()) return;

  const newest = latestPosts[0];
  const lastSeenStr = localStorage.getItem(ACCADE_OGGI_LAST_SEEN_KEY);

  if (!lastSeenStr) {
    // Initialize without firing on first boot
    localStorage.setItem(ACCADE_OGGI_LAST_SEEN_KEY, newest.published);
    return;
  }

  const lastSeenDate = new Date(lastSeenStr).getTime();
  const newestDate = new Date(newest.published).getTime();

  if (newestDate > lastSeenDate) {
    localStorage.setItem(ACCADE_OGGI_LAST_SEEN_KEY, newest.published);
    triggerPushNotification(
      'Accade Oggi: ' + decodeHtmlEntities(newest.title),
      decodeHtmlEntities(newest.summary).slice(0, 100) + '...',
      newest.link,
      newest.id
    );
  }
}

