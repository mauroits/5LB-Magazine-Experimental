import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

/**
 * Calcola dinamicamente il percorso di base dell'app.
 * Supporta lo spostamento continuo tra diversi repository GitHub:
 * 1. BASE_PATH (impostato da actions/configure-pages@v5 o workflow)
 * 2. VITE_BASE_URL o BASE_URL
 * 3. GITHUB_REPOSITORY (variabile standard GitHub Actions, es. "owner/test-repo")
 * 4. Fallback '/' per custom domain o ambiente locale/preview
 */
function getBasePath(): string {
  if (process.env.GITHUB_REPOSITORY) {
    if (process.env.GITHUB_REPOSITORY.includes('5LB-Magazine-APP')) {
      return '/';
    }
    if (process.env.GITHUB_REPOSITORY.includes('5LB-Magazine-Experimental')) {
      return '/5LB-Magazine-Experimental/';
    }
  }

  if (process.env.BASE_PATH !== undefined && process.env.BASE_PATH !== '') {
    const bp = process.env.BASE_PATH.trim();
    if (!bp || bp === '/') return '/';
    const withLeading = bp.startsWith('/') ? bp : `/${bp}`;
    return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
  }

  if (process.env.BASE_PATH === '') {
    return '/';
  }

  const customBase = process.env.VITE_BASE_URL || process.env.BASE_URL;
  if (customBase !== undefined && customBase !== '') {
    const bp = customBase.trim();
    if (!bp || bp === '/') return '/';
    const withLeading = bp.startsWith('/') ? bp : `/${bp}`;
    return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
  }

  return '/';
}

export default defineConfig(() => {
  const base = getBasePath();

  return {
    base,

    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.ico',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
          'logo-faviconBLU.png',
          'logoBLU_APP.jpg',
          'sw-sync.js',
          'screenshots/screenshot-mobile.png',
          'screenshots/screenshot-desktop.png',
        ],
        manifest: {
          id: base,
          name: '5LB Magazine - La rivista sulle 5 Leggi Biologiche',
          short_name: '5LB Magazine',
          description: 'App ufficiale di 5LB Magazine con risorse formative e informative sulle 5 Leggi Biologiche.',
          lang: 'it',
          dir: 'ltr',
          orientation: 'any',
          categories: ['news', 'magazines', 'education', 'health'],
          theme_color: '#000836',
          background_color: '#000836',
          display: 'standalone',
          display_override: ['standalone', 'window-controls-overlay'],
          start_url: base,
          scope: base,
          icons: [
            {
              src: `${base}pwa-192x192.png`,
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: `${base}pwa-512x512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: `${base}pwa-maskable-512x512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          screenshots: [
            {
              src: `${base}screenshots/screenshot-mobile.png`,
              sizes: '750x1334',
              type: 'image/png',
              form_factor: 'narrow',
              label: '5LB Magazine su smartphone - Articoli e rubriche biologiche',
            },
            {
              src: `${base}screenshots/screenshot-desktop.png`,
              sizes: '1280x720',
              type: 'image/png',
              form_factor: 'wide',
              label: '5LB Magazine su desktop e tablet - Griglia articoli e archivio',
            },
          ],
          shortcuts: [
            {
              name: 'Il mio archivio',
              short_name: 'Archivio',
              description: 'Esplora tutti gli articoli e le risorse salvate nella rivista',
              url: `${base}?tab=archive`,
              icons: [
                {
                  src: `${base}pwa-192x192.png`,
                  sizes: '192x192',
                  type: 'image/png',
                },
              ],
            },
            {
              name: 'Ultimi Articoli',
              short_name: 'Novità',
              description: 'Leggi le ultime novità e pubblicazioni sulla rivista',
              url: `${base}?tab=latest`,
              icons: [
                {
                  src: `${base}pwa-192x192.png`,
                  sizes: '192x192',
                  type: 'image/png',
                },
              ],
            },
            {
              name: 'Cerca nella Rivista',
              short_name: 'Cerca',
              description: 'Cerca articoli e temi sulle 5 Leggi Biologiche',
              url: `${base}?action=search`,
              icons: [
                {
                  src: `${base}pwa-192x192.png`,
                  sizes: '192x192',
                  type: 'image/png',
                },
              ],
            },
          ],
          launch_handler: {
            client_mode: ['navigate-existing', 'auto'],
          },
          protocol_handlers: [
            {
              protocol: 'web+magazinelb',
              url: `${base}?launch_pwa=1#%s`,
            },
          ],
          related_applications: [
            {
              platform: 'webapp',
              url: `${base}manifest.webmanifest`,
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          globIgnores: ['**/telegram.xml'],
          importScripts: [`${base}sw-sync.js`],
          runtimeCaching: [
            {
              // Feed dinamico Telegram Accade Oggi: NetworkFirst con fallback cache solo offline
              urlPattern: /.*telegram.*\.xml.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: '5lb-telegram-feed-v2',
                networkTimeoutSeconds: 4,
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 7,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Immagini degli articoli da Blogger, Cloudflare Worker, CDN Google, YouTube, Telegram e domini esterni
              urlPattern: ({ request, url }) => {
                return (
                  request.destination === 'image' ||
                  /\.(?:png|jpg|jpeg|svg|webp|gif|avif|ico)(?:\?.*)?$/i.test(url.pathname) ||
                  url.pathname.startsWith('/img/') ||
                  url.pathname.includes('/api/telegram-image') ||
                  url.hostname.includes('workers.dev') ||
                  url.hostname.includes('googleusercontent.com') ||
                  url.hostname.includes('bp.blogspot.com') ||
                  url.hostname.includes('blogger.com') ||
                  url.hostname.includes('ytimg.com') ||
                  url.hostname.includes('telesco.pe') ||
                  url.hostname.includes('telegram.org') ||
                  url.hostname.includes('t.me')
                );
              },
              handler: 'CacheFirst',
              options: {
                cacheName: '5lb-article-images',
                expiration: {
                  maxEntries: 500,
                  maxAgeSeconds: 60 * 60 * 24 * 90, // 90 giorni (3 mesi)
                },
                cacheableResponse: {
                  statuses: [0, 200], // 0 per risposte opache CDN cross-origin
                },
              },
            },
            {
              urlPattern: /\/api\/(feed|post|check-updates).*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: '5lb-proxy-feeds',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24, // 24 hours
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /\/api\/accade-oggi-feed.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: '5lb-accade-oggi-feed',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});