import { BloggerPost } from '../types';
import { postMatchesExactPhrase } from '../utils/searchUtils';
import { PUBLICATION_DELAY_HOURS } from '../config/navigation';
import { FEED_SYNC_CONFIG } from '../config/syncConfig';
import { syncNewestPostWithSW } from './periodicSyncService';

const FEED_CACHE_KEY = '5lb_magazine_posts_cache_v1';
const FEED_CACHE_TIMESTAMP_KEY = '5lb_magazine_feed_timestamp_v1';
const READ_POSTS_KEY = '5lb_read_posts_v1';
const FAVORITE_POSTS_KEY = '5lb_favorite_posts_v1';

// Minimum interval between automatic background fetches from Blogger (configured in syncConfig.ts)
export const FEED_CACHE_TTL_MS = FEED_SYNC_CONFIG.FOREGROUND_POLL_MS;

export function getFeedCacheTimestamp(): number {
  try {
    const raw = localStorage.getItem(FEED_CACHE_TIMESTAMP_KEY);
    if (raw) return parseInt(raw, 10) || 0;
  } catch (e) {
    // ignore
  }
  return 0;
}

export function saveFeedCacheTimestamp(ts: number = Date.now()): void {
  try {
    localStorage.setItem(FEED_CACHE_TIMESTAMP_KEY, ts.toString());
  } catch (e) {
    // ignore
  }
}

/**
 * Upgrade low-resolution thumbnails to high-definition:
 * - YouTube: upgrades /default.jpg (120x90) and /mqdefault.jpg to /hqdefault.jpg (480x360)
 * - Blogger / Google User Content: upgrades /s72-c/ or =s72-c to /w800-h450-c/
 */
