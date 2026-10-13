import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// Blogger Feed Proxy endpoint
app.get('/api/feed', async (req, res) => {
  try {
    const maxResults = req.query['max-results'] || '15';
    const startIndex = req.query['start-index'] || '1';
    const category = req.query['category'] as string | undefined;
    const q = req.query['q'] as string | undefined;
    const feedType = req.query['type'] as string | undefined;

    let targetUrl = feedType === 'pages'
      ? `https://magazine.5lb.eu/feeds/pages/default?alt=json&max-results=${maxResults}`
      : `https://magazine.5lb.eu/feeds/posts/default?alt=json&max-results=${maxResults}&start-index=${startIndex}`;

    if (category && feedType !== 'pages') {
      targetUrl = `https://magazine.5lb.eu/feeds/posts/default/-/${encodeURIComponent(category)}?alt=json&max-results=${maxResults}&start-index=${startIndex}`;
    }
    if (q) {
      targetUrl += `&q=${encodeURIComponent(q)}`;
    }

    const ifModifiedSince = req.headers['if-modified-since'];
    const fetchHeaders: Record<string, string> = {
      'User-Agent': '5LB-Magazine-PWA/1.0 (+https://5lb.eu)',
      Accept: 'application/json',
    };
    if (ifModifiedSince) {
      fetchHeaders['If-Modified-Since'] = ifModifiedSince;
    }

    const response = await fetch(targetUrl, { headers: fetchHeaders });

    if (response.status === 304) {
      return res.status(304).end();
    }

    if (!response.ok) {
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

    // Cache for 300 seconds (5 min) on client, 900 seconds (15 min) on CDN to prevent excessive Blogger requests
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=900');
    return res.json(data);
  } catch (error: any) {
    console.error('Error fetching Blogger feed:', error);
    return res.status(500).json({ error: error.message || 'Internal feed error' });
  }
});

// Check for updates endpoint (used by Periodic Sync & background polling with conditional If-Modified-Since)
app.get('/api/check-updates', async (req, res) => {
  try {
    const ifModifiedSince = req.headers['if-modified-since'];
    const fetchHeaders: Record<string, string> = {
      'User-Agent': '5LB-Magazine-PWA/1.0 (+https://5lb.eu)',
      Accept: 'application/json',
    };
    if (ifModifiedSince) {
      fetchHeaders['If-Modified-Since'] = ifModifiedSince;
    }

    const targetUrl = 'https://magazine.5lb.eu/feeds/posts/default?alt=json&max-results=5';
    const response = await fetch(targetUrl, { headers: fetchHeaders });

    if (response.status === 304) {
      return res.status(304).end();
    }

    if (!response.ok) {
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
      return res.json({ hasNew: false });
    }

    const postDate = new Date(entry.updated?.$t || entry.published?.$t).getTime();
    if (ifModifiedSince) {
      const sinceTime = new Date(ifModifiedSince).getTime();
      if (!isNaN(sinceTime) && postDate <= sinceTime) {
        return res.status(304).end();
      }
    }

    let link = 'https://magazine.5lb.eu';
    if (Array.isArray(entry.link)) {
      const altLink = entry.link.find((l: any) => l.rel === 'alternate' && l.type === 'text/html');
      if (altLink && altLink.href) link = altLink.href;
    }

    const rawContent = entry.summary?.$t || entry.content?.$t || '';
    const summary = rawContent.replace(/<[^>]+>/g, ' ').slice(0, 150).trim();
    const lastModified = new Date(postDate).toUTCString();

    res.setHeader('Last-Modified', lastModified);
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=900');

    return res.json({
      hasNew: true,
      id: entry.id?.$t,
      title: entry.title?.$t,
      summary,
      link,
      published: entry.published?.$t,
      updated: entry.updated?.$t,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Telegram in-app view proxy endpoint to bypass X-Frame-Options: SAMEORIGIN
app.get('/api/telegram-view', async (req, res) => {
  try {
    const response = await fetch('https://t.me/s/magazine5LB', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      return res.status(response.status).send('Errore nel caricamento del canale Telegram.');
    }

    let html = await response.text();

    // Inject <base href="https://t.me/"> and ensure external links open in new tab
    html = html.replace(
      '<head>',
      '<head><base href="https://t.me/"><style>body{background-color:#f8fafc;}@media(prefers-color-scheme:dark){body{background-color:#020617;}}</style>'
    );

    // Remove frame headers so iframe renders perfectly inside app
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=300');
    return res.send(html);
  } catch (error: any) {
    console.error('Error proxying Telegram:', error);
    return res.status(500).send('Impossibile caricare il canale Telegram al momento.');
  }
});

// Accade Oggi RSS (Atom) proxy endpoint with automatic fallback
const ACCADE_OGGI_PRIMARY =
  'https://rss-bridge.org/bridge01/?action=display&username=magazine5LB&bridge=TelegramBridge&format=Atom';
const ACCADE_OGGI_FALLBACK =
  'https://rss-bridge.ggc-project.de/?action=display&username=magazine5LB&bridge=TelegramBridge&format=Atom';

app.get('/api/accade-oggi-feed', async (req, res) => {
  const fetchWithTimeout = async (url: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const resp = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': '5LB-Magazine-PWA/1.0 (+https://5lb.eu)',
          Accept: 'application/atom+xml, application/xml, text/xml, */*',
        },
      });
      clearTimeout(timer);
      if (!resp.ok) throw new Error(`HTTP error ${resp.status}`);
      return await resp.text();
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };

  try {
    let xmlContent = '';
    try {
      xmlContent = await fetchWithTimeout(ACCADE_OGGI_PRIMARY);
    } catch (errPrimary) {
      console.warn('Primary rss-bridge failed, trying fallback rss-bridge:', errPrimary);
      xmlContent = await fetchWithTimeout(ACCADE_OGGI_FALLBACK);
    }

    res.setHeader('Content-Type', 'application/atom+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=900');
    return res.send(xmlContent);
  } catch (error: any) {
    console.error('Error fetching Accade Oggi Atom feed:', error);
    return res.status(502).json({ error: error.message || 'Unable to retrieve Accade Oggi feed' });
  }
});




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

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
