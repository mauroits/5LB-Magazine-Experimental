var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
var BRIDGES = [
  "https://rss-bridge.org/bridge01/?action=display&bridge=TelegramBridge&username=magazine5LB&format=Atom",
  "https://rss-bridge.ggc-project.de/?action=display&bridge=TelegramBridge&username=magazine5LB&format=Atom"
];
var ALLOWED_ORIGINS = ["https://app.5lb.eu", "https://mauroits.github.io"];
var KV_KEY = "telegram_feed";
var KV_IMG_PREFIX = "img_";
var USER_AGENT = "5LB-Magazine-Worker/1.0 (+https://5lb.eu; contact: info@5lb.eu)";
var FETCH_TIMEOUT_MS = 1e4;
var IMG_FETCH_TIMEOUT_MS = 8000;
var CACHE_MAX_AGE = 1800;
var IMAGE_MAX_AGE_SEC = 90 * 24 * 60 * 60; // 90 giorni (3 mesi)
var WORKER_PUBLIC_ORIGIN = "https://telegram-feed.5lb-framework.workers.dev";

function withCacheBust(bridgeUrl) {
  const sep = bridgeUrl.includes("?") ? "&" : "?";
  return bridgeUrl + sep + "_=" + Date.now();
}
__name(withCacheBust, "withCacheBust");

function extractFeedUpdated(xml) {
  if (!xml) return null;
  const start = xml.indexOf("<updated>");
  if (start === -1) return null;
  const s = start + "<updated>".length;
  const end = xml.indexOf("</updated>", s);
  if (end === -1) return null;
  return xml.slice(s, end);
}
__name(extractFeedUpdated, "extractFeedUpdated");

/**
 * Pre-scarica le immagini Telegram (cdn*.telesco.pe) fresche dal feed
 * e le archivia in KV con scadenza a 90 giorni (3 mesi).
 */
async function preFetchAndStoreImages(env, xmlText) {
  if (!env || !env.TELEGRAM_KV || !xmlText) return;
  const regex = /https?:\/\/cdn\d*\.telesco\.pe\/file\/([A-Za-z0-9_-]+\.[a-zA-Z0-9]+)/gi;
  const urls = new Map();
  let match;
  while ((match = regex.exec(xmlText)) !== null) {
    const fullUrl = match[0];
    const filename = match[1];
    if (!urls.has(filename)) {
      urls.set(filename, fullUrl);
    }
  }

  const tasks = Array.from(urls.entries()).map(async ([filename, fullUrl]) => {
    const kvKey = KV_IMG_PREFIX + filename;
    try {
      const existing = await env.TELEGRAM_KV.get(kvKey, { type: "stream" });
      if (existing) return;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), IMG_FETCH_TIMEOUT_MS);
      const res = await fetch(fullUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "image/*,*/*;q=0.8"
        }
      });
      clearTimeout(timer);

      if (res.ok) {
        const contentType = res.headers.get("content-type") || (filename.endsWith(".png") ? "image/png" : "image/jpeg");
        const arrayBuffer = await res.arrayBuffer();
        await env.TELEGRAM_KV.put(kvKey, arrayBuffer, {
          expirationTtl: IMAGE_MAX_AGE_SEC,
          metadata: {
            contentType,
            size: arrayBuffer.byteLength,
            savedAt: new Date().toISOString()
          }
        });
      }
    } catch (err) {
      console.warn("Pre-scaricamento immagine non riuscito per " + filename + ":", err.message || err);
    }
  });

  await Promise.allSettled(tasks);
}
__name(preFetchAndStoreImages, "preFetchAndStoreImages");

/**
 * Riscrive tutti gli URL effimeri di telesco.pe nell'XML
 * puntandoli all'endpoint del Worker /img/:filename
 */
function rewriteTelegramImageUrls(xmlText, workerOrigin = WORKER_PUBLIC_ORIGIN) {
  if (!xmlText) return "";
  const cleanOrigin = workerOrigin.replace(/\/+$/, "");
  return xmlText.replace(
    /https?:\/\/cdn\d*\.telesco\.pe\/file\/([A-Za-z0-9_-]+\.[a-zA-Z0-9]+)/gi,
    cleanOrigin + "/img/$1"
  );
}
__name(rewriteTelegramImageUrls, "rewriteTelegramImageUrls");

async function updateFeedFromBridges(env, workerOrigin = WORKER_PUBLIC_ORIGIN) {
  if (!env || !env.TELEGRAM_KV) {
    console.error("Binding KV non configurato.");
    return null;
  }
  const existing = await readFeedFromKV(env);
  const existingUpdated = existing && existing.xml ? extractFeedUpdated(existing.xml) : null;
  for (const bridgeUrl of BRIDGES) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const response = await fetch(withCacheBust(bridgeUrl), {
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT, Accept: "application/atom+xml, application/xml, text/xml, */*", "Cache-Control": "no-cache" }
      });
      clearTimeout(timer);
      if (response.ok) {
        const text = await response.text();
        if (text && text.includes("<entry")) {
          const newUpdated = extractFeedUpdated(text);
          if (existingUpdated && newUpdated && new Date(newUpdated) < new Date(existingUpdated)) {
            console.warn("Feed piu vecchio di quello in KV, salto: " + bridgeUrl);
            continue;
          }

          // 1. Pre-scarica le immagini Telegram fresche in KV
          await preFetchAndStoreImages(env, text);

          // 2. Riscrive gli URL nell'XML rendendoli permanenti
          const rewrittenText = rewriteTelegramImageUrls(text, workerOrigin);

          const downloadedAt = (/* @__PURE__ */ new Date()).toISOString();
          const record = { xml: rewrittenText, downloadedAt };
          await env.TELEGRAM_KV.put(KV_KEY, JSON.stringify(record), { metadata: { downloadedAt } });
          return record;
        }
      }
    } catch (err) {
      console.warn("Tentativo non riuscito con " + bridgeUrl + ":", err.message || err);
    }
  }
  return null;
}
__name(updateFeedFromBridges, "updateFeedFromBridges");

