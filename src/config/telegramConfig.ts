/**
 * Configurazione per il feed Telegram "Accade Oggi".
 *
 * Sorgente primaria: Cloudflare Worker con cache KV e header CORS.
 * Orari di refresh UTC: slot orari dopo i quali il Worker ha di norma un feed aggiornato.
 */
export const TELEGRAM_CONFIG = {
  // Sorgente del feed Telegram (Cloudflare Worker) configurata in un solo punto
  FEED_URL: 'https://telegram-feed.5lb-framework.workers.dev/telegram.xml',

  // Intervallo minimo di verifica in background per evitare polling eccessivo (30 minuti)
  MIN_CHECK_INTERVAL_MS: 30 * 60 * 1000,

  // Finestra casuale di variazione (Jitter) per evitare Thundering Herd su dispositivi multipli (3 minuti)
  JITTER_WINDOW_MS: 3 * 60 * 1000,

  // Orari UTC indicativi dopo i quali il Worker ha di norma un feed nuovo (es. dopo pubblicazione mattutina/serale)
  REFRESH_SLOTS_UTC: ['08:10', '19:10'] as const,

  // Cooldown minimo in caso di richiesta fallita (15 minuti per evitare flood in errore)
  RETRY_FAILED_COOLDOWN_MS: 15 * 60 * 1000,

  // Periodo massimo di validità prima di forzare un nuovo controllo anche se l'app è rimasta sempre aperta (24 ore)
  MAX_STALE_TTL_MS: 24 * 60 * 60 * 1000,
};

export const TELEGRAM_REFRESH_SLOTS_UTC = TELEGRAM_CONFIG.REFRESH_SLOTS_UTC;