export function upgradeThumbnailUrl(url?: string): string | undefined {
  if (!url) return undefined;

  // 1. YouTube thumbnails
  if (url.includes('youtube.com') || url.includes('ytimg.com')) {
    return url
      .replace(/\/default\.jpg/i, '/hqdefault.jpg')
      .replace(/\/mqdefault\.jpg/i, '/hqdefault.jpg')
      .replace(/\/sddefault\.jpg/i, '/hqdefault.jpg');
  }

  // 2. Google User Content / Blogger photos
  let upgraded = url;
  // Upgrade slash pattern e.g. /s72-c/ or /s200/
  upgraded = upgraded.replace(/\/s\d+(-[a-zA-Z0-9_-]+)?\//g, '/w800-h450-c/');
  // Upgrade query param / dimension pattern e.g. =s72-c or =w72-h72
  upgraded = upgraded.replace(/=s\d+(-[a-zA-Z0-9_-]+)?/g, '=w800-h450-c');
  upgraded = upgraded.replace(/=w\d+(-h\d+)?(-[a-zA-Z0-9_-]+)?/g, '=w800-h450-c');

  return upgraded;
}

// Extract first image or embedded YouTube thumbnail from HTML content
function extractFirstImage(html: string): string | undefined {
  if (!html) return undefined;

  // Check for embedded YouTube iframe or video ID
  const ytMatch = html.match(/(?:youtube\.com\/(?:embed\/|v\/|watch\?v=)|youtu\.be\/)([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }

  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match && match[1]) {
    return upgradeThumbnailUrl(match[1]);
  }
  return undefined;
}

// Clean HTML to generate a neat plain-text snippet
function cleanTextSnippet(html: string, maxLength = 180): string {
  if (!html) return '';
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function getReadPostIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_POSTS_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch (e) {
    console.error(e);
  }
  return new Set();
}

export function saveReadPostIds(ids: Set<string>) {
  try {
    localStorage.setItem(READ_POSTS_KEY, JSON.stringify(Array.from(ids)));
  } catch (e) {
    console.error(e);
  }
}

export function getFavoritePostIds(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITE_POSTS_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch (e) {
    console.error(e);
  }
  return new Set();
}

export function saveFavoritePostIds(ids: Set<string>) {
  try {
    localStorage.setItem(FAVORITE_POSTS_KEY, JSON.stringify(Array.from(ids)));
  } catch (e) {
    console.error(e);
  }
}

export const DEFAULT_PAGE_SIZE = 15;

export interface FetchBloggerPostsResult {
  posts: BloggerPost[];
  totalResults: number;
  hasMore: boolean;
}

export function getCachedPosts(): BloggerPost[] {
  try {
    const raw = localStorage.getItem(FEED_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Errore lettura cache post:', e);
  }
  return [];
}

/**
 * Converte una voce (entry) grezza del feed Atom/JSON Blogger in un oggetto BloggerPost standardizzato.
 */
export function parseBloggerEntry(
  entry: any,
  readIds?: Set<string>,
  favIds?: Set<string>
): BloggerPost {
  const currentRead = readIds || getReadPostIds();
  const currentFavs = favIds || getFavoritePostIds();

  const id = entry.id?.$t || Math.random().toString();
  const title = (entry.title?.$t || 'Senza titolo').trim();
  const published = entry.published?.$t || new Date().toISOString();
  const updated = entry.updated?.$t || published;
  const content = entry.content?.$t || entry.summary?.$t || '';
  const summary = cleanTextSnippet(content);

  const categories: string[] = Array.isArray(entry.category)
    ? entry.category.map((c: any) => c.term || '').filter(Boolean)
    : [];

  let link = 'https://magazine.5lb.eu';
  if (Array.isArray(entry.link)) {
    const altLink = entry.link.find((l: any) => l.rel === 'alternate' && l.type === 'text/html');
    if (altLink && altLink.href) {
      link = altLink.href;
    }
  }

  const authorName = entry.author?.[0]?.name?.$t || 'Redazione 5LB';

  let thumbnail: string | undefined = undefined;
  if (entry.media$thumbnail?.url) {
    thumbnail = upgradeThumbnailUrl(entry.media$thumbnail.url);
  } else {
    thumbnail = extractFirstImage(content);
  }

  return {
    id,
    title,
    published,
    updated,
    content,
    summary,
    categories,
    link,
    author: { name: authorName },
    thumbnail,
    isRead: currentRead.has(id),
    isFavorite: currentFavs.has(id),
  };
}

/**
 * Fetch feed using Google Blogger's official JSONP protocol (alt=json-in-script).
 * Avoids browser CORS restrictions on static deployments (e.g. app.5lb.eu or GitHub Pages).
 */
function fetchBloggerJsonp(maxResults: number, startIndex: number = 1, category?: string, q?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const cbName = `blogger_cb_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    const script = document.createElement('script');

    let fullUrl = category
      ? `https://magazine.5lb.eu/feeds/posts/default/-/${encodeURIComponent(category)}?alt=json-in-script&callback=${cbName}&max-results=${maxResults}&start-index=${startIndex}`
      : `https://magazine.5lb.eu/feeds/posts/default?alt=json-in-script&callback=${cbName}&max-results=${maxResults}&start-index=${startIndex}`;

    if (q) {
      fullUrl += `&q=${encodeURIComponent(q)}`;
    }

    script.src = fullUrl;
    script.async = true;

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout durante il download dei feed da Blogger (JSONP)'));
    }, 15000);

    const cleanup = () => {
      clearTimeout(timer);
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      try {
        delete (window as any)[cbName];
      } catch (e) {
        (window as any)[cbName] = undefined;
      }
    };

    (window as any)[cbName] = (data: any) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('Errore di rete durante il caricamento del feed Blogger'));
    };

    document.head.appendChild(script);
  });
}

