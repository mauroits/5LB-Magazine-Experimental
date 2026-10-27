import { registerSW } from 'virtual:pwa-register';

const SW_LAST_UPDATE_CHECK_KEY = '5lb_sw_last_update_check_v1';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

let activeRegistration: ServiceWorkerRegistration | null = null;

/**
 * Inizializza la registrazione del Service Worker in background.
 * Con registerType: 'autoUpdate', gli aggiornamenti vengono scaricati silenziosamente
 * e applicati alla successiva apertura dell'applicazione senza banner invasivi o salti di schermata.
 */
export function initPwaUpdate(): () => void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {};
  }

  try {
    registerSW({
      immediate: true,
      onRegisteredSW(_swScriptUrl, registration) {
        if (registration) {
          activeRegistration = registration;
        }
      },
      onRegisterError(error) {
        console.warn('Errore registrazione Service Worker PWA:', error);
      },
    });
  } catch (err) {
    console.warn('Impossibile registrare SW via virtual:pwa-register:', err);
  }

  return () => {};
}

/**
 * Mantenuta per retrocompatibilità come no-op sicuro.
 */
export async function applyPwaUpdate(): Promise<void> {
  // Con l'aggiornamento automatico e silenzioso non sono necessarie chiamate manuali
}

/**
 * Verifica silenziosa degli aggiornamenti quando l'applicazione torna in primo piano (focus/visibilità),
 * limitando rigorosamente la frequenza a massimo una volta ogni 24 ore.
 * Non mostra alcun popup o banner: se presente un nuovo bundle, viene precaricato per la riapertura successiva.
 */
export async function checkPwaUpdateOnForeground(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const rawLastCheck = localStorage.getItem(SW_LAST_UPDATE_CHECK_KEY);
    const lastCheck = rawLastCheck ? parseInt(rawLastCheck, 10) : 0;
    const now = Date.now();

    // Limita il controllo ad un massimo di una volta ogni 24 ore
    if (lastCheck > 0 && now - lastCheck < TWENTY_FOUR_HOURS_MS) {
      return;
    }

    const reg = activeRegistration || (await navigator.serviceWorker.getRegistration());
    if (reg) {
      localStorage.setItem(SW_LAST_UPDATE_CHECK_KEY, String(now));
      await reg.update();
    }
  } catch (err) {
    console.warn('Controllo aggiornamenti PWA in background non riuscito:', err);
  }
}