async function readFeedFromKV(env) {
  if (!env || !env.TELEGRAM_KV) return null;
  try {
    const raw = await env.TELEGRAM_KV.get(KV_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.xml) return { xml: parsed.xml, downloadedAt: parsed.downloadedAt || null };
    } catch {
    }
    return { xml: raw, downloadedAt: null };
  } catch (err) {
    console.error("Errore lettura KV:", err);
    return null;
  }
}
__name(readFeedFromKV, "readFeedFromKV");

function getCorsHeaders(request) {
  const origin = request.headers.get("Origin");
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400", Vary: "Origin" };
  }
  return { Vary: "Origin" };
}
__name(getCorsHeaders, "getCorsHeaders");

/**
 * Gestione delle richieste immagini /img/:filename con supporto Edge Cache e KV a 90 giorni
 */
async function handleImageRequest(request, env, filename) {
  const cleanFilename = (filename || "").replace(/[^A-Za-z0-9_.-]/g, "");
  if (!cleanFilename) {
    return new Response("Filename non valido", { status: 400 });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Max-Age": "86400"
      }
    });
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD, OPTIONS" }
    });
  }

  const kvKey = KV_IMG_PREFIX + cleanFilename;
  let imageRecord = null;

  // 1. Cerca l'immagine in KV
  if (env && env.TELEGRAM_KV) {
    try {
      imageRecord = await env.TELEGRAM_KV.getWithMetadata(kvKey, { type: "arrayBuffer" });
    } catch (err) {
      console.warn("Errore lettura KV per " + kvKey + ":", err);
    }
  }

  let imageBytes = imageRecord ? imageRecord.value : null;
  let contentType = imageRecord && imageRecord.metadata ? imageRecord.metadata.contentType : null;

  // 2. Se non presente in KV (richiesta on-demand), prova a scaricarla da Telegram CDN
  if (!imageBytes) {
    const candidateHosts = ["cdn4.telesco.pe", "cdn1.telesco.pe"];
    for (const host of candidateHosts) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), IMG_FETCH_TIMEOUT_MS);
        const res = await fetch("https://" + host + "/file/" + cleanFilename, {
          signal: controller.signal,
          headers: {
            "User-Agent": USER_AGENT,
            Accept: "image/*,*/*;q=0.8"
          }
        });
        clearTimeout(timer);

        if (res.ok) {
          imageBytes = await res.arrayBuffer();
          contentType = res.headers.get("content-type") || (cleanFilename.endsWith(".png") ? "image/png" : "image/jpeg");
          if (env && env.TELEGRAM_KV) {
            env.TELEGRAM_KV.put(kvKey, imageBytes, {
              expirationTtl: IMAGE_MAX_AGE_SEC,
              metadata: {
                contentType,
                size: imageBytes.byteLength,
                savedAt: new Date().toISOString()
              }
            }).catch(() => {});
          }
          break;
        }
      } catch {
      }
    }
  }

  if (!imageBytes) {
    return new Response("Immagine non trovata", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  if (!contentType) {
    contentType = cleanFilename.endsWith(".png") ? "image/png" : cleanFilename.endsWith(".webp") ? "image/webp" : "image/jpeg";
  }

  const responseHeaders = {
    "Content-Type": contentType,
    "Content-Length": String(imageBytes.byteLength),
    "Cache-Control": "public, max-age=" + IMAGE_MAX_AGE_SEC + ", s-maxage=" + IMAGE_MAX_AGE_SEC + ", immutable",
    "Access-Control-Allow-Origin": "*",
    "ETag": '"' + cleanFilename + '"'
  };

  if (request.method === "HEAD") {
    return new Response(null, { status: 200, headers: responseHeaders });
  }

  return new Response(imageBytes, { status: 200, headers: responseHeaders });
}
__name(handleImageRequest, "handleImageRequest");

var worker_default = {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(updateFeedFromBridges(env));
  },
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Route immagini: /img/:filename
    if (url.pathname.startsWith("/img/")) {
      const filename = url.pathname.slice(5);
      return handleImageRequest(request, env, filename);
    }

    if (url.pathname !== "/telegram.xml") return new Response("Not Found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    const corsHeaders = getCorsHeaders(request);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (request.method !== "GET") return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, OPTIONS", "Content-Type": "text/plain; charset=utf-8", ...corsHeaders } });
    let feedData = await readFeedFromKV(env);
    if (!feedData || !feedData.xml) {
      feedData = await updateFeedFromBridges(env, url.origin);
      if (!feedData || !feedData.xml) return new Response("Feed non disponibile", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8", ...corsHeaders } });
    }
    const responseHeaders = { "Content-Type": "application/atom+xml; charset=utf-8", "Cache-Control": "public, max-age=" + CACHE_MAX_AGE, ...corsHeaders };
    if (feedData.downloadedAt) responseHeaders["X-Downloaded-At"] = feedData.downloadedAt;
    return new Response(feedData.xml, { status: 200, headers: responseHeaders });
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