export async function fetchBloggerPosts(options?: {
  maxResults?: number;
  startIndex?: number;
  category?: string;
  q?: string;
  forceRefresh?: boolean;
}): Promise<FetchBloggerPostsResult> {
  const maxResults = options?.maxResults || DEFAULT_PAGE_SIZE;
  const startIndex = options?.startIndex || 1;
  const category = options?.category;
  const q = options?.q;
  const forceRefresh = options?.forceRefresh || false;

  // Check cached data
  let cachedPosts: BloggerPost[] = getCachedPosts();

  // If offline and have cache, return cache immediately
  if (!navigator.onLine && cachedPosts.length > 0) {
    let filtered = applyFilter(cachedPosts, category);
    if (q) {
      filtered = filtered.filter((p) => postMatchesExactPhrase(p, q));
    }
    return {
      posts: filtered.slice(startIndex - 1, startIndex - 1 + maxResults),
      totalResults: filtered.length,
      hasMore: startIndex + maxResults - 1 < filtered.length,
    };
  }

  // Sustainable rate check: if fetching general feed (page 1) without explicit forceRefresh,
  // return cache if it was updated recently (< FEED_CACHE_TTL_MS, 15 min) to prevent repeated calls
  if (!forceRefresh && !category && !q && startIndex === 1 && cachedPosts.length > 0) {
    const lastFetch = getFeedCacheTimestamp();
    const isCacheFresh = lastFetch > 0 && Date.now() - lastFetch < FEED_CACHE_TTL_MS;
    if (isCacheFresh) {
      return {
        posts: cachedPosts.slice(0, maxResults),
        totalResults: cachedPosts.length,
        hasMore: cachedPosts.length >= maxResults,
      };
    }
  }

  // If forceRefresh is requested on general feed, clear cache entry
  if (forceRefresh && !category && !q && startIndex === 1) {
    try {
      localStorage.removeItem(FEED_CACHE_KEY);
      localStorage.removeItem(FEED_CACHE_TIMESTAMP_KEY);
      cachedPosts = [];
    } catch (e) {
      // ignore
    }
  }

  let jsonResult: any = null;

  // Method 1: Try local backend proxy /api/feed (fast on full-stack dev/server)
  try {
    let proxyUrl = category
      ? `/api/feed?max-results=${maxResults}&start-index=${startIndex}&category=${encodeURIComponent(category)}`
      : `/api/feed?max-results=${maxResults}&start-index=${startIndex}`;

    if (q) {
      proxyUrl += `&q=${encodeURIComponent(q)}`;
    }

    const fetchHeaders: Record<string, string> = { Accept: 'application/json' };
    if (!category && !q && startIndex === 1 && cachedPosts.length > 0 && cachedPosts[0].published && !forceRefresh) {
      fetchHeaders['If-Modified-Since'] = new Date(cachedPosts[0].published).toUTCString();
    }

    const res = await fetch(proxyUrl, { headers: fetchHeaders });

    // Handle 304 Not Modified -> Feed is completely up to date! Return cached posts immediately
    if (res.status === 304 && cachedPosts.length > 0) {
      saveFeedCacheTimestamp(Date.now());
      let filtered = applyFilter(cachedPosts, category);
      return {
        posts: filtered.slice(startIndex - 1, startIndex - 1 + maxResults),
        totalResults: filtered.length,
        hasMore: startIndex + maxResults - 1 < filtered.length,
      };
    }

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      jsonResult = await res.json();
    }
  } catch (e) {
    // Proxy not available (static hosting like app.5lb.eu or GitHub Pages)
  }

  // Method 2: If proxy not available or failed, use native Blogger JSONP (100% CORS-free client side)
  if (!jsonResult || !jsonResult.feed) {
    try {
      jsonResult = await fetchBloggerJsonp(maxResults, startIndex, category, q);
    } catch (errJsonp) {
      console.warn('Blogger JSONP fetch failed, trying direct fetch:', errJsonp);
    }
  }

  // Method 3: Fallback to direct fetch
  if (!jsonResult || !jsonResult.feed) {
    try {
      let directBloggerUrl = category
        ? `https://magazine.5lb.eu/feeds/posts/default/-/${encodeURIComponent(category)}?alt=json&max-results=${maxResults}&start-index=${startIndex}`
        : `https://magazine.5lb.eu/feeds/posts/default?alt=json&max-results=${maxResults}&start-index=${startIndex}`;

      if (q) {
        directBloggerUrl += `&q=${encodeURIComponent(q)}`;
      }

      const res = await fetch(directBloggerUrl);
      if (res.ok) {
        jsonResult = await res.json();
      }
    } catch (errDirect) {
      console.warn('Direct Blogger fetch failed:', errDirect);
    }
  }

  // If network failed but we have cache, fallback gracefully
  if (!jsonResult || !jsonResult.feed) {
    if (cachedPosts.length > 0) {
      let filtered = applyFilter(cachedPosts, category);
      if (q) {
        filtered = filtered.filter((p) => postMatchesExactPhrase(p, q));
      }
      return {
        posts: filtered.slice(startIndex - 1, startIndex - 1 + maxResults),
        totalResults: filtered.length,
        hasMore: startIndex + maxResults - 1 < filtered.length,
      };
    }
    throw new Error('Impossibile scaricare i post del magazine. Verifica la connessione internet.');
  }

  const rawTotal = jsonResult.feed?.openSearch$totalResults?.$t;
  const entries: any[] = Array.isArray(jsonResult.feed?.entry) ? jsonResult.feed.entry : [];
  const totalResults = rawTotal ? parseInt(rawTotal, 10) : entries.length;

  const readIds = getReadPostIds();
  const favIds = getFavoritePostIds();

  // Filter entries based on PUBLICATION_DELAY_HOURS to give author time to finalize URLs
  const now = Date.now();
  const delayMs = (PUBLICATION_DELAY_HOURS || 0) * 60 * 60 * 1000;
  const cutoffTime = now - delayMs;

  const validEntries = entries.filter((entry) => {
    if (!delayMs) return true;
    const pubStr = entry.published?.$t;
    if (!pubStr) return true;
    const pubTime = new Date(pubStr).getTime();
    if (isNaN(pubTime)) return true;
    return pubTime <= cutoffTime;
  });

  const parsedPosts: BloggerPost[] = validEntries.map((entry) =>
    parseBloggerEntry(entry, readIds, favIds)
  );

  // Merge and update cached posts in localStorage for general feed
  if (!category) {
    try {
      let merged = [...cachedPosts];
      for (const post of parsedPosts) {
        const existingIdx = merged.findIndex((p) => p.id === post.id);
        if (existingIdx >= 0) {
          merged[existingIdx] = post;
        } else {
          merged.push(post);
        }
      }
      // Keep sorted by publication date descending with id tiebreaker for stable deterministic ordering
      merged.sort((a, b) => {
        const diff = new Date(b.published).getTime() - new Date(a.published).getTime();
        if (diff !== 0) return diff;
        return b.id.localeCompare(a.id);
      });
      localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(merged.slice(0, 600)));
      saveFeedCacheTimestamp(Date.now());
      syncNewestPostWithSW(merged).catch(() => {});
    } catch (e) {
      console.warn('LocalStorage pieno per la cache dei post:', e);
    }
  }

  const hasMore = totalResults > 0
    ? (startIndex + validEntries.length - 1 < totalResults)
    : (validEntries.length >= maxResults);

  return {
    posts: parsedPosts,
    totalResults: totalResults || parsedPosts.length,
    hasMore,
  };
}

