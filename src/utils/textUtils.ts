/**
 * Utility functions for HTML entity decoding and text snippet sanitization.
 */

const NAMED_ENTITIES: Record<string, string> = {
  quot: '"',
  apos: "'",
  amp: '&',
  lt: '<',
  gt: '>',
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  sbquo: '‚',
  ldquo: '“',
  rdquo: '”',
  bdquo: '„',
  laquo: '«',
  raquo: '»',
  hellip: '…',
  bull: '•',
  middot: '·',
  prime: '′',
  Prime: '″',
  deg: '°',
  micro: 'µ',
  para: '¶',
  sect: '§',
  copy: '©',
  reg: '®',
  trade: '™',
  euro: '€',
  pound: '£',
  yen: '¥',
  cent: '¢',
  agrave: 'à',
  aacute: 'á',
  acirc: 'â',
  atilde: 'ã',
  auml: 'ä',
  aring: 'å',
  aelig: 'æ',
  ccedil: 'ç',
  egrave: 'è',
  eacute: 'é',
  ecirc: 'ê',
  euml: 'ë',
  igrave: 'ì',
  iacute: 'í',
  icirc: 'î',
  iuml: 'ï',
  ograve: 'ò',
  oacute: 'ó',
  ocirc: 'ô',
  otilde: 'õ',
  ouml: 'ö',
  ugrave: 'ù',
  uacute: 'ú',
  ucirc: 'û',
  uuml: 'ü',
  Agrave: 'À',
  Aacute: 'Á',
  Acirc: 'Â',
  Atilde: 'Ã',
  Auml: 'Ä',
  Egrave: 'È',
  Eacute: 'É',
  Ecirc: 'Ê',
  Euml: 'Ë',
  Igrave: 'Ì',
  Iacute: 'Í',
  Icirc: 'Î',
  Iuml: 'Ï',
  Ograve: 'Ò',
  Oacute: 'Ó',
  Ocirc: 'Ô',
  Otilde: 'Õ',
  Ouml: 'Ö',
  Ugrave: 'Ù',
  Uacute: 'Ú',
  Ucirc: 'Û',
  Uuml: 'Ü',
};

let sharedDOMParser: DOMParser | null = null;

/**
 * Fallback entity replacement regex handler for environments without DOMParser
 * or as a robust decoder.
 */
function replaceEntitiesWithMap(str: string): string {
  return str.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, entity) => {
    // 1. Numeric decimal (e.g. &#39;, &#8217;)
    if (entity.startsWith('#') && !entity.startsWith('#x') && !entity.startsWith('#X')) {
      const dec = parseInt(entity.slice(1), 10);
      if (!isNaN(dec) && dec > 0) {
        try {
          return String.fromCodePoint ? String.fromCodePoint(dec) : String.fromCharCode(dec);
        } catch {
          return match;
        }
      }
      return match;
    }

    // 2. Numeric hexadecimal (e.g. &#x27;)
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const hex = parseInt(entity.slice(2), 16);
      if (!isNaN(hex) && hex > 0) {
        try {
          return String.fromCodePoint ? String.fromCodePoint(hex) : String.fromCharCode(hex);
        } catch {
          return match;
        }
      }
      return match;
    }

    // 3. Named entity lookup
    if (Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, entity)) {
      return NAMED_ENTITIES[entity];
    }

    return match;
  });
}

/**
 * Decodes all HTML entities (&quot;, &#39;, &apos;, &lsquo;, &rsquo;, numeric entities, etc.)
 * into genuine Unicode text, resolving double-encoded entities if present.
 */
export function decodeHtmlEntities(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';
  if (!text.includes('&')) return text;

  let result = text;

  // Primary path in browser environments: DOMParser handles full HTML5 entity spec
  if (typeof DOMParser !== 'undefined') {
    try {
      if (!sharedDOMParser) {
        sharedDOMParser = new DOMParser();
      }
      const doc = sharedDOMParser.parseFromString(result, 'text/html');
      result = doc.body.textContent || result;

      // Handle double-encoded entities (e.g. &amp;quot; or &amp;#39;)
      if (result.includes('&') && /&(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);/.test(result)) {
        const doc2 = sharedDOMParser.parseFromString(result, 'text/html');
        result = doc2.body.textContent || result;
      }
      return result;
    } catch {
      // Fall through to manual regex replacement
    }
  }

  // Fallback path
  result = replaceEntitiesWithMap(result);
  if (result.includes('&') && /&(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);/.test(result)) {
    result = replaceEntitiesWithMap(result);
  }

  return result;
}

/**
 * Sanitizes plain text strings (such as titles, category names, tags, author names):
 * decodes entities and normalizes whitespace without truncating.
 */
export function sanitizePlainText(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';
  // Strip any accidental inline HTML tags first
  const noTags = text.replace(/<[^>]+>/g, ' ');
  return decodeHtmlEntities(noTags).replace(/\s+/g, ' ').trim();
}

/**
 * Cleans an HTML string into a human-readable snippet for article preview cards:
 * - Strips `<style>` and `<script>` blocks
 * - Replaces block-level tags and linebreaks with spaces so words do not collide
 * - Strips all remaining HTML tags
 * - Decodes all HTML entities (&quot;, &#39;, apostrophes, quotes, accented letters)
 * - Collapses repeated whitespace
 * - Truncates cleanly at a word boundary with an ellipsis
 */
export function cleanTextSnippet(html: string | null | undefined, maxLength = 180): string {
  if (!html || typeof html !== 'string') return '';

  // 1. Strip script and style blocks
  let text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // 2. Add spaces around block tags and line breaks to prevent word concatenation
  text = text
    .replace(/<(?:p|div|h[1-6]|li|blockquote|br|hr|tr|section|article)[^>]*>/gi, ' ')
    .replace(/<\/(?:p|div|h[1-6]|li|blockquote|tr|section|article)>/gi, ' ');

  // 3. Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // 4. Decode all HTML entities
  text = decodeHtmlEntities(text);

  // 5. Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();

  if (!text) return '';
  if (text.length <= maxLength) return text;

  // 6. Clean cutoff at word boundary
  const sliced = text.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.75) {
    return sliced.slice(0, lastSpace).trim() + '...';
  }
  return sliced.trim() + '...';
}
