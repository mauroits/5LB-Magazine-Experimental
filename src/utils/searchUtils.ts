/**
 * Utility functions for exact word/phrase searching and in-article highlighting.
 */

/**
 * Escapes regex special characters.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Checks if a text contains the exact word or sequence of words from query.
 * Uses Unicode-aware boundaries to support Italian accented characters and punctuation.
 *
 * Example:
 *   matchesExactPhrase("Nel cavo orale", "cavo") -> true
 *   matchesExactPhrase("Nel cavolfiore", "cavo") -> false
 *   matchesExactPhrase("Nel cavo orale", "cavo orale") -> true
 *   matchesExactPhrase("Nel cavolfiore orale", "cavo orale") -> false
 */
export function matchesExactPhrase(text: string, query: string): boolean {
  if (!text || !query) return false;
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;

  const pattern = words.map((w) => escapeRegex(w)).join('\\s+');
  try {
    const regex = new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, 'iu');
    return regex.test(text);
  } catch (e) {
    const fallbackRegex = new RegExp(`\\b${pattern}\\b`, 'i');
    return fallbackRegex.test(text);
  }
}

/**
 * Strips HTML tags and common entities for clean text search.
 */
export function cleanHtmlForSearch(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ');
}

/**
 * Checks whether an article post matches the exact phrase search in title,
 * summary, clean content, or categories.
 */
export function postMatchesExactPhrase(
  post: { title: string; summary: string; content?: string; categories: string[] },
  query: string
): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  if (matchesExactPhrase(post.title, trimmed)) return true;
  if (matchesExactPhrase(post.summary, trimmed)) return true;
  if (post.categories && post.categories.some((cat) => matchesExactPhrase(cat, trimmed))) {
    return true;
  }
  if (post.content) {
    const cleanContent = cleanHtmlForSearch(post.content);
    if (matchesExactPhrase(cleanContent, trimmed)) return true;
  }

  return false;
}

/**
 * Highlights matches of a word/phrase inside an HTML content string safely
 * by operating strictly on DOM Text nodes (without breaking HTML tags, links or attributes).
 */
export function highlightHtmlContent(
  htmlContent: string,
  searchTerm: string,
  activeIndex: number,
  exactWord = true
): { highlightedHtml: string; totalMatches: number } {
  const trimmed = searchTerm.trim();
  if (!trimmed || !htmlContent) {
    return { highlightedHtml: htmlContent, totalMatches: 0 };
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return { highlightedHtml: htmlContent, totalMatches: 0 };
  }

  const pattern = words.map((w) => escapeRegex(w)).join('\\s+');
  let regex: RegExp;
  try {
    if (exactWord) {
      regex = new RegExp(`(?<![\\p{L}\\p{N}])(${pattern})(?![\\p{L}\\p{N}])`, 'giu');
    } else {
      regex = new RegExp(`(${pattern})`, 'giu');
    }
  } catch (e) {
    regex = exactWord
      ? new RegExp(`\\b(${pattern})\\b`, 'gi')
      : new RegExp(`(${pattern})`, 'gi');
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { highlightedHtml: htmlContent, totalMatches: 0 };
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${htmlContent}</div>`, 'text/html');
    const container = doc.body.firstElementChild || doc.body;

    const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    const textNodes: Text[] = [];
    let currentNode = walker.nextNode();
    while (currentNode) {
      textNodes.push(currentNode as Text);
      currentNode = walker.nextNode();
    }

    let matchCounter = 0;

    for (const node of textNodes) {
      const text = node.nodeValue;
      if (!text) continue;

      regex.lastIndex = 0;
      if (!regex.test(text)) continue;

      regex.lastIndex = 0;
      const frag = doc.createDocumentFragment();
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          frag.appendChild(doc.createTextNode(text.substring(lastIndex, match.index)));
        }

        const matchIndex = matchCounter;
        const isActive = matchIndex === activeIndex;

        const mark = doc.createElement('mark');
        mark.id = `article-match-${matchIndex}`;
        mark.setAttribute('data-match-index', String(matchIndex));
        mark.className = isActive
          ? 'bg-orange-500 text-white font-bold px-1.5 py-0.5 rounded-xs ring-2 ring-orange-600 scale-105 inline-block shadow-sm transition-all duration-150 article-match-active'
          : 'bg-yellow-300 dark:bg-yellow-500/90 text-slate-900 font-semibold px-0.5 rounded-xs inline-block transition-colors article-match';
        mark.textContent = match[0];

        frag.appendChild(mark);
        matchCounter++;
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < text.length) {
        frag.appendChild(doc.createTextNode(text.substring(lastIndex)));
      }

      node.parentNode?.replaceChild(frag, node);
    }

    return {
      highlightedHtml: container.innerHTML,
      totalMatches: matchCounter,
    };
  } catch (err) {
    console.error('Errore durante l evidenziazione del contenuto HTML:', err);
    return { highlightedHtml: htmlContent, totalMatches: 0 };
  }
}