// Search the entire online Blogger archive by query
export async function searchBloggerArchive(
  query: string,
  maxResults = 30
): Promise<FetchBloggerPostsResult> {
  return fetchBloggerPosts({
    q: query.trim(),
    maxResults,
    startIndex: 1,
  });
}

function applyFilter(posts: BloggerPost[], category?: string): BloggerPost[] {
  if (!category) return posts;
  const target = category.toLowerCase().trim();
  return posts.filter((p) =>
    p.categories.some((c) => c.toLowerCase().includes(target) || target.includes(c.toLowerCase()))
  );
}

// Compute badge counts for all categories from current posts list
export function computeCategoryCounts(posts: BloggerPost[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const post of posts) {
    for (const cat of post.categories) {
      counts[cat] = (counts[cat] || 0) + 1;
    }
  }
  return counts;
}

// Format date Italian style with day, month, and year e.g. "28 Set 2024"
export function formatItalianDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    const months = [
      'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
      'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
}

/**
 * Normalizza un URL di un articolo per confronti affidabili e deduplicazione:
 * - Rimozione parametri di query (?m=1, ecc.) e hash
 * - Estrazione del pathname normalizzato in minuscolo senza slash finale
 */
export function normalizeArticleUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  try {
    const parsed = new URL(url.trim(), 'https://magazine.5lb.eu');
    return parsed.pathname.replace(/\/+$/, '').toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

/**
 * Verifica se un URL appartiene al dominio di 5LB Magazine (https://magazine.5lb.eu)
 * ed è un percorso di contenuto (non la homepage vuota o un asset statico come immagini o css).
 */
export function isMagazineUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host !== 'magazine.5lb.eu') return false;

    const pathname = parsed.pathname.toLowerCase().replace(/\/+$/, '');
    if (!pathname || pathname === '') return false;
    // Esclude asset grafici o script
    if (/\.(png|jpe?g|gif|svg|webp|ico|css|js|woff2?|xml|json)$/i.test(pathname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Cerca se un articolo corrispondente all'URL è già presente nella lista o cache locale.
 */
export function findPostByUrl(url: string, posts?: BloggerPost[]): BloggerPost | undefined {
  if (!url) return undefined;
  const list = posts || getCachedPosts();
  const targetNorm = normalizeArticleUrl(url);
  if (!targetNorm) return undefined;

  return list.find((p) => {
    if (p.link && normalizeArticleUrl(p.link) === targetNorm) return true;
    return false;
  });
}

/**
 * Esegue il fetch da Blogger usando uno script JSONP diretto con callback casuale.
 */
function fetchBloggerScriptUrl(fullUrl: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const cbName = `blogger_cb_direct_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    const script = document.createElement('script');
    const separator = fullUrl.includes('?') ? '&' : '?';
    script.src = `${fullUrl}${separator}alt=json-in-script&callback=${cbName}`;
    script.async = true;

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout durante la richiesta diretta a Blogger'));
    }, 15000);

    const cleanup = () => {
      clearTimeout(timer);
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      try {
        delete (window as any)[cbName];
      } catch {
        (window as any)[cbName] = undefined;
      }
    };

    (window as any)[cbName] = (data: any) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('Errore di connessione a Blogger'));
    };

    document.head.appendChild(script);
  });
}

/**
 * Scarica via RSS/Blogger API un singolo articolo partendo dal suo URL di magazine.5lb.eu.
 * Utilizza una pipeline di risoluzione a più livelli:
 * 1. Risoluzione diretta ad alta precisione tramite endpoint backend /api/post-by-url (estrae postId da HTML)
 * 2. Fallback per pagine monografiche (/p/...)
 * 3. Fallback con filtro su intervallo temporale mese (published-min / published-max per post in /YYYY/MM/)
 * 4. Fallback con ricerca full-text supportando sia parole separate da trattini sia notazione CamelCase
 * 5. Fallback su cache locale se precedentemente sincronizzato
 */
export async function fetchPostByUrl(url: string): Promise<BloggerPost> {
  if (!url) throw new Error('URL non valida.');
  const trimmedUrl = url.trim();
  const parsed = new URL(trimmedUrl, 'https://magazine.5lb.eu');
  const targetNorm = normalizeArticleUrl(parsed.href);

  // 1. Primaria e più potente: Risoluzione tramite endpoint dedicato /api/post-by-url
  try {
    const res = await fetch(`/api/post-by-url?url=${encodeURIComponent(trimmedUrl)}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.entry) {
        return parseBloggerEntry(data.entry);
      }
    }
  } catch (err) {
    console.warn('Risoluzione tramite /api/post-by-url non riuscita, procedo con fallback:', err);
  }

  // 2. Fallback per pagine monografiche (/p/...)
  const isPage = targetNorm.startsWith('/p/');
  if (isPage) {
    let jsonResult: any = null;
    try {
      const res = await fetch('/api/feed?type=pages&max-results=50');
      if (res.ok) jsonResult = await res.json();
    } catch {
      // ignore
    }

    if (!jsonResult || !jsonResult.feed) {
      try {
        const res = await fetch('https://magazine.5lb.eu/feeds/pages/default?alt=json&max-results=50');
        if (res.ok) jsonResult = await res.json();
      } catch {
        try {
          jsonResult = await fetchBloggerScriptUrl('https://magazine.5lb.eu/feeds/pages/default?max-results=50');
        } catch {
          // ignore
        }
      }
    }

    if (jsonResult?.feed?.entry) {
      const entries: any[] = Array.isArray(jsonResult.feed.entry) ? jsonResult.feed.entry : [jsonResult.feed.entry];
      const matched = entries.find((e) => {
        const link = e.link?.find((l: any) => l.rel === 'alternate')?.href;
        return link && normalizeArticleUrl(link) === targetNorm;
      });
      if (matched) {
        return parseBloggerEntry(matched);
      }
    }
  } else {
    // 3. Fallback per post regolari: Ricerca per mese di pubblicazione se l'URL contiene /YYYY/MM/
    const dateMatch = targetNorm.match(/^\/([12][0-9]{3})\/([01][0-9])\//);
    if (dateMatch) {
      const year = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10);
      const startIso = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
      const endIso = new Date(
        Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1, 0, 0, 0)
      ).toISOString();

      let monthData: any = null;
      try {
        const res = await fetch(
          `/api/feed?published-min=${encodeURIComponent(startIso)}&published-max=${encodeURIComponent(endIso)}&max-results=100`
        );
        if (res.ok) monthData = await res.json();
      } catch {
        // ignore
      }

      if (!monthData || !monthData.feed) {
        try {
          const directMonthUrl = `https://magazine.5lb.eu/feeds/posts/default?alt=json&published-min=${encodeURIComponent(
            startIso
          )}&published-max=${encodeURIComponent(endIso)}&max-results=100`;
          const res = await fetch(directMonthUrl);
          if (res.ok) monthData = await res.json();
        } catch {
          try {
            const scriptMonthUrl = `https://magazine.5lb.eu/feeds/posts/default?published-min=${encodeURIComponent(
              startIso
            )}&published-max=${encodeURIComponent(endIso)}&max-results=100`;
            monthData = await fetchBloggerScriptUrl(scriptMonthUrl);
          } catch {
            // ignore
          }
        }
      }

      if (monthData?.feed?.entry) {
        const entries: any[] = Array.isArray(monthData.feed.entry) ? monthData.feed.entry : [monthData.feed.entry];
        const matched = entries.find((e) => {
          const link = e.link?.find((l: any) => l.rel === 'alternate')?.href;
          return link && normalizeArticleUrl(link) === targetNorm;
        });
        if (matched) {
          return parseBloggerEntry(matched);
        }
      }
    }

    // 4. Fallback: Ricerca per parole chiave (supportando sia trattini che notazione CamelCase)
    const filename = targetNorm.split('/').pop()?.replace(/\.html$/, '') || '';
    const words = filename
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .split(/[-_\s]+/)
      .filter((w) => w.length > 2);

    const searchQueries = [
      words.slice(0, 3).join(' '),
      words[0],
      filename,
    ].filter(Boolean);

    for (const q of searchQueries) {
      let jsonResult: any = null;
      try {
        const res = await fetch(`/api/feed?max-results=30&q=${encodeURIComponent(q)}`);
        if (res.ok) jsonResult = await res.json();
      } catch {
        // ignore
      }

      if (!jsonResult || !jsonResult.feed) {
        try {
          const directUrl = `https://magazine.5lb.eu/feeds/posts/default?alt=json&max-results=30&q=${encodeURIComponent(q)}`;
          const res = await fetch(directUrl);
          if (res.ok) jsonResult = await res.json();
        } catch {
          try {
            jsonResult = await fetchBloggerJsonp(30, 1, undefined, q);
          } catch {
            // ignore
          }
        }
      }

      if (jsonResult?.feed?.entry) {
        const entries: any[] = Array.isArray(jsonResult.feed.entry) ? jsonResult.feed.entry : [jsonResult.feed.entry];
        const matched = entries.find((e) => {
          const link = e.link?.find((l: any) => l.rel === 'alternate')?.href;
          return link && normalizeArticleUrl(link) === targetNorm;
        });
        if (matched) {
          return parseBloggerEntry(matched);
        }
      }
    }
  }

  // 5. Se già in cache locale e la rete non trova o è offline, restituisci quello in cache
  const cached = findPostByUrl(trimmedUrl);
  if (cached) {
    return cached;
  }

  throw new Error(`Impossibile scaricare l'articolo da magazine.5lb.eu per "${trimmedUrl}".`);
}

