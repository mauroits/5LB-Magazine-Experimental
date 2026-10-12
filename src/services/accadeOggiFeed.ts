import { BloggerPost } from '../types';
import { FEED_SYNC_CONFIG } from '../config/syncConfig';
import { getReadPostIds, getFavoritePostIds } from './bloggerFeed';

export const ACCADE_OGGI_PRIMARY_URL =
  'https://rss-bridge.org/bridge01/?action=display&username=magazine5LB&bridge=TelegramBridge&format=Atom';
export const ACCADE_OGGI_FALLBACK_URL =
  'https://rss-bridge.ggc-project.de/?action=display&username=magazine5LB&bridge=TelegramBridge&format=Atom';

export const ACCADE_OGGI_MAX_POSTS = 15;
const ACCADE_OGGI_CACHE_KEY = '5lb_accade_oggi_posts_v1';
const ACCADE_OGGI_TIMESTAMP_KEY = '5lb_accade_oggi_timestamp_v1';

export function getAccadeOggiCacheTimestamp(): number {
  try {
    const raw = localStorage.getItem(ACCADE_OGGI_TIMESTAMP_KEY);
    if (raw) return parseInt(raw, 10) || 0;
  } catch (e) {
    // ignore
  }
  return 0;
}

export function saveAccadeOggiCacheTimestamp(ts: number = Date.now()): void {
  try {
    localStorage.setItem(ACCADE_OGGI_TIMESTAMP_KEY, ts.toString());
  } catch (e) {
    // ignore
  }
}

export function getCachedAccadeOggiPosts(): BloggerPost[] {
  try {
    const raw = localStorage.getItem(ACCADE_OGGI_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, ACCADE_OGGI_MAX_POSTS);
      }
    }
  } catch (e) {
    console.warn('Errore lettura cache Accade Oggi:', e);
  }
  return [];
}

export function saveCachedAccadeOggiPosts(posts: BloggerPost[]): void {
  try {
    const limited = posts.slice(0, ACCADE_OGGI_MAX_POSTS);
    localStorage.setItem(ACCADE_OGGI_CACHE_KEY, JSON.stringify(limited));
    saveAccadeOggiCacheTimestamp(Date.now());
  } catch (e) {
    console.warn('Errore salvataggio cache Accade Oggi:', e);
  }
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
 * Robust extraction of the first image inside an HTML snippet
 */
function extractFirstImage(html: string): string | undefined {
  if (!html) return undefined;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match && match[1]) {
    return match[1];
  }
  return undefined;
}

/**
 * Parse Atom XML into standard BloggerPost items flagged with isAccadeOggi: true
 * Limited strictly to at most 15 posts as required.
 */
export function parseAtomXmlToPosts(xmlText: string): BloggerPost[] {
  const readIds = getReadPostIds();
  const favIds = getFavoritePostIds();
  const posts: BloggerPost[] = [];

  // Try parsing with DOMParser if available in browser
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');
      const entryElements = doc.querySelectorAll('entry');

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
    } catch (e) {
      console.warn('DOMParser failed for Atom XML, falling back to regex:', e);
    }
  }

  // Regex fallback if DOMParser didn't find entries
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

  // Strictly cap at max 15 posts as requested
  return posts.slice(0, ACCADE_OGGI_MAX_POSTS);
}

/**
 * Fetches the Accade Oggi RSS feed using multi-tier fallback:
 * 1. Local backend proxy endpoint /api/accade-oggi-feed (handles server-side fetch & fallback)
 * 2. Direct fetch to primary rss-bridge.org
 * 3. Direct fetch to fallback rss-bridge.ggc-project.de
 * 4. Public CORS proxy fallback for static environments
 */
export async function fetchAccadeOggiPosts(options?: {
  forceRefresh?: boolean;
}): Promise<BloggerPost[]> {
  const cached = getCachedAccadeOggiPosts();
  const lastFetch = getAccadeOggiCacheTimestamp();
  const isFresh = lastFetch > 0 && Date.now() - lastFetch < FEED_SYNC_CONFIG.FOREGROUND_POLL_MS;

  // If not forcing refresh and cache is fresh, return cache immediately
  if (!options?.forceRefresh && isFresh && cached.length > 0) {
    return cached;
  }

  // If offline, return cache immediately
  if (typeof navigator !== 'undefined' && !navigator.onLine && cached.length > 0) {
    return cached;
  }

  // Tier 1: Local /api/accade-oggi-feed Express proxy
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
  } catch (e) {
    // Proxy unavailable (e.g. pure static deployment)
  }

  // Tier 2: Direct fetch to primary rss-bridge.org
  try {
    const res = await fetch(ACCADE_OGGI_PRIMARY_URL);
    if (res.ok) {
      const xml = await res.text();
      const parsed = parseAtomXmlToPosts(xml);
      if (parsed.length > 0) {
        saveCachedAccadeOggiPosts(parsed);
        return parsed;
      }
    }
  } catch (e) {
    // Primary failed or CORS blocked
  }

  // Tier 3: Direct fetch to fallback rss-bridge.ggc-project.de
  try {
    const res = await fetch(ACCADE_OGGI_FALLBACK_URL);
    if (res.ok) {
      const xml = await res.text();
      const parsed = parseAtomXmlToPosts(xml);
      if (parsed.length > 0) {
        saveCachedAccadeOggiPosts(parsed);
        return parsed;
      }
    }
  } catch (e) {
    // Fallback failed or CORS blocked
  }

  // Tier 4: Public CORS proxies
  for (const feedUrl of [ACCADE_OGGI_PRIMARY_URL, ACCADE_OGGI_FALLBACK_URL]) {
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const xml = await res.text();
        const parsed = parseAtomXmlToPosts(xml);
        if (parsed.length > 0) {
          saveCachedAccadeOggiPosts(parsed);
          return parsed;
        }
      }
    } catch (e) {
      // try next
    }
  }

  // If network failed but cache exists, return cache
  if (cached.length > 0) {
    return cached;
  }

  throw new Error('Impossibile scaricare il feed di Accade Oggi al momento.');
}
