import { toHttpOrHttpsUrl } from './safeUrl';

/**
 * Utility per aprire link esterni nel browser integrato di sistema:
 * - Valida preventivamente l'URL accettando solo protocolli http: o https:.
 * - Su Android: apre in modo nativo nel Chrome di sistema integrato (package=com.android.chrome),
 *   eliminando popup/iframe in-app modali e garantendo la compatibilità con tutti i siti esterni.
 * - Su iOS / Desktop / altri sistemi: apre direttamente in nuova scheda/finestra.
 */
export function openExternalBrowser(url: string): void {
  if (typeof window === 'undefined' || !url) return;

  const validUrl = toHttpOrHttpsUrl(url);
  if (!validUrl) return;

  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);

  if (isAndroid) {
    try {
      const parsed = new URL(validUrl);
      const urlWithoutScheme = parsed.host + parsed.pathname + parsed.search + parsed.hash;
      const scheme = parsed.protocol.replace(':', '');
      const chromeIntentUrl = `intent://${urlWithoutScheme}#Intent;scheme=${scheme};package=com.android.chrome;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(parsed.href)};end;`;

      let fallbackHandled = false;
      const triggerFallback = () => {
        if (fallbackHandled) return;
        fallbackHandled = true;
        if (!document.hidden) {
          window.open(validUrl, '_blank', 'noopener,noreferrer');
        }
      };

      try {
        const link = document.createElement('a');
        link.href = chromeIntentUrl;
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {
        try {
          window.location.href = chromeIntentUrl;
        } catch {
          triggerFallback();
          return;
        }
      }

      // Safety fallback se Chrome non dovesse rispondere entro 1200ms
      const safetyTimer = window.setTimeout(() => {
        triggerFallback();
      }, 1200);

      const handleVisibility = () => {
        if (document.hidden) {
          fallbackHandled = true;
          clearTimeout(safetyTimer);
          document.removeEventListener('visibilitychange', handleVisibility);
        }
      };
      document.addEventListener('visibilitychange', handleVisibility, { once: true });
      return;
    } catch {
      window.open(validUrl, '_blank', 'noopener,noreferrer');
      return;
    }
  }

  // iOS / Desktop / altri:
  window.open(validUrl, '_blank', 'noopener,noreferrer');
}