/**
 * Salva o aggiorna un articolo nella cache locale e aggiorna la persistenza:
 * - Se già esistente (stesso id o stesso pathname link): aggiorna i campi mantenendo isRead e isFavorite.
 * - Se nuovo: inserisce l'articolo e mantiene l'ordinamento decrescente per data di pubblicazione.
 * Restituisce l'array aggiornato e un flag isUpdate (true se già presente, false se nuovo).
 */
export function saveOrUpdatePostInCache(
  post: BloggerPost,
  currentPosts: BloggerPost[],
  options?: { markFavorite?: boolean }
): { updatedPosts: BloggerPost[]; isUpdate: boolean; post: BloggerPost } {
  const targetNorm = normalizeArticleUrl(post.link);
  const existingIdx = currentPosts.findIndex((p) => {
    if (p.id === post.id) return true;
    if (p.link && post.link && normalizeArticleUrl(p.link) === targetNorm) return true;
    return false;
  });

  let isUpdate = false;
  let finalPost: BloggerPost;
  let updatedPosts: BloggerPost[];

  if (existingIdx >= 0) {
    isUpdate = true;
    const existing = currentPosts[existingIdx];
    finalPost = {
      ...post,
      id: existing.id || post.id,
      isRead: existing.isRead ?? post.isRead,
      isFavorite: options?.markFavorite ? true : (existing.isFavorite ?? post.isFavorite),
    };
    updatedPosts = [...currentPosts];
    updatedPosts[existingIdx] = finalPost;
  } else {
    isUpdate = false;
    finalPost = {
      ...post,
      isFavorite: options?.markFavorite ? true : post.isFavorite,
    };
    updatedPosts = [finalPost, ...currentPosts];
  }

  if (options?.markFavorite) {
    const currentFavs = getFavoritePostIds();
    currentFavs.add(finalPost.id);
    saveFavoritePostIds(currentFavs);
  }

  // Ordina per data di pubblicazione decrescente
  updatedPosts.sort((a, b) => {
    const diff = new Date(b.published).getTime() - new Date(a.published).getTime();
    if (diff !== 0) return diff;
    return b.id.localeCompare(a.id);
  });

  try {
    localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(updatedPosts.slice(0, 600)));
    saveFeedCacheTimestamp(Date.now());
    syncNewestPostWithSW(updatedPosts).catch(() => {});
  } catch (e) {
    console.warn('LocalStorage pieno per la cache dei post:', e);
  }

  return { updatedPosts, isUpdate, post: finalPost };
}


