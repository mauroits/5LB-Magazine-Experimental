import { BloggerPost } from '../types';
import { TELEGRAM_CONFIG, TELEGRAM_REFRESH_SLOTS_UTC } from '../config/telegramConfig';
import { getReadPostIds, getFavoritePostIds } from './bloggerFeed';
import {
  getFeedMeta,
  setFeedMeta,
  getFeedDownloadedAt,
} from '../utils/idbStorage';
import {
  decodeHtmlEntities,
  cleanTextSnippet,
  sanitizePlainText,
} from '../utils/textUtils';

export const ACCADE_OGGI_MAX_POSTS = 15;
const ACCADE_OGGI_FEED_KEY = 'accade_oggi';

let inMemoryAccadeOggiPosts: BloggerPost[] = [];
let inMemoryAccadeOggiTimestamp = 0;
let inMemoryLastCheckedAt = 0;
let inMemoryLastFailedAttempt = 0;
let inFlightFetchPromise: Promise<BloggerPost[]> | null = null;

/**
 * Errore sollevato quando l'aggiornamento di rete fallisce, ma sono disponibili post in cache.
 * Consente al chiamante di mostrare i post memorizzati e notificare l'utente con un avviso discreto.
 */
export class UpdateFailedWithCacheError extends Error {
  cachedPosts: BloggerPost[];
  constructor(message: string, cachedPosts: BloggerPost[]) {
    super(message);
    this.name = 'UpdateFailedWithCacheError';
    this.cachedPosts = cachedPosts;
  }
}

/**
 * URL base pubblico del Worker Cloudflare che ospita le immagini persistenti.
 */
export const WORKER_IMAGE_BASE_URL = 'https://telegram-feed.5lb-framework.workers.dev/img';

/**
 * Trasforma qualsiasi URL effimero di telesco.pe (cdn*.telesco.pe/file/:filename)
 * nell'URL permanente servito da Cloudflare Worker con Edge Cache e durata 90 giorni.
 */
export function normalizeTelegramImageUrl(url: string | null | undefined): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  // Se già riscritta con il percorso del worker (/img/ o dominio worker), la lascia inalterata
  if (trimmed.includes('/img/') || trimmed.includes('telegram-feed.5lb-framework.workers.dev')) {
    return trimmed;
  }

  return trimmed.replace(
    /https?:\/\/cdn\d*\.telesco\.pe\/file\/([A-Za-z0-9_-]+\.[a-zA-Z0-9]+)/gi,
    `${WORKER_IMAGE_BASE_URL}/$1`
  );
}

/**
 * Riscrive tutti gli <img> e link a immagini effimere di telesco.pe presenti nel testo HTML
 * di un post Telegram prima di salvarlo o visualizzarlo.
 */
export function rewriteTelegramHtmlImages(html: string): string {
  if (!html) return '';
  return html.replace(
    /https?:\/\/cdn\d*\.telesco\.pe\/file\/([A-Za-z0-9_-]+\.[a-zA-Z0-9]+)/gi,
    `${WORKER_IMAGE_BASE_URL}/$1`
  );
}

/**
 * Pre-riscalda la cache locale del browser e del Service Worker per le anteprime degli articoli.
 */
export function prewarmTelegramImages(posts: BloggerPost[]): void {
  if (typeof window === 'undefined') return;
  try {
    const urlsToWarm: string[] = [];
    for (const post of posts) {
      if (post.thumbnail && !urlsToWarm.includes(post.thumbnail)) {
        urlsToWarm.push(post.thumbnail);
      }
    }

    if (urlsToWarm.length === 0) return;

    // Preload asincrono leggero nel browser
    setTimeout(() => {
      urlsToWarm.forEach((url) => {
        const img = new Image();
        img.src = url;
      });

      // Notifica anche il Service Worker per salvare direttamente in CacheStorage
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: '5lb:cache-images',
          urls: urlsToWarm,
        });
      }
    }, 500);
  } catch {
    // ignore
  }
}

/**
 * Inizializza i post di Accade Oggi caricandoli da IndexedDB (store feed_meta).
 * Il feed di Accade Oggi è rigorosamente separato dall'archivio degli articoli del Magazine.
 */
