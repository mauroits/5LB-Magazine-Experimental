import express from 'express';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// ============================================================================
// CACHE SYSTEM CONFIGURATION & TTLs
// ============================================================================
// Magazine articles update rarely (~2 articles per month).
// "Accade Oggi" social page updates daily (1-2 times, usually in the morning).
const TTL_MAGAZINE_ARTICLE_MS = 24 * 60 * 60 * 1000; // 24 hours for single articles
const TTL_MAGAZINE_PAGES_MS = 24 * 60 * 60 * 1000;   // 24 hours for monographic pages
const TTL_MAGAZINE_ARCHIVE_MS = 12 * 60 * 60 * 1000; // 12 hours for searches / categories / pagination
const TTL_MAGAZINE_FEED_MS = 4 * 60 * 60 * 1000;     // 4 hours for home feed (page 1)
const TTL_MAGAZINE_UPDATES_MS = 30 * 60 * 1000;      // 30 min for check-updates
const TTL_TELEGRAM_MS = 5 * 60 * 1000;               // 5 min for Telegram iframe

/**
 * Accade Oggi dynamic TTL:
 * In Italy (Europe/Rome timezone), posts arrive typically between 07:00 and 13:59.
 * Morning TTL: 25 minutes (catches updates quickly without hitting bridge rate limits).
 * Afternoon/Night TTL: 60 minutes.
 */
function getAccadeOggiTTL(): number {
  try {
    const romeHourStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Rome',
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(new Date());
    const hour = parseInt(romeHourStr, 10);
    if (hour >= 7 && hour < 14) {
      return 25 * 60 * 1000;
    }
  } catch {
    // fallback if Intl timezone is not available
  }
  return 60 * 60 * 1000;
}

// ============================================================================
// IN-MEMORY & OPTIONAL DISK-PERSISTED CACHE STORE
// ============================================================================
export interface CacheEntry {
  body: string;
  contentType: string;
  etag: string;
  lastModified?: string;
  cachedAt: number;
  expiresAt: number;
  ttlMs: number;
}

class ProxyCacheStore {
  private cache = new Map<string, CacheEntry>();
  private readonly maxItems = 1000;
  private readonly cacheDir = path.resolve(__dirname, '.cache');
  private readonly cacheFile = path.resolve(__dirname, '.cache', 'rss-proxy-cache.json');

  constructor() {
    this.loadFromDisk();
    // Prune expired entries every 15 minutes
    setInterval(() => this.prune(), 15 * 60 * 1000).unref();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const raw = fs.readFileSync(this.cacheFile, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          const now = Date.now();
          for (const [key, entry] of data) {
            // Restore entry if not horribly expired (> 7 days)
            if (entry && entry.expiresAt > now - 7 * 24 * 60 * 60 * 1000) {
              this.cache.set(key, entry);
            }
          }
          console.log(`📦 Cache preloaded with ${this.cache.size} entries from disk.`);
        }
      }
    } catch (err) {
      console.warn('⚠️ Could not load cache from disk:', err);
    }
  }

  private saveToDisk(): void {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
      const data = Array.from(this.cache.entries()).slice(-500);
      fs.writeFileSync(this.cacheFile, JSON.stringify(data), 'utf-8');
    } catch {
      // Ignore disk write errors in read-only / ephemeral environments
    }
  }

  get(key: string): (CacheEntry & { isFresh: boolean }) | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    const isFresh = Date.now() < entry.expiresAt;
    return { ...entry, isFresh };
  }

  set(
    key: string,
    data: {
      body: string;
      contentType: string;
      etag: string;
      lastModified?: string;
      ttlMs: number;
    }
  ): CacheEntry {
    const now = Date.now();
    const entry: CacheEntry = {
      body: data.body,
      contentType: data.contentType,
      etag: data.etag,
      lastModified: data.lastModified,
      cachedAt: now,
      expiresAt: now + data.ttlMs,
      ttlMs: data.ttlMs,
    };

    if (this.cache.size >= this.maxItems) {
      // Evict oldest entry
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, entry);
    // Debounced disk save
    this.scheduleSave();
    return entry;
  }

  renew(key: string, ttlMs: number): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.cachedAt = Date.now();
      entry.expiresAt = Date.now() + ttlMs;
      entry.ttlMs = ttlMs;
      this.cache.set(key, entry);
    }
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  private saveTimer: NodeJS.Timeout | null = null;
  private scheduleSave(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveToDisk();
    }, 5000);
  }

  private prune(): void {
    const now = Date.now();
    for (const [k, v] of this.cache.entries()) {
      if (now > v.expiresAt + 24 * 60 * 60 * 1000) {
        this.cache.delete(k);
      }
    }
  }
}

