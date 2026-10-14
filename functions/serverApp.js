// server.ts
import express from "express";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
var isProduction = process.env.NODE_ENV === "production";
app.use(express.json());
var TTL_MAGAZINE_ARTICLE_MS = 24 * 60 * 60 * 1e3;
var TTL_MAGAZINE_PAGES_MS = 24 * 60 * 60 * 1e3;
var TTL_MAGAZINE_ARCHIVE_MS = 12 * 60 * 60 * 1e3;
var TTL_MAGAZINE_FEED_MS = 4 * 60 * 60 * 1e3;
var TTL_MAGAZINE_UPDATES_MS = 30 * 60 * 1e3;
var TTL_TELEGRAM_MS = 5 * 60 * 1e3;
function getAccadeOggiTTL() {
  try {
    const romeHourStr = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Rome",
      hour: "numeric",
      hourCycle: "h23"
    }).format(/* @__PURE__ */ new Date());
    const hour = parseInt(romeHourStr, 10);
    if (hour >= 7 && hour < 14) {
      return 25 * 60 * 1e3;
    }
  } catch {
  }
  return 60 * 60 * 1e3;
}
var ProxyCacheStore = class {
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
    this.maxItems = 1e3;
    this.cacheDir = path.resolve(__dirname, ".cache");
    this.cacheFile = path.resolve(__dirname, ".cache", "rss-proxy-cache.json");
    this.saveTimer = null;
    this.loadFromDisk();
    setInterval(() => this.prune(), 15 * 60 * 1e3).unref();
  }
  loadFromDisk() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const raw = fs.readFileSync(this.cacheFile, "utf-8");
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          const now = Date.now();
          for (const [key, entry] of data) {
            if (entry && entry.expiresAt > now - 7 * 24 * 60 * 60 * 1e3) {
              this.cache.set(key, entry);
            }
          }
          console.log(`\u{1F4E6} Cache preloaded with ${this.cache.size} entries from disk.`);
        }
      }
    } catch (err) {
      console.warn("\u26A0\uFE0F Could not load cache from disk:", err);
    }
  }
  saveToDisk() {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
      const data = Array.from(this.cache.entries()).slice(-500);
      fs.writeFileSync(this.cacheFile, JSON.stringify(data), "utf-8");
    } catch {
    }
  }
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return void 0;
    const isFresh = Date.now() < entry.expiresAt;
    return { ...entry, isFresh };
  }
  set(key, data) {
    const now = Date.now();
    const entry = {
      body: data.body,
      contentType: data.contentType,
      etag: data.etag,
      lastModified: data.lastModified,
      cachedAt: now,
      expiresAt: now + data.ttlMs,
      ttlMs: data.ttlMs
    };
    if (this.cache.size >= this.maxItems) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, entry);
    this.scheduleSave();
    return entry;
  }
  renew(key, ttlMs) {
    const entry = this.cache.get(key);
    if (entry) {
      entry.cachedAt = Date.now();
      entry.expiresAt = Date.now() + ttlMs;
      entry.ttlMs = ttlMs;
      this.cache.set(key, entry);
    }
  }
  has(key) {
    return this.cache.has(key);
  }
  scheduleSave() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveToDisk();
    }, 5e3);
  }
  prune() {
    const now = Date.now();
    for (const [k, v] of this.cache.entries()) {
      if (now > v.expiresAt + 24 * 60 * 60 * 1e3) {
        this.cache.delete(k);
      }
    }
  }
};
var cacheStore = new ProxyCacheStore();
function computeETag(body) {
  const hash = crypto.createHash("md5").update(body).digest("hex");
  return `"${hash}"`;
}
function matchesConditionalHeaders(req, etag, lastModified) {
  const ifNoneMatch = req.headers["if-none-match"];
  if (ifNoneMatch && etag) {
    const rawEtag = etag.replace(/^W\//, "").replace(/"/g, "");
    const clientEtags = ifNoneMatch.split(",").map((t) => t.trim().replace(/^W\//, "").replace(/"/g, ""));
    if (clientEtags.includes("*") || clientEtags.includes(rawEtag)) {
      return true;
    }
  }
  const ifModifiedSince = req.headers["if-modified-since"];
  if (ifModifiedSince && lastModified) {
    const clientTime = Date.parse(ifModifiedSince);
    const serverTime = Date.parse(lastModified);
    if (!isNaN(clientTime) && !isNaN(serverTime) && serverTime <= clientTime) {
      return true;
    }
  }
  return false;
}
function sendCachedResponse(req, res, entry, cacheStatus) {
  const ttlSec = Math.max(60, Math.floor(entry.ttlMs / 1e3));
  const swrSec = ttlSec * 2;
  res.setHeader("ETag", entry.etag);
  if (entry.lastModified) {
    res.setHeader("Last-Modified", entry.lastModified);
  }
  res.setHeader("Cache-Control", `public, max-age=${ttlSec}, stale-while-revalidate=${swrSec}`);
  res.setHeader("X-Cache", cacheStatus);
  if (matchesConditionalHeaders(req, entry.etag, entry.lastModified)) {
    return res.status(304).end();
  }
  res.setHeader("Content-Type", entry.contentType);
  return res.status(200).send(entry.body);
}
app.get("/api/feed", async (req, res) => {
  const maxResults = req.query["max-results"] || "15";
  const startIndex = req.query["start-index"] || "1";
  const category = req.query["category"];
  const q = req.query["q"];
  const publishedMin = req.query["published-min"];
  const publishedMax = req.query["published-max"];
  const feedType = req.query["type"];
  const isPages = feedType === "pages";
  const isDefaultFeed = !isPages && !category && !q && !publishedMin && !publishedMax && startIndex === "1";
  let ttlMs = TTL_MAGAZINE_ARCHIVE_MS;
  if (isPages) {
    ttlMs = TTL_MAGAZINE_PAGES_MS;
  } else if (isDefaultFeed) {
    ttlMs = TTL_MAGAZINE_FEED_MS;
  }
  const cacheKey = `feed:${isPages ? "pages" : "posts"}:${category || ""}:${q || ""}:${startIndex}:${maxResults}:${publishedMin || ""}:${publishedMax || ""}`;
  const cached = cacheStore.get(cacheKey);
  if (cached && cached.isFresh) {
    return sendCachedResponse(req, res, cached, "HIT");
  }
  try {
    let targetUrl = isPages ? `https://magazine.5lb.eu/feeds/pages/default?alt=json&max-results=${maxResults}` : `https://magazine.5lb.eu/feeds/posts/default?alt=json&max-results=${maxResults}&start-index=${startIndex}`;
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
    const fetchHeaders = {
      "User-Agent": "5LB-Magazine-PWA/1.0 (+https://5lb.eu)",
      Accept: "application/json"
    };
    if (cached?.lastModified) {
      fetchHeaders["If-Modified-Since"] = cached.lastModified;
    }
    if (cached?.etag) {
      fetchHeaders["If-None-Match"] = cached.etag;
    }
    const response = await fetch(targetUrl, { headers: fetchHeaders });
    if (response.status === 304 && cached) {
      cacheStore.renew(cacheKey, ttlMs);
      return sendCachedResponse(req, res, cached, "HIT-REVALIDATED");
    }
    if (!response.ok) {
      if (cached) {
        return sendCachedResponse(req, res, cached, "STALE-FALLBACK");
      }
      return res.status(response.status).json({
        error: `Blogger feed returned ${response.status}: ${response.statusText}`
      });
    }
    const data = await response.json();
    const cutoff = Date.now() - 2 * 60 * 60 * 1e3;
    if (Array.isArray(data.feed?.entry)) {
      data.feed.entry = data.feed.entry.filter((entry) => {
        const pubStr = entry.published?.$t;
        if (!pubStr) return true;
        const pubTime = new Date(pubStr).getTime();
        return isNaN(pubTime) || pubTime <= cutoff;
      });
    }
    const newestPostDate = data.feed?.entry?.[0]?.updated?.$t || data.feed?.entry?.[0]?.published?.$t || data.feed?.updated?.$t;
    const lastModified = newestPostDate ? new Date(newestPostDate).toUTCString() : (/* @__PURE__ */ new Date()).toUTCString();
    const jsonBody = JSON.stringify(data);
    const etag = computeETag(jsonBody);
    const newEntry = cacheStore.set(cacheKey, {
      body: jsonBody,
      contentType: "application/json; charset=utf-8",
      etag,
      lastModified,
      ttlMs
    });
    return sendCachedResponse(req, res, newEntry, "MISS");
  } catch (error) {
    console.error("Error fetching Blogger feed:", error);
    if (cached) {
      return sendCachedResponse(req, res, cached, "STALE-FALLBACK");
    }
    return res.status(500).json({ error: error.message || "Internal feed error" });
  }
});
app.get("/api/post", async (req, res) => {
  const postId = req.query.id?.trim();
  if (!postId) {
    return res.status(400).json({ error: "Missing id parameter" });
  }
  const cacheKey = `post-id:${postId}`;
  const cached = cacheStore.get(cacheKey);
  if (cached && cached.isFresh) {
    return sendCachedResponse(req, res, cached, "HIT");
  }
  try {
    const targetUrl = `https://magazine.5lb.eu/feeds/posts/default/${encodeURIComponent(postId)}?alt=json`;
    const fetchHeaders = {
      "User-Agent": "5LB-Magazine-PWA/1.0 (+https://5lb.eu)",
      Accept: "application/json"
    };
    if (cached?.lastModified) {
      fetchHeaders["If-Modified-Since"] = cached.lastModified;
    }
    if (cached?.etag) {
      fetchHeaders["If-None-Match"] = cached.etag;
    }
    const response = await fetch(targetUrl, { headers: fetchHeaders });
    if (response.status === 304 && cached) {
      cacheStore.renew(cacheKey, TTL_MAGAZINE_ARTICLE_MS);
      return sendCachedResponse(req, res, cached, "HIT-REVALIDATED");
    }
    if (!response.ok) {
      if (cached) {
        return sendCachedResponse(req, res, cached, "STALE-FALLBACK");
      }
      return res.status(response.status).json({
        error: `Blogger post returned ${response.status}: ${response.statusText}`
      });
    }
    const data = await response.json();
    const entry = data.entry;
    if (!entry) {
      return res.status(404).json({ error: "Post entry not found" });
    }
    const pubDate = entry.updated?.$t || entry.published?.$t;
    const lastModified = pubDate ? new Date(pubDate).toUTCString() : (/* @__PURE__ */ new Date()).toUTCString();
    const jsonBody = JSON.stringify({ entry });
    const etag = computeETag(jsonBody);
    const newEntry = cacheStore.set(cacheKey, {
      body: jsonBody,
      contentType: "application/json; charset=utf-8",
      etag,
      lastModified,
      ttlMs: TTL_MAGAZINE_ARTICLE_MS
    });
    return sendCachedResponse(req, res, newEntry, "MISS");
  } catch (error) {
    console.error("Error fetching post by ID:", error);
    if (cached) {
      return sendCachedResponse(req, res, cached, "STALE-FALLBACK");
    }
    return res.status(500).json({ error: error.message || "Internal post error" });
  }
});
app.get("/api/post-by-url", async (req, res) => {
  const rawUrl = req.query.url;
  if (!rawUrl) {
    return res.status(400).json({ error: "Missing url parameter" });
  }
  const trimmed = rawUrl.trim();
  let parsed;
  try {
    parsed = new URL(trimmed, "https://magazine.5lb.eu");
  } catch {
    return res.status(400).json({ error: "Invalid URL format" });
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "magazine.5lb.eu") {
    return res.status(400).json({ error: "URL must belong to magazine.5lb.eu" });
  }
  const targetNorm = parsed.pathname.replace(/\/+$/, "").toLowerCase();
  const cacheKey = `post-by-url:${targetNorm}`;
  const cached = cacheStore.get(cacheKey);
  if (cached && cached.isFresh) {
    return sendCachedResponse(req, res, cached, "HIT");
  }
  try {
    const isPage = targetNorm.startsWith("/p/");
    if (isPage) {
      const pageFeedUrl = "https://magazine.5lb.eu/feeds/pages/default?alt=json&max-results=50";
      const pageRes = await fetch(pageFeedUrl, {
        headers: {
          "User-Agent": "5LB-Magazine-PWA/1.0 (+https://5lb.eu)",
          Accept: "application/json"
        }
      });
      if (pageRes.ok) {
        const pageData = await pageRes.json();
        const entries = Array.isArray(pageData.feed?.entry) ? pageData.feed.entry : pageData.feed?.entry ? [pageData.feed.entry] : [];
        const matched = entries.find((e) => {
          const link = e.link?.find((l) => l.rel === "alternate")?.href;
          if (!link) return false;
          try {
            return new URL(link, "https://magazine.5lb.eu").pathname.replace(/\/+$/, "").toLowerCase() === targetNorm;
          } catch {
            return false;
          }
        });
        if (matched) {
          const pubDate = matched.updated?.$t || matched.published?.$t;
          const lastModified = pubDate ? new Date(pubDate).toUTCString() : (/* @__PURE__ */ new Date()).toUTCString();
          const jsonBody = JSON.stringify({ entry: matched });
          const etag = computeETag(jsonBody);
          const newEntry = cacheStore.set(cacheKey, {
            body: jsonBody,
            contentType: "application/json; charset=utf-8",
            etag,
            lastModified,
            ttlMs: TTL_MAGAZINE_PAGES_MS
          });
          return sendCachedResponse(req, res, newEntry, "MISS");
        }
      }
    }
    const canonicalArticleUrl = `https://magazine.5lb.eu${parsed.pathname}`;
    let html = "";
    try {
      const pageRes = await fetch(canonicalArticleUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      if (pageRes.ok) {
        html = await pageRes.text();
      }
    } catch (e) {
      console.warn("Could not fetch HTML directly:", e);
    }
    if (html) {
      const postIdMatch = html.match(/'postId':\s*'([0-9]+)'/) || html.match(/post-body-([0-9]+)/) || html.match(/data-post-id="([0-9]+)"/) || html.match(/blogId=[0-9]+&postId=([0-9]+)/) || html.match(/blogID=[0-9]+&postID=([0-9]+)/i);
      if (postIdMatch && postIdMatch[1]) {
        const postId = postIdMatch[1];
        const postFeedUrl = `https://magazine.5lb.eu/feeds/posts/default/${postId}?alt=json`;
        try {
          const entryRes = await fetch(postFeedUrl, {
            headers: {
              "User-Agent": "5LB-Magazine-PWA/1.0 (+https://5lb.eu)",
              Accept: "application/json"
            }
          });
          if (entryRes.ok) {
            const entryData = await entryRes.json();
            if (entryData?.entry) {
              const pubDate = entryData.entry.updated?.$t || entryData.entry.published?.$t;
              const lastModified = pubDate ? new Date(pubDate).toUTCString() : (/* @__PURE__ */ new Date()).toUTCString();
              const jsonBody = JSON.stringify({ entry: entryData.entry });
              const etag = computeETag(jsonBody);
              const newEntry = cacheStore.set(cacheKey, {
                body: jsonBody,
                contentType: "application/json; charset=utf-8",
                etag,
                lastModified,
                ttlMs: TTL_MAGAZINE_ARTICLE_MS
              });
              return sendCachedResponse(req, res, newEntry, "MISS");
            }
          }
        } catch (e) {
          console.warn("Error fetching feed by postId:", e);
        }
      }
    }
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
            "User-Agent": "5LB-Magazine-PWA/1.0 (+https://5lb.eu)",
            Accept: "application/json"
          }
        });
        if (monthRes.ok) {
          const monthData = await monthRes.json();
          const entries = Array.isArray(monthData.feed?.entry) ? monthData.feed.entry : monthData.feed?.entry ? [monthData.feed.entry] : [];
          const matched = entries.find((e) => {
            const link = e.link?.find((l) => l.rel === "alternate")?.href;
            if (!link) return false;
            try {
              return new URL(link, "https://magazine.5lb.eu").pathname.replace(/\/+$/, "").toLowerCase() === targetNorm;
            } catch {
              return false;
            }
          });
          if (matched) {
            const pubDate = matched.updated?.$t || matched.published?.$t;
            const lastModified = pubDate ? new Date(pubDate).toUTCString() : (/* @__PURE__ */ new Date()).toUTCString();
            const jsonBody = JSON.stringify({ entry: matched });
            const etag = computeETag(jsonBody);
            const newEntry = cacheStore.set(cacheKey, {
              body: jsonBody,
              contentType: "application/json; charset=utf-8",
              etag,
              lastModified,
              ttlMs: TTL_MAGAZINE_ARTICLE_MS
            });
            return sendCachedResponse(req, res, newEntry, "MISS");
          }
        }
      } catch (e) {
        console.warn("Error fetching month feed:", e);
      }
    }
    if (html) {
      const titleMatch = html.match(/<h3 class=['"][^'"]*post-title[^'"]*['"][^>]*>([\s\S]*?)<\/h3>/i) || html.match(/<h1 class=['"][^'"]*post-title[^'"]*['"][^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").replace(/[\r\n\t]+/g, " ").replace(/\s*-\s*5LB Magazine\s*$/i, "").trim() : "";
      const contentMatch = html.match(/<div class=['"][^'"]*post-body[^'"]*['"][^>]*>([\s\S]*?)<\/div>\s*<div class=['"][^'"]*post-footer/i) || html.match(/<div class=['"][^'"]*post-body[^'"]*['"][^>]*>([\s\S]*?)<\/div>/i);
      const contentHtml = contentMatch ? contentMatch[1] : "";
      const dateMatchHtml = html.match(/class=['"][^'"]*published[^'"]*['"]\s+title=['"]([^'"]+)['"]/i) || html.match(/<abbr class=['"][^'"]*published[^'"]*['"][^>]*title=['"]([^'"]+)['"]/i) || html.match(/itemprop=['"]datePublished['"]\s+content=['"]([^'"]+)['"]/i);
      const published = dateMatchHtml ? dateMatchHtml[1] : dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-01T12:00:00Z` : (/* @__PURE__ */ new Date()).toISOString();
      if (title && contentHtml) {
        const syntheticEntry = {
          id: { $t: `synthetic-${canonicalArticleUrl}` },
          title: { $t: title },
          published: { $t: published },
          updated: { $t: published },
          content: { $t: contentHtml },
          link: [{ rel: "alternate", type: "text/html", href: canonicalArticleUrl }],
          author: [{ name: { $t: "5LB Magazine" } }],
          category: []
        };
        const lastModified = new Date(published).toUTCString();
        const jsonBody = JSON.stringify({ entry: syntheticEntry });
        const etag = computeETag(jsonBody);
        const newEntry = cacheStore.set(cacheKey, {
          body: jsonBody,
          contentType: "application/json; charset=utf-8",
          etag,
          lastModified,
          ttlMs: TTL_MAGAZINE_ARTICLE_MS
        });
        return sendCachedResponse(req, res, newEntry, "MISS");
      }
    }
    if (cached) {
      return sendCachedResponse(req, res, cached, "STALE-FALLBACK");
    }
    return res.status(404).json({ error: "Articolo non trovato su magazine.5lb.eu" });
  } catch (error) {
    console.error("Error in /api/post-by-url:", error);
    if (cached) {
      return sendCachedResponse(req, res, cached, "STALE-FALLBACK");
    }
    return res.status(500).json({ error: error.message || "Internal feed error" });
  }
});
app.get("/api/check-updates", async (req, res) => {
  const cacheKey = "check-updates";
  const cached = cacheStore.get(cacheKey);
  if (cached && cached.isFresh) {
    return sendCachedResponse(req, res, cached, "HIT");
  }
  try {
    const fetchHeaders = {
      "User-Agent": "5LB-Magazine-PWA/1.0 (+https://5lb.eu)",
      Accept: "application/json"
    };
    if (cached?.lastModified) {
      fetchHeaders["If-Modified-Since"] = cached.lastModified;
    }
    const targetUrl = "https://magazine.5lb.eu/feeds/posts/default?alt=json&max-results=5";
    const response = await fetch(targetUrl, { headers: fetchHeaders });
    if (response.status === 304 && cached) {
      cacheStore.renew(cacheKey, TTL_MAGAZINE_UPDATES_MS);
      return sendCachedResponse(req, res, cached, "HIT-REVALIDATED");
    }
    if (!response.ok) {
      if (cached) {
        return sendCachedResponse(req, res, cached, "STALE-FALLBACK");
      }
      return res.status(response.status).json({ error: "Failed to fetch latest post" });
    }
    const data = await response.json();
    const cutoff = Date.now() - 2 * 60 * 60 * 1e3;
    const entries = (data.feed?.entry || []).filter((entry2) => {
      const pubStr = entry2.published?.$t;
      if (!pubStr) return true;
      const pubTime = new Date(pubStr).getTime();
      return isNaN(pubTime) || pubTime <= cutoff;
    });
    const entry = entries[0];
    if (!entry) {
      const emptyPayload = JSON.stringify({ hasNew: false });
      const newEntry2 = cacheStore.set(cacheKey, {
        body: emptyPayload,
        contentType: "application/json; charset=utf-8",
        etag: computeETag(emptyPayload),
        ttlMs: TTL_MAGAZINE_UPDATES_MS
      });
      return sendCachedResponse(req, res, newEntry2, "MISS");
    }
    const postDate = new Date(entry.updated?.$t || entry.published?.$t).getTime();
    let link = "https://magazine.5lb.eu";
    if (Array.isArray(entry.link)) {
      const altLink = entry.link.find((l) => l.rel === "alternate" && l.type === "text/html");
      if (altLink && altLink.href) link = altLink.href;
    }
    const rawContent = entry.summary?.$t || entry.content?.$t || "";
    const summary = rawContent.replace(/<[^>]+>/g, " ").slice(0, 150).trim();
    const lastModified = new Date(postDate).toUTCString();
    const resultPayload = JSON.stringify({
      hasNew: true,
      id: entry.id?.$t,
      title: entry.title?.$t,
      summary,
      link,
      published: entry.published?.$t,
      updated: entry.updated?.$t
    });
    const etag = computeETag(resultPayload);
    const newEntry = cacheStore.set(cacheKey, {
      body: resultPayload,
      contentType: "application/json; charset=utf-8",
      etag,
      lastModified,
      ttlMs: TTL_MAGAZINE_UPDATES_MS
    });
    return sendCachedResponse(req, res, newEntry, "MISS");
  } catch (error) {
    if (cached) {
      return sendCachedResponse(req, res, cached, "STALE-FALLBACK");
    }
    return res.status(500).json({ error: error.message });
  }
});
app.get("/api/telegram-view", async (req, res) => {
  const cacheKey = "telegram-view";
  const cached = cacheStore.get(cacheKey);
  if (cached && cached.isFresh) {
    res.removeHeader("X-Frame-Options");
    return sendCachedResponse(req, res, cached, "HIT");
  }
  try {
    const response = await fetch("https://t.me/s/magazine5LB", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
    if (!response.ok) {
      if (cached) {
        res.removeHeader("X-Frame-Options");
        return sendCachedResponse(req, res, cached, "STALE-FALLBACK");
      }
      return res.status(response.status).send("Errore nel caricamento del canale Telegram.");
    }
    let html = await response.text();
    html = html.replace(
      "<head>",
      '<head><base href="https://t.me/"><style>body{background-color:#f8fafc;}@media(prefers-color-scheme:dark){body{background-color:#020617;}}</style>'
    );
    const etag = computeETag(html);
    const lastModified = response.headers.get("last-modified") || (/* @__PURE__ */ new Date()).toUTCString();
    const newEntry = cacheStore.set(cacheKey, {
      body: html,
      contentType: "text/html; charset=utf-8",
      etag,
      lastModified,
      ttlMs: TTL_TELEGRAM_MS
    });
    res.removeHeader("X-Frame-Options");
    return sendCachedResponse(req, res, newEntry, "MISS");
  } catch (error) {
    console.error("Error proxying Telegram:", error);
    if (cached) {
      res.removeHeader("X-Frame-Options");
      return sendCachedResponse(req, res, cached, "STALE-FALLBACK");
    }
    return res.status(500).send("Impossibile caricare il canale Telegram al momento.");
  }
});
var ACCADE_OGGI_PRIMARY = "https://rss-bridge.org/bridge01/?action=display&username=magazine5LB&bridge=TelegramBridge&format=Atom";
var ACCADE_OGGI_FALLBACK = "https://rss-bridge.ggc-project.de/?action=display&username=magazine5LB&bridge=TelegramBridge&format=Atom";
app.get("/api/accade-oggi-feed", async (req, res) => {
  const cacheKey = "accade-oggi-feed";
  const cached = cacheStore.get(cacheKey);
  const ttlMs = getAccadeOggiTTL();
  if (cached && cached.isFresh) {
    return sendCachedResponse(req, res, cached, "HIT");
  }
  const fetchWithTimeout = async (url) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8e3);
    try {
      const headers = {
        "User-Agent": "5LB-Magazine-PWA/1.0 (+https://5lb.eu)",
        Accept: "application/atom+xml, application/xml, text/xml, */*"
      };
      if (cached?.lastModified) {
        headers["If-Modified-Since"] = cached.lastModified;
      }
      if (cached?.etag) {
        headers["If-None-Match"] = cached.etag;
      }
      const resp = await fetch(url, {
        signal: controller.signal,
        headers
      });
      clearTimeout(timer);
      return resp;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };
  try {
    let resp = null;
    try {
      resp = await fetchWithTimeout(ACCADE_OGGI_PRIMARY);
    } catch (errPrimary) {
      console.warn("Primary rss-bridge failed, trying fallback rss-bridge:", errPrimary);
      try {
        resp = await fetchWithTimeout(ACCADE_OGGI_FALLBACK);
      } catch (errFallback) {
        console.warn("Fallback rss-bridge failed:", errFallback);
      }
    }
    if (resp && resp.status === 304 && cached) {
      cacheStore.renew(cacheKey, ttlMs);
      return sendCachedResponse(req, res, cached, "HIT-REVALIDATED");
    }
    if (resp && resp.ok) {
      const xmlContent = await resp.text();
      const lastModified = resp.headers.get("last-modified") || (/* @__PURE__ */ new Date()).toUTCString();
      const etag = computeETag(xmlContent);
      const newEntry = cacheStore.set(cacheKey, {
        body: xmlContent,
        contentType: "application/atom+xml; charset=utf-8",
        etag,
        lastModified,
        ttlMs
      });
      return sendCachedResponse(req, res, newEntry, "MISS");
    }
    if (cached) {
      console.warn("Upstream rss-bridge unavailable, serving stale cached Accade Oggi feed");
      return sendCachedResponse(req, res, cached, "STALE-FALLBACK");
    }
    return res.status(502).json({ error: "Unable to retrieve Accade Oggi feed from rss-bridge" });
  } catch (error) {
    console.error("Error fetching Accade Oggi Atom feed:", error);
    if (cached) {
      return sendCachedResponse(req, res, cached, "STALE-FALLBACK");
    }
    return res.status(502).json({ error: error.message || "Unable to retrieve Accade Oggi feed" });
  }
});
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u{1F680} 5LB Magazine PWA server running at http://0.0.0.0:${PORT}`);
  });
}
if (!process.env.FUNCTION_TARGET && !process.env.K_SERVICE && !process.env.FIREBASE_CONFIG) {
  startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}
export {
  app
};