export async function initAccadeOggiStorage(): Promise<{
  posts: BloggerPost[];
  lastCheckedAt: number;
  downloadedAt: number;
}> {
  try {
    const meta = await getFeedMeta(ACCADE_OGGI_FEED_KEY);
    inMemoryAccadeOggiTimestamp = meta?.downloadedAt || 0;
    inMemoryLastCheckedAt = meta?.lastCheckedAt || inMemoryAccadeOggiTimestamp;

    if (meta && Array.isArray(meta.posts) && meta.posts.length > 0) {
      inMemoryAccadeOggiPosts = meta.posts.slice(0, ACCADE_OGGI_MAX_POSTS).map((p) => ({
        ...p,
        title: sanitizePlainText(p.title),
        summary: decodeHtmlEntities(p.summary),
        categories: (p.categories || []).map((c) => sanitizePlainText(c)),
        thumbnail: normalizeTelegramImageUrl(p.thumbnail),
        content: rewriteTelegramHtmlImages(p.content || ''),
      }));
      prewarmTelegramImages(inMemoryAccadeOggiPosts);
    }
  } catch {
    // In-memory fallback
  }
  return {
    posts: inMemoryAccadeOggiPosts,
    lastCheckedAt: inMemoryLastCheckedAt,
    downloadedAt: inMemoryAccadeOggiTimestamp,
  };
}

export function getAccadeOggiCacheTimestamp(): number {
  return inMemoryAccadeOggiTimestamp;
}

export function getAccadeOggiLastCheckedAt(): number {
  return inMemoryLastCheckedAt;
}

export function saveAccadeOggiCacheTimestamp(ts: number = Date.now()): void {
  inMemoryAccadeOggiTimestamp = ts;
}

export function getCachedAccadeOggiPosts(): BloggerPost[] {
  return inMemoryAccadeOggiPosts;
}

/**
 * Salva i post di Accade Oggi in memoria e in IndexedDB (nello store feed_meta).
 * Salva sia il timestamp di download (downloadedAt) che la data dell'ultimo controllo (lastCheckedAt).
 * NON tocca l'archivio degli articoli del Magazine.
 */
export function saveCachedAccadeOggiPosts(posts: BloggerPost[], lastCheckedAt: number = Date.now()): void {
  const normalizedPosts = posts.slice(0, ACCADE_OGGI_MAX_POSTS).map((p) => ({
    ...p,
    thumbnail: normalizeTelegramImageUrl(p.thumbnail),
    content: rewriteTelegramHtmlImages(p.content || ''),
  }));

  inMemoryAccadeOggiPosts = normalizedPosts;
  inMemoryAccadeOggiTimestamp = Date.now();
  inMemoryLastCheckedAt = lastCheckedAt;

  setFeedMeta(ACCADE_OGGI_FEED_KEY, {
    downloadedAt: inMemoryAccadeOggiTimestamp,
    lastCheckedAt: inMemoryLastCheckedAt,
    postIds: normalizedPosts.map((p) => p.id),
    posts: normalizedPosts,
  }).catch(() => {});

  prewarmTelegramImages(normalizedPosts);
}

/**
 * Aggiorna la data dell'ultimo controllo (lastCheckedAt) in IndexedDB,
 * utile quando il feed scaricato non contiene nuovi articoli rispetto a quelli già in cache.
 */
export async function updateAccadeOggiLastCheckedAt(lastCheckedAt: number = Date.now()): Promise<void> {
  inMemoryLastCheckedAt = lastCheckedAt;
  try {
    const meta = await getFeedMeta(ACCADE_OGGI_FEED_KEY);
    await setFeedMeta(ACCADE_OGGI_FEED_KEY, {
      downloadedAt: meta?.downloadedAt || inMemoryAccadeOggiTimestamp || lastCheckedAt,
      lastCheckedAt,
      postIds: meta?.postIds || inMemoryAccadeOggiPosts.map((p) => p.id),
      posts: meta?.posts || inMemoryAccadeOggiPosts,
    });
  } catch {
    // Fallback in-memory già impostato
  }
}