const cacheStore = new ProxyCacheStore();

// ============================================================================
// HTTP CONDITIONAL HEADER UTILITIES (ETag & If-Modified-Since)
// ============================================================================
function computeETag(body: string | Buffer): string {
  const hash = crypto.createHash('md5').update(body).digest('hex');
  return `"${hash}"`;
}

function matchesConditionalHeaders(
  req: express.Request,
  etag?: string,
  lastModified?: string
): boolean {
  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatch && etag) {
    const rawEtag = etag.replace(/^W\//, '').replace(/"/g, '');
    const clientEtags = ifNoneMatch
      .split(',')
      .map((t) => t.trim().replace(/^W\//, '').replace(/"/g, ''));
    if (clientEtags.includes('*') || clientEtags.includes(rawEtag)) {
      return true;
    }
  }

  const ifModifiedSince = req.headers['if-modified-since'];
  if (ifModifiedSince && lastModified) {
    const clientTime = Date.parse(ifModifiedSince);
    const serverTime = Date.parse(lastModified);
    if (!isNaN(clientTime) && !isNaN(serverTime) && serverTime <= clientTime) {
      return true;
    }
  }

  return false;
}

function sendCachedResponse(
  req: express.Request,
  res: express.Response,
  entry: CacheEntry,
  cacheStatus: 'HIT' | 'HIT-REVALIDATED' | 'MISS' | 'STALE-FALLBACK'
) {
  const ttlSec = Math.max(60, Math.floor(entry.ttlMs / 1000));
  const swrSec = ttlSec * 2;

  res.setHeader('ETag', entry.etag);
  if (entry.lastModified) {
    res.setHeader('Last-Modified', entry.lastModified);
  }
  res.setHeader('Cache-Control', `public, max-age=${ttlSec}, stale-while-revalidate=${swrSec}`);
  res.setHeader('X-Cache', cacheStatus);

  if (matchesConditionalHeaders(req, entry.etag, entry.lastModified)) {
    return res.status(304).end();
  }

  res.setHeader('Content-Type', entry.contentType);
  return res.status(200).send(entry.body);
}

// ============================================================================
// API ROUTES
// ============================================================================

// 1. Blogger Feed Proxy endpoint
app.get('/api/feed', async (req, res) => {
  const maxResults = (req.query['max-results'] as string) || '15';
  const startIndex = (req.query['start-index'] as string) || '1';
  const category = req.query['category'] as string | undefined;
  const q = req.query['q'] as string | undefined;
  const publishedMin = req.query['published-min'] as string | undefined;
  const publishedMax = req.query['published-max'] as string | undefined;
  const feedType = req.query['type'] as string | undefined;

  const isPages = feedType === 'pages';
  const isDefaultFeed = !isPages && !category && !q && !publishedMin && !publishedMax && startIndex === '1';

  let ttlMs = TTL_MAGAZINE_ARCHIVE_MS;
  if (isPages) {
    ttlMs = TTL_MAGAZINE_PAGES_MS;
  } else if (isDefaultFeed) {
    ttlMs = TTL_MAGAZINE_FEED_MS;
  }

  const cacheKey = `feed:${isPages ? 'pages' : 'posts'}:${category || ''}:${q || ''}:${startIndex}:${maxResults}:${publishedMin || ''}:${publishedMax || ''}`;
  const cached = cacheStore.get(cacheKey);

  // Return fresh cache immediately
  if (cached && cached.isFresh) {
    return sendCachedResponse(req, res, cached, 'HIT');
  }

  try {
    let targetUrl = isPages
      ? `https://magazine.5lb.eu/feeds/pages/default?alt=json&max-results=${maxResults}`
      : `https://magazine.5lb.eu/feeds/posts/default?alt=json&max-results=${maxResults}&start-index=${startIndex}`;

    if (category && !isPages) {
      targetUrl = `https://magazine.5lb.eu/feeds/posts/default/-/${encodeURIComponent(category)}?alt=json&max-results=${maxResults}&start-index=${startIndex}`;
    }
    if (q) {
      targetUrl += `&q=${encodeURIComponent(q)}`;
    }
    if (publishedMin) {
      targetUrl += `&published-min=${encodeURIComponent(publishedMin)}`;
    }
    if (publishedMax) {
      targetUrl += `&published-max=${encodeURIComponent(publishedMax)}`;
    }

    const fetchHeaders: Record<string, string> = {
      'User-Agent': '5LB-Magazine-PWA/1.0 (+https://5lb.eu)',
      Accept: 'application/json',
    };
    if (cached?.lastModified) {
      fetchHeaders['If-Modified-Since'] = cached.lastModified;
    }
    if (cached?.etag) {
      fetchHeaders['If-None-Match'] = cached.etag;
    }

    const response = await fetch(targetUrl, { headers: fetchHeaders });

    if (response.status === 304 && cached) {
      cacheStore.renew(cacheKey, ttlMs);
      return sendCachedResponse(req, res, cached, 'HIT-REVALIDATED');
    }

    if (!response.ok) {
      if (cached) {
        return sendCachedResponse(req, res, cached, 'STALE-FALLBACK');
      }
      return res.status(response.status).json({
        error: `Blogger feed returned ${response.status}: ${response.statusText}`,
      });
    }

    const data = await response.json();

    // 2-hour delay filter to ensure the author has finalized the publication URL
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    if (Array.isArray(data.feed?.entry)) {
      data.feed.entry = data.feed.entry.filter((entry: any) => {
        const pubStr = entry.published?.$t;
        if (!pubStr) return true;
        const pubTime = new Date(pubStr).getTime();
        return isNaN(pubTime) || pubTime <= cutoff;
      });
    }

    const newestPostDate =
      data.feed?.entry?.[0]?.updated?.$t ||
      data.feed?.entry?.[0]?.published?.$t ||
      data.feed?.updated?.$t;
    const lastModified = newestPostDate ? new Date(newestPostDate).toUTCString() : new Date().toUTCString();
    const jsonBody = JSON.stringify(data);
    const etag = computeETag(jsonBody);

    const newEntry = cacheStore.set(cacheKey, {
      body: jsonBody,
      contentType: 'application/json; charset=utf-8',
      etag,
      lastModified,
      ttlMs,
    });

    return sendCachedResponse(req, res, newEntry, 'MISS');
  } catch (error: any) {
    console.error('Error fetching Blogger feed:', error);
    if (cached) {
      return sendCachedResponse(req, res, cached, 'STALE-FALLBACK');
    }
    return res.status(500).json({ error: error.message || 'Internal feed error' });
  }
});

// 2. Endpoint to fetch a single article by Blogger postId
app.get('/api/post', async (req, res) => {
  const postId = (req.query.id as string | undefined)?.trim();
  if (!postId) {
    return res.status(400).json({ error: 'Missing id parameter' });
  }

  const cacheKey = `post-id:${postId}`;
  const cached = cacheStore.get(cacheKey);

  if (cached && cached.isFresh) {
    return sendCachedResponse(req, res, cached, 'HIT');
  }

  try {
    const targetUrl = `https://magazine.5lb.eu/feeds/posts/default/${encodeURIComponent(postId)}?alt=json`;
    const fetchHeaders: Record<string, string> = {
      'User-Agent': '5LB-Magazine-PWA/1.0 (+https://5lb.eu)',
      Accept: 'application/json',
    };
    if (cached?.lastModified) {
      fetchHeaders['If-Modified-Since'] = cached.lastModified;
    }
    if (cached?.etag) {
      fetchHeaders['If-None-Match'] = cached.etag;
    }

    const response = await fetch(targetUrl, { headers: fetchHeaders });

    if (response.status === 304 && cached) {
      cacheStore.renew(cacheKey, TTL_MAGAZINE_ARTICLE_MS);
      return sendCachedResponse(req, res, cached, 'HIT-REVALIDATED');
    }

    if (!response.ok) {
      if (cached) {
        return sendCachedResponse(req, res, cached, 'STALE-FALLBACK');
      }
      return res.status(response.status).json({
        error: `Blogger post returned ${response.status}: ${response.statusText}`,
      });
    }

    const data = await response.json();
    const entry = data.entry;
    if (!entry) {
      return res.status(404).json({ error: 'Post entry not found' });
    }

    const pubDate = entry.updated?.$t || entry.published?.$t;
    const lastModified = pubDate ? new Date(pubDate).toUTCString() : new Date().toUTCString();
    const jsonBody = JSON.stringify({ entry });
    const etag = computeETag(jsonBody);

    const newEntry = cacheStore.set(cacheKey, {
      body: jsonBody,
      contentType: 'application/json; charset=utf-8',
      etag,
      lastModified,
      ttlMs: TTL_MAGAZINE_ARTICLE_MS,
    });

    return sendCachedResponse(req, res, newEntry, 'MISS');
  } catch (error: any) {
    console.error('Error fetching post by ID:', error);
    if (cached) {
      return sendCachedResponse(req, res, cached, 'STALE-FALLBACK');
    }
    return res.status(500).json({ error: error.message || 'Internal post error' });
  }
});

// 3. Endpoint to fetch any single article or page by URL with multiple reliable strategies
app.get('/api/post-by-url', async (req, res) => {
  const rawUrl = req.query.url as string | undefined;
  if (!rawUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  const trimmed = rawUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed, 'https://magazine.5lb.eu');
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (host !== 'magazine.5lb.eu') {
    return res.status(400).json({ error: 'URL must belong to magazine.5lb.eu' });
  }

  const targetNorm = parsed.pathname.replace(/\/+$/, '').toLowerCase();
  const cacheKey = `post-by-url:${targetNorm}`;
  const cached = cacheStore.get(cacheKey);

  if (cached && cached.isFresh) {
    return sendCachedResponse(req, res, cached, 'HIT');
  }

  try {
    const isPage = targetNorm.startsWith('/p/');

    // 1. Monographic pages (/p/...)
    if (isPage) {
      const pageFeedUrl = 'https://magazine.5lb.eu/feeds/pages/default?alt=json&max-results=50';
      const pageRes = await fetch(pageFeedUrl, {
        headers: {
          'User-Agent': '5LB-Magazine-PWA/1.0 (+https://5lb.eu)',
          Accept: 'application/json',
        },
      });
      if (pageRes.ok) {
        const pageData = await pageRes.json();
        const entries: any[] = Array.isArray(pageData.feed?.entry)
          ? pageData.feed.entry
          : pageData.feed?.entry
          ? [pageData.feed.entry]
          : [];
        const matched = entries.find((e) => {
          const link = e.link?.find((l: any) => l.rel === 'alternate')?.href;
          if (!link) return false;
          try {
            return new URL(link, 'https://magazine.5lb.eu').pathname.replace(/\/+$/, '').toLowerCase() === targetNorm;
          } catch {
            return false;
          }
        });
        if (matched) {
          const pubDate = matched.updated?.$t || matched.published?.$t;
          const lastModified = pubDate ? new Date(pubDate).toUTCString() : new Date().toUTCString();
          const jsonBody = JSON.stringify({ entry: matched });
          const etag = computeETag(jsonBody);
          const newEntry = cacheStore.set(cacheKey, {
            body: jsonBody,
            contentType: 'application/json; charset=utf-8',
            etag,
            lastModified,
            ttlMs: TTL_MAGAZINE_PAGES_MS,
          });
          return sendCachedResponse(req, res, newEntry, 'MISS');
        }
      }
    }

    // 2. Regular posts - Strategy A: Fetch HTML to extract Blogger postId
    const canonicalArticleUrl = `https://magazine.5lb.eu${parsed.pathname}`;
    let html = '';
    try {
      const pageRes = await fetch(canonicalArticleUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      if (pageRes.ok) {
        html = await pageRes.text();
      }
    } catch (e) {
      console.warn('Could not fetch HTML directly:', e);
    }

    if (html) {
      // Look for postId in script/data attributes
      const postIdMatch =
        html.match(/'postId':\s*'([0-9]+)'/) ||
        html.match(/post-body-([0-9]+)/) ||
        html.match(/data-post-id="([0-9]+)"/) ||
        html.match(/blogId=[0-9]+&postId=([0-9]+)/) ||
        html.match(/blogID=[0-9]+&postID=([0-9]+)/i);

      if (postIdMatch && postIdMatch[1]) {
        const postId = postIdMatch[1];
        const postFeedUrl = `https://magazine.5lb.eu/feeds/posts/default/${postId}?alt=json`;
        try {
          const entryRes = await fetch(postFeedUrl, {
            headers: {
              'User-Agent': '5LB-Magazine-PWA/1.0 (+https://5lb.eu)',
              Accept: 'application/json',
            },
          });
          if (entryRes.ok) {
            const entryData = await entryRes.json();
            if (entryData?.entry) {
              const pubDate = entryData.entry.updated?.$t || entryData.entry.published?.$t;
              const lastModified = pubDate ? new Date(pubDate).toUTCString() : new Date().toUTCString();
              const jsonBody = JSON.stringify({ entry: entryData.entry });
              const etag = computeETag(jsonBody);
              const newEntry = cacheStore.set(cacheKey, {
                body: jsonBody,
                contentType: 'application/json; charset=utf-8',
                etag,
                lastModified,
                ttlMs: TTL_MAGAZINE_ARTICLE_MS,
              });
              return sendCachedResponse(req, res, newEntry, 'MISS');
            }
          }
        } catch (e) {
          console.warn('Error fetching feed by postId:', e);
        }
      }
    }

    // 3. Strategy B: Query by publication month if URL has /YYYY/MM/
    const dateMatch = targetNorm.match(/^\/([12][0-9]{3})\/([01][0-9])\//);
    if (dateMatch) {
      const year = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10);
      const startIso = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
      const endIso = new Date(
        Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1, 0, 0, 0)
      ).toISOString();

      const monthFeedUrl = `https://magazine.5lb.eu/feeds/posts/default?alt=json&published-min=${encodeURIComponent(
        startIso
      )}&published-max=${encodeURIComponent(endIso)}&max-results=100`;
      try {
        const monthRes = await fetch(monthFeedUrl, {
          headers: {
            'User-Agent': '5LB-Magazine-PWA/1.0 (+https://5lb.eu)',
            Accept: 'application/json',
          },
        });
        if (monthRes.ok) {
          const monthData = await monthRes.json();
          const entries: any[] = Array.isArray(monthData.feed?.entry)
            ? monthData.feed.entry
            : monthData.feed?.entry
            ? [monthData.feed.entry]
            : [];
          const matched = entries.find((e) => {
            const link = e.link?.find((l: any) => l.rel === 'alternate')?.href;
            if (!link) return false;
            try {
              return (
                new URL(link, 'https://magazine.5lb.eu').pathname.replace(/\/+$/, '').toLowerCase() ===
                targetNorm
              );
            } catch {
              return false;
            }
          });
          if (matched) {
            const pubDate = matched.updated?.$t || matched.published?.$t;
            const lastModified = pubDate ? new Date(pubDate).toUTCString() : new Date().toUTCString();
            const jsonBody = JSON.stringify({ entry: matched });
            const etag = computeETag(jsonBody);
            const newEntry = cacheStore.set(cacheKey, {
              body: jsonBody,
              contentType: 'application/json; charset=utf-8',
              etag,
              lastModified,
              ttlMs: TTL_MAGAZINE_ARTICLE_MS,
            });
            return sendCachedResponse(req, res, newEntry, 'MISS');
          }
        }
      } catch (e) {
        console.warn('Error fetching month feed:', e);
      }
    }

    // 4. Strategy C: Construct entry from fetched HTML if available
    if (html) {
      const titleMatch =
        html.match(/<h3 class=['"][^'"]*post-title[^'"]*['"][^>]*>([\s\S]*?)<\/h3>/i) ||
        html.match(/<h1 class=['"][^'"]*post-title[^'"]*['"][^>]*>([\s\S]*?)<\/h1>/i) ||
        html.match(/<title>([^<]+)<\/title>/i);
      const title = titleMatch
        ? titleMatch[1]
            .replace(/<[^>]+>/g, '')
            .replace(/[\r\n\t]+/g, ' ')
            .replace(/\s*-\s*5LB Magazine\s*$/i, '')
            .trim()
        : '';

      const contentMatch =
        html.match(/<div class=['"][^'"]*post-body[^'"]*['"][^>]*>([\s\S]*?)<\/div>\s*<div class=['"][^'"]*post-footer/i) ||
        html.match(/<div class=['"][^'"]*post-body[^'"]*['"][^>]*>([\s\S]*?)<\/div>/i);
      const contentHtml = contentMatch ? contentMatch[1] : '';

      const dateMatchHtml =
        html.match(/class=['"][^'"]*published[^'"]*['"]\s+title=['"]([^'"]+)['"]/i) ||
        html.match(/<abbr class=['"][^'"]*published[^'"]*['"][^>]*title=['"]([^'"]+)['"]/i) ||
        html.match(/itemprop=['"]datePublished['"]\s+content=['"]([^'"]+)['"]/i);
      const published = dateMatchHtml
        ? dateMatchHtml[1]
        : dateMatch
        ? `${dateMatch[1]}-${dateMatch[2]}-01T12:00:00Z`
        : new Date().toISOString();

      if (title && contentHtml) {
        const syntheticEntry = {
          id: { $t: `synthetic-${canonicalArticleUrl}` },
          title: { $t: title },
          published: { $t: published },
          updated: { $t: published },
          content: { $t: contentHtml },
          link: [{ rel: 'alternate', type: 'text/html', href: canonicalArticleUrl }],
          author: [{ name: { $t: '5LB Magazine' } }],
          category: [],
        };
        const lastModified = new Date(published).toUTCString();
        const jsonBody = JSON.stringify({ entry: syntheticEntry });
        const etag = computeETag(jsonBody);
        const newEntry = cacheStore.set(cacheKey, {
          body: jsonBody,
          contentType: 'application/json; charset=utf-8',
          etag,
          lastModified,
          ttlMs: TTL_MAGAZINE_ARTICLE_MS,
        });
        return sendCachedResponse(req, res, newEntry, 'MISS');
      }
    }

    if (cached) {
      return sendCachedResponse(req, res, cached, 'STALE-FALLBACK');
    }

    return res.status(404).json({ error: 'Articolo non trovato su magazine.5lb.eu' });
  } catch (error: any) {
    console.error('Error in /api/post-by-url:', error);
    if (cached) {
      return sendCachedResponse(req, res, cached, 'STALE-FALLBACK');
    }
    return res.status(500).json({ error: error.message || 'Internal feed error' });
  }
});

// 4. Check for updates endpoint (used by Periodic Sync & background polling with conditional If-Modified-Since)
app.get('/api/check-updates', async (req, res) => {
  const cacheKey = 'check-updates';
  const cached = cacheStore.get(cacheKey);

  if (cached && cached.isFresh) {
    return sendCachedResponse(req, res, cached, 'HIT');
  }

  try {
    const fetchHeaders: Record<string, string> = {
      'User-Agent': '5LB-Magazine-PWA/1.0 (+https://5lb.eu)',
      Accept: 'application/json',
    };
    if (cached?.lastModified) {
      fetchHeaders['If-Modified-Since'] = cached.lastModified;
    }

    const targetUrl = 'https://magazine.5lb.eu/feeds/posts/default?alt=json&max-results=5';
    const response = await fetch(targetUrl, { headers: fetchHeaders });

    if (response.status === 304 && cached) {
      cacheStore.renew(cacheKey, TTL_MAGAZINE_UPDATES_MS);
      return sendCachedResponse(req, res, cached, 'HIT-REVALIDATED');
    }

    if (!response.ok) {
      if (cached) {
        return sendCachedResponse(req, res, cached, 'STALE-FALLBACK');
      }
      return res.status(response.status).json({ error: 'Failed to fetch latest post' });
    }

    const data = await response.json();
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    const entries = (data.feed?.entry || []).filter((entry: any) => {
      const pubStr = entry.published?.$t;
      if (!pubStr) return true;
      const pubTime = new Date(pubStr).getTime();
      return isNaN(pubTime) || pubTime <= cutoff;
    });

    const entry = entries[0];
    if (!entry) {
      const emptyPayload = JSON.stringify({ hasNew: false });
      const newEntry = cacheStore.set(cacheKey, {
        body: emptyPayload,
        contentType: 'application/json; charset=utf-8',
        etag: computeETag(emptyPayload),
        ttlMs: TTL_MAGAZINE_UPDATES_MS,
      });
      return sendCachedResponse(req, res, newEntry, 'MISS');
    }

    const postDate = new Date(entry.updated?.$t || entry.published?.$t).getTime();
    let link = 'https://magazine.5lb.eu';
    if (Array.isArray(entry.link)) {
      const altLink = entry.link.find((l: any) => l.rel === 'alternate' && l.type === 'text/html');
      if (altLink && altLink.href) link = altLink.href;
    }

    const rawContent = entry.summary?.$t || entry.content?.$t || '';
    const summary = rawContent.replace(/<[^>]+>/g, ' ').slice(0, 150).trim();
    const lastModified = new Date(postDate).toUTCString();

    const resultPayload = JSON.stringify({
      hasNew: true,
      id: entry.id?.$t,
      title: entry.title?.$t,
      summary,
      link,
      published: entry.published?.$t,
      updated: entry.updated?.$t,
    });
    const etag = computeETag(resultPayload);

    const newEntry = cacheStore.set(cacheKey, {
      body: resultPayload,
      contentType: 'application/json; charset=utf-8',
      etag,
      lastModified,
      ttlMs: TTL_MAGAZINE_UPDATES_MS,
    });

    return sendCachedResponse(req, res, newEntry, 'MISS');
  } catch (error: any) {
    if (cached) {
      return sendCachedResponse(req, res, cached, 'STALE-FALLBACK');
    }
    return res.status(500).json({ error: error.message });
  }
});

// 5. Telegram in-app view proxy endpoint to bypass X-Frame-Options: SAMEORIGIN
app.get('/api/telegram-view', async (req, res) => {
  const cacheKey = 'telegram-view';
  const cached = cacheStore.get(cacheKey);

  if (cached && cached.isFresh) {
    res.removeHeader('X-Frame-Options');
    return sendCachedResponse(req, res, cached, 'HIT');
  }

  try {
    const response = await fetch('https://t.me/s/magazine5LB', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      if (cached) {
        res.removeHeader('X-Frame-Options');
        return sendCachedResponse(req, res, cached, 'STALE-FALLBACK');
      }
      return res.status(response.status).send('Errore nel caricamento del canale Telegram.');
    }

    let html = await response.text();

    // Inject <base href="https://t.me/"> and dark mode styles
    html = html.replace(
      '<head>',
      '<head><base href="https://t.me/"><style>body{background-color:#f8fafc;}@media(prefers-color-scheme:dark){body{background-color:#020617;}}</style>'
    );

    const etag = computeETag(html);
    const lastModified = response.headers.get('last-modified') || new Date().toUTCString();

    const newEntry = cacheStore.set(cacheKey, {
      body: html,
      contentType: 'text/html; charset=utf-8',
      etag,
      lastModified,
      ttlMs: TTL_TELEGRAM_MS,
    });

    res.removeHeader('X-Frame-Options');
    return sendCachedResponse(req, res, newEntry, 'MISS');
  } catch (error: any) {
    console.error('Error proxying Telegram:', error);
    if (cached) {
      res.removeHeader('X-Frame-Options');
      return sendCachedResponse(req, res, cached, 'STALE-FALLBACK');
    }
    return res.status(500).send('Impossibile caricare il canale Telegram al momento.');
  }
});

// 6. Accade Oggi RSS (Atom) proxy endpoint (Cloudflare Worker primary, local telegram.xml fallback)
app.get('/api/accade-oggi-feed', async (req, res) => {
  const cacheKey = 'accade-oggi-feed';
  const cached = cacheStore.get(cacheKey);
  const ttlMs = getAccadeOggiTTL();

  // Fresh cache hit: responds immediately
  if (cached && cached.isFresh) {
    return sendCachedResponse(req, res, cached, 'HIT');
  }

  // 1. Prova prima il Cloudflare Worker principale per avere sempre i post più recenti
  try {
    const fetchHeaders: Record<string, string> = {
      'User-Agent': '5LB-Magazine-PWA/1.0 (+https://5lb.eu)',
      Accept: 'application/atom+xml, application/xml, text/xml, */*',
    };
    if (cached?.lastModified) {
      fetchHeaders['If-Modified-Since'] = cached.lastModified;
    }
    if (cached?.etag) {
      fetchHeaders['If-None-Match'] = cached.etag;
    }

    const workerUrl = 'https://telegram-feed.5lb-framework.workers.dev/telegram.xml';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const workerRes = await fetch(workerUrl, {
      headers: fetchHeaders,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (workerRes.status === 304 && cached) {
      cacheStore.renew(cacheKey, ttlMs);
      return sendCachedResponse(req, res, cached, 'HIT-REVALIDATED');
    }

    if (workerRes.ok) {
      const xml = await workerRes.text();
      if (xml && xml.includes('<entry')) {
        const etag = workerRes.headers.get('etag') || computeETag(xml);
        const lastModified = workerRes.headers.get('last-modified') || new Date().toUTCString();

        const newEntry = cacheStore.set(cacheKey, {
          body: xml,
          contentType: 'application/atom+xml; charset=utf-8',
          etag,
          lastModified,
          ttlMs,
        });

        // Aggiorna anche il file locale public/telegram.xml in background per sincronizzazione offline
        try {
          const staticXmlPath = path.resolve(__dirname, 'public', 'telegram.xml');
          fs.writeFileSync(staticXmlPath, xml, 'utf-8');
        } catch {}

        return sendCachedResponse(req, res, newEntry, 'MISS');
      }
    }
  } catch (workerErr) {
    console.warn('Could not fetch telegram feed from Cloudflare Worker, trying fallback:', workerErr);
  }

  // 2. Fallback: file statico locale public/telegram.xml
  try {
    const staticXmlPath = path.resolve(__dirname, 'public', 'telegram.xml');
    if (fs.existsSync(staticXmlPath)) {
      const xmlContent = fs.readFileSync(staticXmlPath, 'utf-8');
      const stat = fs.statSync(staticXmlPath);
      const lastModified = stat.mtime.toUTCString();
      const etag = computeETag(xmlContent);

      if (cached && cached.etag === etag) {
        cacheStore.renew(cacheKey, ttlMs);
        return sendCachedResponse(req, res, cached, 'HIT-REVALIDATED');
      }

      const newEntry = cacheStore.set(cacheKey, {
        body: xmlContent,
        contentType: 'application/atom+xml; charset=utf-8',
        etag,
        lastModified,
        ttlMs,
      });

      return sendCachedResponse(req, res, newEntry, 'MISS');
    }
  } catch (fsErr) {
    console.warn('Could not read static telegram.xml:', fsErr);
  }

  // 3. If cached is present, return it as fallback
  if (cached) {
    return sendCachedResponse(req, res, cached, 'STALE-FALLBACK');
  }

  return res.status(404).json({ error: 'telegram.xml non trovato' });
});

// 7. Telegram Images persistent proxy endpoint (/img/:filename and /api/telegram-image/:filename)
const TTL_IMAGE_90_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
app.get(['/img/:filename', '/api/telegram-image/:filename'], async (req, res) => {
  const rawFilename = req.params.filename || '';
  const cleanFilename = rawFilename.replace(/[^A-Za-z0-9_.-]/g, '');

  if (!cleanFilename) {
    return res.status(400).send('Filename non valido');
  }

  const cacheKey = `img:${cleanFilename}`;
  const cached = cacheStore.get(cacheKey);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader(
    'Cache-Control',
    'public, max-age=7776000, s-maxage=7776000, stale-while-revalidate=86400, immutable'
  );

  const contentType = cleanFilename.endsWith('.png')
    ? 'image/png'
    : cleanFilename.endsWith('.webp')
    ? 'image/webp'
    : 'image/jpeg';

  if (cached && cached.isFresh) {
    res.setHeader('Content-Type', cached.contentType || contentType);
    res.setHeader('ETag', cached.etag);
    if (matchesConditionalHeaders(req, cached.etag)) {
      return res.status(304).end();
    }
    const buffer = Buffer.from(cached.body, 'base64');
    return res.status(200).send(buffer);
  }

  // 1. Prova prima dal Cloudflare Worker
  try {
    const workerImgUrl = `https://telegram-feed.5lb-framework.workers.dev/img/${cleanFilename}`;
    const workerRes = await fetch(workerImgUrl, {
      headers: {
        'User-Agent': '5LB-Magazine-PWA/1.0 (+https://5lb.eu)',
        Accept: 'image/*,*/*;q=0.8',
      },
    });

    if (workerRes.ok) {
      const arrayBuffer = await workerRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mime = workerRes.headers.get('content-type') || contentType;
      const etag = `"${cleanFilename}"`;

      cacheStore.set(cacheKey, {
        body: buffer.toString('base64'),
        contentType: mime,
        etag,
        ttlMs: TTL_IMAGE_90_DAYS_MS,
      });

      res.setHeader('Content-Type', mime);
      res.setHeader('ETag', etag);
      return res.status(200).send(buffer);
    }
  } catch (err) {
    console.warn(`Tentativo immagine da Worker per ${cleanFilename} fallito:`, err);
  }

  // 2. Fallback on-demand da Telegram CDN
  const candidateHosts = ['cdn4.telesco.pe', 'cdn1.telesco.pe'];
  for (const host of candidateHosts) {
    try {
      const cdnUrl = `https://${host}/file/${cleanFilename}`;
      const cdnRes = await fetch(cdnUrl, {
        headers: {
          'User-Agent': '5LB-Magazine-PWA/1.0 (+https://5lb.eu)',
          Accept: 'image/*,*/*;q=0.8',
        },
      });

      if (cdnRes.ok) {
        const arrayBuffer = await cdnRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mime = cdnRes.headers.get('content-type') || contentType;
        const etag = `"${cleanFilename}"`;

        cacheStore.set(cacheKey, {
          body: buffer.toString('base64'),
          contentType: mime,
          etag,
          ttlMs: TTL_IMAGE_90_DAYS_MS,
        });

        res.setHeader('Content-Type', mime);
        res.setHeader('ETag', etag);
        return res.status(200).send(buffer);
      }
    } catch {
      // Prova host successivo
    }
  }

  if (cached) {
    const buffer = Buffer.from(cached.body, 'base64');
    res.setHeader('Content-Type', cached.contentType || contentType);
    return res.status(200).send(buffer);
  }

  return res.status(404).send('Immagine non trovata');
});

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================
async function startServer() {
  if (!isProduction) {
    // Development mode: Vite dev server middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve dist files
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 5LB Magazine PWA server running at http://0.0.0.0:${PORT}`);
  });
}

export { app };

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
