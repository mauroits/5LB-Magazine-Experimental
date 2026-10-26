/**
 * Cloudflare Worker: Proxy e Cache KV per il feed Telegram Atom "Accade Oggi"
 *
 * Questo Worker esegue il polling periodico (cron trigger / scheduled) dei bridge RSS
 * e salva il feed Atom risultante nel KV Store di Cloudflare (TELEGRAM_KV).
 * Risponde alle richieste GET/OPTIONS sul percorso /telegram.xml con supporto CORS mirato
 * e cache HTTP pubblica.
 */

// ============================================================================
// COSTANTI DI CONFIGURAZIONE (facili da modificare)
// ============================================================================

/**
 * URL dei bridge Atom RSS per Telegram (canale @magazine5LB), interrogati in ordine di priorità.
 */
const BRIDGES = [
  'https://rss-bridge.org/bridge01/?action=display&bridge=TelegramBridge&username=magazine5LB&format=Atom',
  'https://rss-bridge.ggc-project.de/?action=display&bridge=TelegramBridge&username=magazine5LB&format=Atom',
];

/**
 * Origini autorizzate per le richieste CORS da browser.
 * Include '*' per permettere la lettura a PWA da qualunque dominio o host locale/preview.
 */
const ALLOW_ALL_ORIGINS = true;

/**
 * Chiave usata nel binding KV (env.TELEGRAM_KV) per memorizzare il feed.
 */
const KV_KEY = 'telegram_feed';

/**
 * User-Agent descrittivo inviato nelle richieste verso i bridge.
 */
const USER_AGENT = '5LB-Magazine-Worker/1.0 (+https://5lb.eu; contact: info@5lb.eu)';

/**
 * Timeout massimo per ogni richiesta ai bridge (10 secondi).
 */
const FETCH_TIMEOUT_MS = 10000;

// ============================================================================
// FUNZIONI AUSILIARIE
// ============================================================================

/**
 * Tenta di aggiornare il feed interrogando i bridge nell'ordine indicato.
 * Accetta la risposta solo se response.ok e se il testo contiene '<entry'.
 * Alla prima risposta valida salva testo e timestamp in KV e si ferma.
 * Se tutti i tentativi falliscono, non sovrascrive nulla in KV e restituisce null.
 *
 * @param {object} env - Ambiente Cloudflare con il binding env.TELEGRAM_KV
 * @returns {Promise<{ xml: string, downloadedAt: string } | null>}
 */
async function updateFeedFromBridges(env) {
  if (!env || !env.TELEGRAM_KV) {
    console.error('Binding KV TELEGRAM_KV non configurato nell\'ambiente.');
    return null;
  }

  for (const bridgeUrl of BRIDGES) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const response = await fetch(bridgeUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/atom+xml, application/xml, text/xml, */*',
        },
      });

      clearTimeout(timer);

      if (response.ok) {
        const text = await response.text();
        // Accetta la risposta solo se contiene almeno una voce Atom (<entry)
        if (text && text.includes('<entry')) {
          const downloadedAt = new Date().toISOString();
          const record = {
            xml: text,
            downloadedAt,
          };

          // Salva in KV testo XML e data di scaricamento
          await env.TELEGRAM_KV.put(KV_KEY, JSON.stringify(record), {
            metadata: { downloadedAt },
          });

          return record;
        }
      }
    } catch (err) {
      // Ignora l'errore del bridge corrente e passa al successivo
      console.warn(`Tentativo non riuscito con ${bridgeUrl}:`, err.message || err);
    }
  }

  // Tutti i bridge sono falliti: non sovrascrivere nulla in KV
  return null;
}

/**
 * Recupera il feed memorizzato nel KV di Cloudflare.
 *
 * @param {object} env - Ambiente Cloudflare con il binding env.TELEGRAM_KV
 * @returns {Promise<{ xml: string, downloadedAt: string | null } | null>}
 */
async function readFeedFromKV(env) {
  if (!env || !env.TELEGRAM_KV) {
    return null;
  }

  try {
    const raw = await env.TELEGRAM_KV.get(KV_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.xml) {
        return {
          xml: parsed.xml,
          downloadedAt: parsed.downloadedAt || null,
        };
      }
    } catch {
      // Fallback: il valore è una stringa XML pura
    }

    return {
      xml: raw,
      downloadedAt: null,
    };
  } catch (err) {
    console.error('Errore durante la lettura da KV:', err);
    return null;
  }
}

/**
 * Gestione degli header CORS:
 * se l'header Origin della richiesta è presente in ALLOWED_ORIGINS,
 * restituisce Access-Control-Allow-Origin: <origin> e Vary: Origin.
 * Altrimenti non aggiunge l'header.
 *
 * @param {Request} request
 * @returns {Record<string, string>}
 */
function getCorsHeaders(request) {
  const origin = request.headers.get('Origin');
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, If-Modified-Since, If-None-Match',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

// ============================================================================
// ES MODULE WORKER EXPORT
// ============================================================================

export default {
  /**
   * 1) Handler per eventi schedulati (Cron Trigger).
   * Esegue l'aggiornamento automatico del feed salvandolo nel KV.
   */
  async scheduled(event, env, ctx) {
    ctx.waitUntil(updateFeedFromBridges(env));
  },

  /**
   * 2) Handler per richieste HTTP.
   * Risponde a GET e OPTIONS sul percorso /telegram.xml.
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Percorsi diversi da /telegram.xml restituiscono 404
    if (url.pathname !== '/telegram.xml') {
      return new Response('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const corsHeaders = getCorsHeaders(request);

    // Gestione preflight OPTIONS: risponde con 204
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Metodi diversi da GET e OPTIONS non consentiti: risponde con 405
    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: {
          Allow: 'GET, OPTIONS',
          'Content-Type': 'text/plain; charset=utf-8',
          ...corsHeaders,
        },
      });
    }

    // Lettura del feed da KV
    let feedData = await readFeedFromKV(env);

    // Se KV è vuoto, tenta subito l'aggiornamento come nello scheduled()
    if (!feedData || !feedData.xml) {
      feedData = await updateFeedFromBridges(env);
      if (!feedData || !feedData.xml) {
        // Se anche l'aggiornamento immediato fallisce, risponde con 503
        return new Response('Feed non disponibile', {
          status: 503,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            ...corsHeaders,
          },
        });
      }
    }

    // Risposta con il feed Atom XML valido (5 min max-age con revalidation)
    const responseHeaders = {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=3600',
      ...corsHeaders,
    };

    if (feedData.downloadedAt) {
      responseHeaders['X-Downloaded-At'] = feedData.downloadedAt;
    }

    return new Response(feedData.xml, {
      status: 200,
      headers: responseHeaders,
    });
  },
};