/**
 * Calcola la data/ora UTC dell'ultimo slot di refresh già trascorso.
 * Esempi con TELEGRAM_REFRESH_SLOTS_UTC = ["08:10", "19:10"]:
 * - Alle 07:00 UTC di oggi -> 19:10 UTC di ieri
 * - Alle 08:05 UTC di oggi -> 19:10 UTC di ieri
 * - Alle 08:20 UTC di oggi -> 08:10 UTC di oggi
 * - Alle 19:30 UTC di oggi -> 19:10 UTC di oggi
 *
 * @param now Data corrente (default: new Date())
 * @param slots Elenco degli slot in formato "HH:MM" UTC (default: TELEGRAM_REFRESH_SLOTS_UTC)
 * @returns Date dell'ultimo slot già trascorso in UTC
 */
export function getLastPassedSlotUTC(
  now: Date = new Date(),
  slots: readonly string[] = TELEGRAM_REFRESH_SLOTS_UTC
): Date {
  const currentUtcMs = now.getTime();
  const candidates: Date[] = [];

  // Consideriamo oggi (daysAgo = 0) e ieri (daysAgo = 1) in UTC
  for (let daysAgo = 0; daysAgo <= 1; daysAgo++) {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const day = now.getUTCDate() - daysAgo;

    for (const slot of slots) {
      const [hStr, mStr] = slot.split(':');
      const hour = parseInt(hStr, 10);
      const min = parseInt(mStr, 10);

      const slotDate = new Date(Date.UTC(year, month, day, hour, min, 0, 0));
      if (slotDate.getTime() <= currentUtcMs) {
        candidates.push(slotDate);
      }
    }
  }

  // Ordina in modo decrescente: il primo è il più recente già trascorso
  candidates.sort((a, b) => b.getTime() - a.getTime());

  return candidates[0];
}

/**
 * Genera un jitter client deterministico/stabile memorizzato in localStorage
 * per sfalsare le richieste in una finestra da 0 a JITTER_WINDOW_MS (3 minuti),
 * impedendo il fenomeno del Thundering Herd tra dispositivi multipli.
 */
function getClientJitterMs(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const key = '5lb_accade_oggi_client_jitter';
    let val = localStorage.getItem(key);
    if (!val) {
      val = String(Math.floor(Math.random() * TELEGRAM_CONFIG.JITTER_WINDOW_MS));
      localStorage.setItem(key, val);
    }
    return parseInt(val, 10) || 0;
  } catch {
    return 0;
  }
}

/**
 * Determina se il feed Telegram necessita di un nuovo controllo di rete:
 * - Se un tentativo recente è fallito (< 15 min fa) -> false (cooldown per evitare flood in errore)
 * - Se lastCheckedAt non esiste o <= 0 -> true (primo avvio in assoluto)
 * - Se l'ultimo controllo è più vecchio di 24 ore -> true (massima stale tollerata)
 * - Se l'ultimo controllo è avvenuto meno di MIN_CHECK_INTERVAL_MS (30 minuti) fa -> false (rispetta la cache)
 * - Se è trascorso un nuovo slot orario (es. pubblicazione mattutina 08:10 UTC / serale 19:10 UTC)
 *   e lastCheckedAt è precedente allo slot (con jitter applicato per prevenire Thundering Herd) -> true
 */
export function shouldRefreshTelegramFeed(
  lastCheckedAt?: number | null,
  now: Date = new Date(),
  lastFailedAttempt: number = inMemoryLastFailedAttempt
): boolean {
  const nowMs = now.getTime();

  // 1. Se una richiesta recente è fallita (< 15 min fa), rispetta il cooldown
  if (lastFailedAttempt > 0 && nowMs - lastFailedAttempt < TELEGRAM_CONFIG.RETRY_FAILED_COOLDOWN_MS) {
    return false;
  }

  // 2. Se non esiste una verifica precedente
  if (!lastCheckedAt || lastCheckedAt <= 0) {
    return true;
  }

  // 3. Se l'ultimo controllo è più vecchio di 24 ore
  if (nowMs - lastCheckedAt >= TELEGRAM_CONFIG.MAX_STALE_TTL_MS) {
    return true;
  }

  // 4. Intervallo minimo di rispetto della cache (30 minuti)
  if (nowMs - lastCheckedAt < TELEGRAM_CONFIG.MIN_CHECK_INTERVAL_MS) {
    return false;
  }

  // 5. Verifica slot UTC con Jitter client anti-Thundering Herd
  const lastPassedSlot = getLastPassedSlotUTC(now);
  const jitterMs = getClientJitterMs();
  const effectiveSlotTime = lastPassedSlot.getTime() + jitterMs;

  if (nowMs >= effectiveSlotTime && lastCheckedAt < effectiveSlotTime) {
    return true;
  }

  // 6. Se sono passati più di 30 minuti dall'ultima verifica, consente l'aggiornamento cadenzato
  if (nowMs - lastCheckedAt >= TELEGRAM_CONFIG.MIN_CHECK_INTERVAL_MS) {
    return true;
  }

  return false;
}

