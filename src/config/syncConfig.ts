/**
 * ============================================================================
 * CONFIGURAZIONE INTERVALLI DI AGGIORNAMENTO FEED RSS (5LB MAGAZINE)
 * ============================================================================
 * 
 * Puoi modificare direttamente in questo file gli intervalli di controllo:
 * 
 * - FOREGROUND_POLL_HOURS (default: 6):
 *   Intervallo (in ore) per il controllo di nuovi articoli mentre l'app è aperta.
 *   (All'avvio/boot della PWA viene sempre eseguito un controllo iniziale).
 * 
 * - BACKGROUND_PERIODIC_SYNC_HOURS (default: 12):
 *   Intervallo minimo (in ore) per il Periodic Background Sync del Service Worker.
 *   Quando il sistema operativo attiva il sync, viene scaricato il feed in modo
 *   condizionale (con header 'If-Modified-Since' per risparmiare dati) e viene
 *   inviata una notifica solo se l'ID del post più recente è nuovo.
 */

export const FEED_SYNC_CONFIG = {
  /**
   * Intervallo di controllo in foreground se l'app resta aperta (in ore).
   * Modifica questo numero per cambiare l'intervallo dell'app aperta.
   */
  FOREGROUND_POLL_HOURS: 6,

  /**
   * Intervallo del Periodic Sync in background nel Service Worker (in ore).
   * Modifica questo numero per cambiare la frequenza di sync a PWA chiusa.
   */
  BACKGROUND_PERIODIC_SYNC_HOURS: 12,

  /**
   * Tag univoco registrato nel Service Worker per il Periodic Background Sync.
   */
  PERIODIC_SYNC_TAG: '5lb-magazine-periodic-sync',

  /**
   * Convertitori automatici in millisecondi (utilizzati dal codice).
   */
  get FOREGROUND_POLL_MS(): number {
    return this.FOREGROUND_POLL_HOURS * 60 * 60 * 1000;
  },

  get BACKGROUND_PERIODIC_SYNC_MS(): number {
    return this.BACKGROUND_PERIODIC_SYNC_HOURS * 60 * 60 * 1000;
  },
};
