import { registerSW } from 'virtual:pwa-register';

const SW_LAST_UPDATE_CHECK_KEY = '5lb_sw_last_update_check_v1';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

type UpdateCallback = () => void;

let updateSWFunction: ((reloadPage?: boolean) => Promise<void>) | null = null;
let activeRegistration: ServiceWorkerRegistration | null = null;
const updateListeners = new Set<UpdateCallback>();

function notifyUpdateAvailable() {
  updateListeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.warn('Errore listener aggiornamento PWA:', e);
    }
  });
}

/**
 * Inizializza la registrazione del Service Worker e la gestione del banner di aggiornamento.
 */
export function initPwaUpdate(onUpdateAvailable?: UpdateCallback): () => void {
  if (onUpdateAvailable) {
    updateListeners.add(onUpdateAvailable);
  }

  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {};
  }

  // Registra Service Worker con virtual:pwa-register
  if (!updateSWFunction) {
    try {
      updateSWFunction = registerSW({
        immediate: true,
        onNeedRefresh() {
          notifyUpdateAvailable();
        },
        onOfflineReady() {
          // PWA pronta per la fruizione offline
        },
        onRegisteredSW(swScriptUrl, registration) {
          if (registration) {
            activeRegistration = registration;

            // Se è già presente un worker in attesa (es. download completato in precedenza)
            if (registration.waiting) {
              notifyUpdateAvailable();
            }

            // Ascolta l'arrivo di nuovi worker installati
            registration.addEventListener('updatefound', () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.addEventListener('statechange', () => {
                  if (
                    installingWorker.state === 'installed' &&
                    navigator.serviceWorker.controller
                  ) {
                    notifyUpdateAvailable();
                  }
                });
              }
            });
          }
        },
        onRegisterError(error) {
          console.warn('Errore registrazione Service Worker:', error);
        },
      });
    } catch (err) {
      console.warn('Impossibile registrare SW via virtual:pwa-register:', err);
    }
  }

  return () => {
    if (onUpdateAvailable) {
      updateListeners.delete(onUpdateAvailable);
    }
  };
}

/**
 * Applica l'aggiornamento della nuova versione:
 * invia skipWaiting al Service Worker in attesa ed esegue il reload della pagina.
 */
export async function applyPwaUpdate(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    if (updateSWFunction) {
      await updateSWFunction(true);
      return;
    }

    if (activeRegistration && activeRegistration.waiting) {
      activeRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }
  } catch (e) {
    console.warn('Errore attivazione aggiornamento SW:', e);
  } finally {
    window.location.reload();
  }
}

/**
 * Esegue il controllo degli aggiornamenti (registration.update()) quando l'app torna in primo piano,
 * limitando rigorosamente la frequenza a massimo una volta ogni 24 ore (con timestamp salvato in localStorage).
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

      if (reg.waiting) {
        notifyUpdateAvailable();
      }
    }
  } catch (err) {
    console.warn('Controllo aggiornamenti PWA non riuscito:', err);
  }
}