function cleanHtmlEntities(str: string): string {
  return sanitizePlainText(str);
}

/**
 * Estrazione robusta della prima immagine da uno snippet HTML
 */
function extractFirstImage(html: string): string | undefined {
  if (!html) return undefined;
  const match =
    html.match(/<img[^>]+src=["']([^"']+)["']/i) ||
    html.match(/&lt;img[^>]+src=(?:&quot;|["'])([^"&']+)["'&]/i);
  if (match && match[1]) {
    return match[1];
  }
  return undefined;
}

/**
 * Converte XML (formato Atom <entry> o RSS 2.0 <item>) in oggetti BloggerPost standardizzati
 * contrassegnati da isAccadeOggi: true e limitati a massimo 15 elementi.
 */
export function parseAtomXmlToPosts(xmlText: string): BloggerPost[] {
  const readIds = getReadPostIds();
  const favIds = getFavoritePostIds();
  const posts: BloggerPost[] = [];

  // 1. Parsing con DOMParser se disponibile nel browser
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');

      // Gestione Atom: elementi <entry>
      const entryElements = doc.querySelectorAll('entry');
      if (entryElements.length > 0) {
        entryElements.forEach((entry) => {
          const id = entry.querySelector('id')?.textContent?.trim() || Math.random().toString();
          const rawTitle = entry.querySelector('title')?.textContent?.trim() || 'Aggiornamento Accade Oggi';
          const published = entry.querySelector('published')?.textContent?.trim() || new Date().toISOString();
          const updated = entry.querySelector('updated')?.textContent?.trim() || published;

          let link = id;
          const linkEl = entry.querySelector('link[rel="alternate"]') || entry.querySelector('link');
          if (linkEl && linkEl.getAttribute('href')) {
            link = linkEl.getAttribute('href')!;
          }

          const rawContent = entry.querySelector('content')?.textContent?.trim() || '';
          const content = rewriteTelegramHtmlImages(rawContent);
          const thumbnail = normalizeTelegramImageUrl(extractFirstImage(content));
          const summary = cleanTextSnippet(content, 180);
          const cleanTitle = sanitizePlainText(rawTitle);

          posts.push({
            id,
            title: cleanTitle,
            published,
            updated,
            content,
            summary: summary || cleanTitle,
            categories: ['Accade oggi'],
            link,
            author: { name: '5LB Magazine' },
            thumbnail,
            isRead: readIds.has(id),
            isFavorite: favIds.has(id),
            isAccadeOggi: true,
          });
        });
      } else {
        // Gestione RSS 2.0: elementi <item>
        const itemElements = doc.querySelectorAll('item');
        itemElements.forEach((item) => {
          const id = item.querySelector('guid')?.textContent?.trim() || item.querySelector('link')?.textContent?.trim() || Math.random().toString();
          const rawTitle = item.querySelector('title')?.textContent?.trim() || 'Aggiornamento Accade Oggi';
          const pubDate = item.querySelector('pubDate')?.textContent?.trim();
          const published = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();
          const link = item.querySelector('link')?.textContent?.trim() || id;
          const rawContent = item.querySelector('description')?.textContent?.trim() || '';
          const content = rewriteTelegramHtmlImages(rawContent);
          const thumbnail = normalizeTelegramImageUrl(extractFirstImage(content));
          const summary = cleanTextSnippet(content, 180);
          const cleanTitle = sanitizePlainText(rawTitle);

          posts.push({
            id,
            title: cleanTitle,
            published,
            updated: published,
            content,
            summary: summary || cleanTitle,
            categories: ['Accade oggi'],
            link,
            author: { name: '5LB Magazine' },
            thumbnail,
            isRead: readIds.has(id),
            isFavorite: favIds.has(id),
            isAccadeOggi: true,
          });
        });
      }
    } catch (e) {
      console.warn('DOMParser failed per il feed XML Telegram, fallback a regex:', e);
    }
  }

  // 2. Regex fallback se DOMParser non ha trovato entry
  if (posts.length === 0) {
    const entryRegex = /<entry[\s\S]*?<\/entry>/gi;
    let match;
    while ((match = entryRegex.exec(xmlText)) !== null) {
      const entryXml = match[0];
      const id = (entryXml.match(/<id>([\s\S]*?)<\/id>/i) || [])[1]?.trim() || Math.random().toString();
      const rawTitle = (entryXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.trim() || 'Aggiornamento Accade Oggi';
      const published = (entryXml.match(/<published>([\s\S]*?)<\/published>/i) || [])[1]?.trim() || new Date().toISOString();
      const updated = (entryXml.match(/<updated>([\s\S]*?)<\/updated>/i) || [])[1]?.trim() || published;
      const link = (entryXml.match(/<link[^>]*href=["']([^"']+)["']/i) || [])[1]?.trim() || id;
      const rawContent = (entryXml.match(/<content[^>]*>([\s\S]*?)<\/content>/i) || [])[1]?.trim() || '';
      const content = rewriteTelegramHtmlImages(rawContent);
      const thumbnail = normalizeTelegramImageUrl(extractFirstImage(content));
      const summary = cleanTextSnippet(content, 180);
      const cleanTitle = sanitizePlainText(rawTitle.replace(/<[^>]+>/g, ''));

      posts.push({
        id,
        title: cleanTitle,
        published,
        updated,
        content,
        summary: summary || cleanTitle,
        categories: ['Accade oggi'],
        link,
        author: { name: '5LB Magazine' },
        thumbnail,
        isRead: readIds.has(id),
        isFavorite: favIds.has(id),
        isAccadeOggi: true,
      });
    }
  }

  // Massimo 15 post
  return posts.slice(0, ACCADE_OGGI_MAX_POSTS);
}

