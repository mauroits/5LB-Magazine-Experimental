/**
 * Configurazione per il feed Telegram "Accade Oggi".
 *
 * Sorgente primaria: Cloudflare Worker con cache KV e header CORS.
 * Orari di refresh UTC: slot orari dopo i quali il Worker ha di norma un feed aggiornato.
 */
export const TELEGRAM_CONFIG = {
  // Sorgente del feed Telegram (Cloudflare Worker) configurata in un solo punto
  FEED_URL: 'https://telegram-feed.5lb-framework.workers.dev/telegram.xml',

  // Orari UTC dopo i quali il Worker ha di norma un feed nuovo
  REFRESH_SLOTS_UTC: ['08:10', '19:10'] as const,

  // Cooldown minimo in caso di richiesta fallita (15 minuti)
  RETRY_FAILED_COOLDOWN_MS: 15 * 60 * 1000,

  // Periodo massimo di validità prima di forzare un nuovo controllo (24 ore)
  MAX_STALE_TTL_MS: 24 * 60 * 60 * 1000,
};

export const TELEGRAM_REFRESH_SLOTS_UTC = TELEGRAM_CONFIG.REFRESH_SLOTS_UTC;
