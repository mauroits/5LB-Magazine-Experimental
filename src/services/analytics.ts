/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const GA_MEASUREMENT_ID = 'G-F8YBSNXCDW';
export const COOKIE_CONSENT_KEY = '5lb_cookie_consent_v1';

export interface CookieConsentSettings {
  necessary: boolean; // Sempre true
  analytics: boolean;
  hasChosen: boolean;
  timestamp: string;
}

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

/**
 * Legge le preferenze di consenso salvate nel localStorage
 */
export function getStoredCookieConsent(): CookieConsentSettings | null {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && typeof parsed.hasChosen === 'boolean') {
      return {
        necessary: true,
        analytics: Boolean(parsed.analytics),
        hasChosen: parsed.hasChosen,
        timestamp: parsed.timestamp || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn('Errore lettura consenso cookie:', err);
  }
  return null;
}

/**
 * Salva le impostazioni di consenso ed aggiorna la Consent Mode v2 di Google Analytics
 */
export function saveCookieConsent(analyticsGranted: boolean): CookieConsentSettings {
  const settings: CookieConsentSettings = {
    necessary: true,
    analytics: analyticsGranted,
    hasChosen: true,
    timestamp: new Date().toISOString(),
  };

  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Errore salvataggio consenso cookie:', err);
  }

  // Aggiorna Google Consent Mode v2
  applyConsentToGtag(analyticsGranted);

  return settings;
}

/**
 * Applica lo stato di consenso standard (Google Consent Mode v2):
 * - Se analyticsGranted === true:
 *     analytics_storage: 'granted' -> GA4 traccia con cookie persistenti e identificatori di sessione.
 * - Se analyticsGranted === false (Rifiutato o Default):
 *     analytics_storage: 'denied'  -> GA4 non scrive né legge cookie, inviando esclusivamente ping
 *     anonimi (gcs=G100) per la modellazione comportamentale nei report generali, escludendo il report In Tempo Reale.
 */
export function applyConsentToGtag(analyticsGranted: boolean): void {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
  }

  const consentState = analyticsGranted ? 'granted' : 'denied';

  window.gtag('consent', 'update', {
    analytics_storage: consentState,
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
}

/**
 * Inizializza Google Analytics all'avvio dell'applicazione applicando il consenso salvato
 */
export function initAnalyticsWithSavedConsent(): void {
  const saved = getStoredCookieConsent();
  const isGranted = Boolean(saved && saved.hasChosen && saved.analytics);
  applyConsentToGtag(isGranted);
}

/**
 * Invia un evento di visualizzazione pagina (page_view) a Google Analytics.
 * In conformità con la Consent Mode v2:
 * - Con consenso: registra la pagina con cookie normali.
 * - Senza consenso / rifiuto: invia un ping totalmente anonimo (cookieless) per le stime dei report generali.
 */
export function trackPageView(pagePath: string, pageTitle?: string): void {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
  }

  const title = pageTitle || document.title;
  const location = window.location.origin + pagePath;

  // Aggiorna percorso e titolo per la pagina virtuale
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: pagePath,
    page_title: title,
    page_location: location,
  });

  // Invia evento esplicito page_view
  window.gtag('event', 'page_view', {
    page_path: pagePath,
    page_title: title,
    page_location: location,
  });
}

/**
 * Traccia un evento personalizzato in Google Analytics (es. apertura webview, click link, preferiti, ecc.)
 */
export function trackEvent(eventName: string, eventParams: Record<string, any> = {}): void {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
  }

  window.gtag('event', eventName, eventParams);
}
