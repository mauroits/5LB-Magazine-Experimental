import { BloggerPost } from '../types';
import { FEED_SYNC_CONFIG } from '../config/syncConfig';
import { TELEGRAM_CONFIG } from '../config/telegramConfig';
import { getReadPostIds, getFavoritePostIds } from './bloggerFeed';
import {
  getFeedMeta,
  setFeedMeta,
  getFeedDownloadedAt,
} from '../utils/idbStorage';

export const ACCADE_OGGI_MAX_POSTS = 15;
const ACCADE_OGGI_FEED_KEY = 'accade_oggi';

let inMemoryAccadeOggiPosts: BloggerPost[] = [];
let inMemoryAccadeOggiTimestamp = 0;

/**
 * Inizializza i post di Accade Oggi caricandoli da IndexedDB (store feed_meta).
 * Il feed di Accade Oggi è rigorosamente separato dall'archivio degli articoli del Magazine.
 */
export async function initAccadeOggiStorage(): Promise<BloggerPost[]> {
  try {
    const meta = await getFeedMeta(ACCADE_OGGI_FEED_KEY);
    inMemoryAccadeOggiTimestamp = meta?.downloadedAt || 0;

    if (meta && Array.isArray(meta.posts) && meta.posts.length > 0) {
      inMemoryAccadeOggiPosts = meta.posts.slice(0, ACCADE_OGGI_MAX_POSTS);
    }
  } catch {
    // In-memory fallback
  }
  return inMemoryAccadeOggiPosts;
}

export function getAccadeOggiCacheTimestamp(): number {
  return inMemoryAccadeOggiTimestamp;
}

export function saveAccadeOggiCacheTimestamp(ts: number = Date.now()): void {
  inMemoryAccadeOggiTimestamp = ts;
}

export function getCachedAccadeOggiPosts(): BloggerPost[] {
  return inMemoryAccadeOggiPosts;
}

/**
 * Salva i post di Accade Oggi in memoria e in IndexedDB (nello store feed_meta).
 * IMPORTANTE: NON vengono salvati nello store degli articoli del Magazine,
 * evitando che appaiano in "Il mio archivio" o nei conteggi dei badge.
 */
export function saveCachedAccadeOggiPosts(posts: BloggerPost[]): void {
  const limited = posts.slice(0, ACCADE_OGGI_MAX_POSTS);
  inMemoryAccadeOggiPosts = limited;
  inMemoryAccadeOggiTimestamp = Date.now();

  setFeedMeta(ACCADE_OGGI_FEED_KEY, {
    downloadedAt: inMemoryAccadeOggiTimestamp,
    postIds: limited.map((p) => p.id),
    posts: limited,
  }).catch(() => {});
}

function cleanHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#33;/g, '!')
    .replace(/&#13;/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

          const content = entry.querySelector('content')?.textContent?.trim() || '';
          const thumbnail = extractFirstImage(content);

          const summary = content
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 180);

          posts.push({
            id,
            title: cleanHtmlEntities(rawTitle),
            published,
            updated,
            content,
            summary: summary ? `${summary}...` : rawTitle,
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
          const content = item.querySelector('description')?.textContent?.trim() || '';
          const thumbnail = extractFirstImage(content);

          const summary = content
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 180);

          posts.push({
            id,
            title: cleanHtmlEntities(rawTitle),
            published,
            updated: published,
            content,
            summary: summary ? `${summary}...` : rawTitle,
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
      const content = (entryXml.match(/<content[^>]*>([\s\S]*?)<\/content>/i) || [])[1]?.trim() || '';

      const thumbnail = extractFirstImage(content);
      const summary = content
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 180);

      posts.push({
        id,
        title: cleanHtmlEntities(rawTitle.replace(/<[^>]+>/g, '')),
        published,
        updated,
        content,
        summary: summary ? `${summary}...` : rawTitle,
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
 * Calcola l'URL risolto del feed Telegram configurabile.
 * Se configurato come percorso relativo (es. 'telegram.xml'), antepone il base path.
 */
function resolveTelegramFeedUrl(): string {
  const configured = TELEGRAM_CONFIG.FEED_URL.trim();
  if (configured.startsWith('http://') || configured.startsWith('https://')) {
    return configured;
  }
  const base = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL ? import.meta.env.BASE_URL : '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  if (configured.startsWith('/')) {
    return `${cleanBase}${configured.slice(1)}`;
  }
  return `${cleanBase}${configured}`;
}

/**
 * Carica il feed di Accade Oggi dalla sorgente primaria configurata (file statico telegram.xml).
 * In caso di offline restituisce la cache salvata in precedenza.
 * Rimosse tutte le dipendenze da rss-bridge pubblici e allorigins.win.
 */
export async function fetchAccadeOggiPosts(options?: {
  forceRefresh?: boolean;
}): Promise<BloggerPost[]> {
  const cached = getCachedAccadeOggiPosts();
  const lastFetch = (await getFeedDownloadedAt(ACCADE_OGGI_FEED_KEY)) || getAccadeOggiCacheTimestamp();
  const isFresh = lastFetch > 0 && Date.now() - lastFetch < FEED_SYNC_CONFIG.FOREGROUND_POLL_MS;

  // Se la cache è fresca (< 6 ore) e non è richiesto refresh forzato, restituisci subito
  if (!options?.forceRefresh && isFresh && cached.length > 0) {
    return cached;
  }

  // Se il dispositivo è offline, restituisci la cache
  if (typeof navigator !== 'undefined' && !navigator.onLine && cached.length > 0) {
    return cached;
  }

  const primaryUrl = resolveTelegramFeedUrl();

  // 1. Sorgente primaria: file statico configurato (telegram.xml)
  try {
    const res = await fetch(primaryUrl, {
      cache: options?.forceRefresh ? 'reload' : 'default',
    });
    if (res.ok) {
      const xml = await res.text();
      const parsed = parseAtomXmlToPosts(xml);
      if (parsed.length > 0) {
        saveCachedAccadeOggiPosts(parsed);
        return parsed;
      }
    }
  } catch (e) {
    // Prova il fallback locale se presente
  }

  // 2. Fallback secondario: endpoint server locale /api/accade-oggi-feed (se su server Express)
  if (primaryUrl !== '/api/accade-oggi-feed') {
    try {
      const res = await fetch('/api/accade-oggi-feed');
      if (res.ok) {
        const xml = await res.text();
        const parsed = parseAtomXmlToPosts(xml);
        if (parsed.length > 0) {
          saveCachedAccadeOggiPosts(parsed);
          return parsed;
        }
      }
    } catch {
      // Ignora errore server
    }
  }

  // 3. Fallback: se la rete fallisce ma abbiamo dati in cache, usali
  if (cached.length > 0) {
    return cached;
  }

  throw new Error('Impossibile scaricare il feed di Accade Oggi da telegram.xml al momento.');
}
