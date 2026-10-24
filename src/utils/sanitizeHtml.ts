import DOMPurify from 'dompurify';

/**
 * Elenco ESATTO degli host autorizzati per gli iframe video YouTube.
 * Non si usano includes(), endsWith() o indexOf() per prevenire attacchi di tipo subdomain takeover
 * o domini come "not-really-youtube.com".
 */
const ALLOWED_YOUTUBE_HOSTNAMES = new Set<string>([
  'youtube.com',
  'www.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

/**
 * Verifica se l'attributo src di un <iframe> appartiene a YouTube.
 * - Gestisce src protocol-relative che iniziano con "//" normalizzandoli a https:
 * - Esige ESCLUSIVAMENTE il protocollo https:
 * - Esegue un confronto ESATTO su new URL(src).hostname tramite Set.has()
 */
export function isAllowedYouTubeUrl(src: string): boolean {
  if (!src || typeof src !== 'string') return false;
  const trimmed = src.trim();
  if (!trimmed) return false;

  // Normalizza gli URL protocol-relative (es. "//www.youtube.com/embed/...")
  const normalized = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;

  try {
    const parsed = new URL(normalized);

    // Richiede rigorosamente il protocollo HTTPS
    if (parsed.protocol !== 'https:') {
      return false;
    }

    // Confronto ESATTO con la lista consentita
    const hostname = parsed.hostname.toLowerCase();
    return ALLOWED_YOUTUBE_HOSTNAMES.has(hostname);
  } catch {
    return false;
  }
}

let isHookConfigured = false;

function ensurePurifyConfigured() {
  if (isHookConfigured) return;

  // 1. Hook di rimozione degli <iframe> non autorizzati
  DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    if (data.tagName === 'iframe') {
      const element = node as Element;
      const src = element.getAttribute ? element.getAttribute('src') || '' : '';
      if (!isAllowedYouTubeUrl(src)) {
        if (typeof element.remove === 'function') {
          element.remove();
        } else if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }
    }
  });

  // 2. Hook per i link: forza target="_blank" e rel="noopener noreferrer" sui link di contenuto
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      const element = node as Element;
      const href = element.getAttribute ? element.getAttribute('href') : null;
      if (href && !href.startsWith('#')) {
        element.setAttribute('target', '_blank');
        element.setAttribute('rel', 'noopener noreferrer');
      }
    }
  });

  isHookConfigured = true;
}

/**
 * Sanifica l'HTML di articoli (Blogger e Telegram) prima dell'iniezione nel DOM.
 * Rimuove script, eventi inline e consente <iframe> solo ed esclusivamente
 * per youtube.com e youtube-nocookie.com in HTTPS.
 * Garantisce inoltre target="_blank" e rel="noopener noreferrer" per i link esterni.
 */
export function sanitizeArticleHtml(html: string): string {
  if (!html) return '';
  ensurePurifyConfigured();

  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe', 'mark'],
    ADD_ATTR: [
      'allow',
      'allowfullscreen',
      'frameborder',
      'scrolling',
      'loading',
      'target',
      'rel',
      'data-match-index',
    ],
  });
}