/**
 * Carica il feed Telegram da Cloudflare Worker tramite fetch standard.
 *
 * Regole di aggiornamento:
 * - All'apertura (o al ritorno in primo piano), calcola l'ultimo slot UTC già passato.
 * - Se lastCheckedAt è precedente allo slot, o ha più di 24 ore, o non esiste:
 *   esegue fetch(url, { cache: "no-cache" }).
 * - Aggiorna lastCheckedAt anche se il feed non ha articoli nuovi (evita richieste a ogni riapertura).
 * - Se la richiesta fallisce: NON aggiorna lastCheckedAt (riproverà alla prossima apertura, max 1 volta ogni 15 min),
 *   e se ci sono dati salvati solleva UpdateFailedWithCacheError.
 */
export async function fetchAccadeOggiPosts(options?: {
  forceRefresh?: boolean;
}): Promise<BloggerPost[]> {
  const cached = getCachedAccadeOggiPosts();
  const now = new Date();
  const nowMs = now.getTime();

  // Se c'è già una richiesta in corso e non è un refresh manuale forzato,
  // riutilizza la stessa Promise (deduplicazione in-flight: impedisce chiamate triple all'avvio)
  if (!options?.forceRefresh && inFlightFetchPromise) {
    return inFlightFetchPromise;
  }

  // Recupera lastCheckedAt da IndexedDB se non presente in memoria
  if (!inMemoryLastCheckedAt) {
    const meta = await getFeedMeta(ACCADE_OGGI_FEED_KEY);
    inMemoryLastCheckedAt = meta?.lastCheckedAt || meta?.downloadedAt || 0;
  }

  const needsRefresh = options?.forceRefresh || shouldRefreshTelegramFeed(inMemoryLastCheckedAt, now, inMemoryLastFailedAttempt);

  // In caso di offline del dispositivo
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (cached.length > 0) {
      return cached;
    }
    throw new Error('Impossibile contattare la fonte dei dati: sei offline');
  }

  // Se non occorre aggiornare (cache valida e slot non superato), usa i dati salvati
  if (!needsRefresh && cached.length > 0) {
    return cached;
  }

  // Se in cooldown da tentativo fallito e non è un refresh manuale forzato dall'utente
  if (!options?.forceRefresh && inMemoryLastFailedAttempt > 0 && nowMs - inMemoryLastFailedAttempt < TELEGRAM_CONFIG.RETRY_FAILED_COOLDOWN_MS) {
    if (cached.length > 0) {
      return cached;
    }
    throw new Error('Impossibile contattare la fonte dei dati');
  }

  // Avvia il task asincrono con deduplicazione
  const fetchTask = (async () => {
    // URL pulito SENZA parametri random/timestamp, così browser e Cloudflare CDN possono riutilizzare la cache HTTP
    const primaryUrl = options?.forceRefresh
      ? `${TELEGRAM_CONFIG.FEED_URL}?_force=${nowMs}`
      : TELEGRAM_CONFIG.FEED_URL;

    let xml = '';
    let primaryError: any = null;

    // 1. Tentativo primario: Cloudflare Worker diretto con cache browser standard ('default')
    try {
      const res = await fetch(primaryUrl, {
        cache: options?.forceRefresh ? 'reload' : 'default',
        headers: {
          Accept: 'application/atom+xml, application/xml, text/xml, */*',
        },
      });

      if (res.ok) {
        const text = await res.text();
        if (text && text.includes('<entry')) {
          xml = text;
        }
      } else {
        throw new Error(`Stato HTTP Worker non valido: ${res.status}`);
      }
    } catch (err: any) {
      primaryError = err;
      console.warn('Tentativo primario Cloudflare Worker non riuscito:', err?.message || err);
    }

    // 2. Se fallito (ad es. blocco CORS locale o Worker temporaneamente irraggiungibile), prova endpoint proxy o statico
    if (!xml) {
      try {
        const proxyUrl = options?.forceRefresh
          ? `/api/accade-oggi-feed?_force=${nowMs}`
          : '/api/accade-oggi-feed';
        const res = await fetch(proxyUrl, {
          cache: options?.forceRefresh ? 'reload' : 'default',
          headers: {
            Accept: 'application/atom+xml, application/xml, text/xml, */*',
          },
        });
        if (res.ok) {
          const text = await res.text();
          if (text && text.includes('<entry')) {
            xml = text;
            primaryError = null;
          }
        }
      } catch {
        // Fallback statico successivo
      }
    }

    if (!xml) {
      try {
        const base = import.meta.env.BASE_URL || '/';
        const cleanBase = base.endsWith('/') ? base : `${base}/`;
        const staticUrl = `${cleanBase}telegram.xml`;
        const res = await fetch(staticUrl, {
          cache: options?.forceRefresh ? 'reload' : 'default',
        });
        if (res.ok) {
          const text = await res.text();
          if (text && text.includes('<entry')) {
            xml = text;
            primaryError = null;
          }
        }
      } catch {
        // Nessun altro fallback disponibile
      }
    }

    if (xml) {
      const parsed = parseAtomXmlToPosts(xml);

      // Reset cooldown ed aggiornamento di lastCheckedAt
      inMemoryLastFailedAttempt = 0;
      inMemoryLastCheckedAt = nowMs;

      if (parsed.length > 0) {
        saveCachedAccadeOggiPosts(parsed, nowMs);
        return parsed;
      } else if (cached.length > 0) {
        await updateAccadeOggiLastCheckedAt(nowMs);
        return cached;
      }
    }

    // Registra timestamp del fallimento per il cooldown
    inMemoryLastFailedAttempt = nowMs;
    console.warn('Errore finale download feed Telegram:', primaryError);

    if (cached.length > 0) {
      throw new UpdateFailedWithCacheError('Aggiornamento non riuscito, contenuti salvati', cached);
    }

    throw new Error('Impossibile contattare la fonte dei dati');
  })();

  inFlightFetchPromise = fetchTask;

  try {
    return await fetchTask;
  } finally {
    inFlightFetchPromise = null;
  }
}
