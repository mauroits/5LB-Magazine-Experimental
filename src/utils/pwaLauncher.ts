/**
 * PWA Detection & Launcher utility for 5LB Magazine
 * Simple, robust detection of standalone native mode and platform app launching.
 */

/**
 * Checks if the user is currently viewing the application inside the installed native PWA window
 * (standalone, fullscreen, minimal-ui, or iOS home screen webclip).
 */
export function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  const isMediaStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches;

  const isNavStandalone =
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  const hasStandaloneParam =
    new URLSearchParams(window.location.search).get('standalone') === 'true' ||
    new URLSearchParams(window.location.search).get('launch_pwa') === '1' ||
    new URLSearchParams(window.location.search).get('utm_source') === 'homescreen';

  const isAndroidReferrer =
    typeof document !== 'undefined' && document.referrer.includes('android-app://');

  return isMediaStandalone || isNavStandalone || hasStandaloneParam || isAndroidReferrer;
}

/**
 * Clean up legacy storage flags that caused uninstalled apps to be mistakenly treated as installed.
 */
export function clearLegacyInstalledFlags(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('5lb_app_installed_on_device');
    sessionStorage.removeItem('5lb_auto_launch_attempted');
    document.cookie = '5lb_pwa_installed=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  } catch (e) {
    // ignore
  }
}

/**
 * Queries navigator.getInstalledRelatedApps (supported on Chromium / Android).
 * Returns true ONLY if Chrome / Android reports an active installed app.
 */
export async function detectInstalledRelatedApps(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  const nav = navigator as unknown as {
    getInstalledRelatedApps?: () => Promise<Array<{ platform: string; url?: string; id?: string }>>;
  };

  if (typeof nav.getInstalledRelatedApps === 'function') {
    try {
      const apps = await nav.getInstalledRelatedApps();
      return Array.isArray(apps) && apps.length > 0;
    } catch (e) {
      // ignore
    }
  }

  return false;
}

/**
 * Opens the installed app using generic Android VIEW intent or registered protocol handler.
 * Never hardcodes com.android.chrome to avoid browser loops.
 */
export function launchInstalledApp(targetUrl?: string): void {
  if (typeof window === 'undefined') return;

  // If already running inside the installed standalone PWA, do nothing
  if (isRunningStandalone()) {
    return;
  }

  const destination = targetUrl || window.location.href;
  const ua = window.navigator.userAgent.toLowerCase();
  const isAndroid = /android/.test(ua);

  if (isAndroid) {
    // Universal Android intent that lets Android OS route directly to the installed 5LB WebAPK
    const intentUrl = `intent://${window.location.host}${window.location.pathname}${window.location.search}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
    window.location.href = intentUrl;
  } else {
    // iOS Safari or desktop with registered protocol
    const protocolUrl = `web+magazinelb://open?url=${encodeURIComponent(destination)}`;
    window.location.href = protocolUrl;
  }
}
