/**
 * Utility per la validazione e sanitizzazione sicura degli URL.
 * Accetta rigorosamente solo protocolli sicuri http: e https:
 * scartando qualsiasi schema pericoloso (javascript:, data:, vbscript:, file:, blob:, ecc.).
 */

/**
 * Verifica se una stringa è un URL sicuro con protocollo http: o https:.
 */
export function isSafeUrl(url: string | null | undefined): boolean {
  return toHttpOrHttpsUrl(url) !== null;
}

/**
 * Restituisce l'URL normalizzato solo se il protocollo è rigorosamente 'https:'
 * (gestisce anche URL protocol-relative "//host" trasformandoli in https://).
 * In caso contrario, restituisce null.
 */
export function toHttpsUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  let trimmed = url.replace(/^[\x00-\x20\s]+|[\x00-\x20\s]+$/g, '');
  if (!trimmed) return null;

  if (trimmed.startsWith('//')) {
    trimmed = `https:${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:') {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Valida un URL accettando rigorosamente solo schemi 'http:' o 'https:'.
 * Rifiuta javascript:, data:, vbscript:, file:, blob:, intent: o caratteri di controllo.
 * Restituisce la stringa dell'URL normalizzata o null se non sicuro.
 */
export function toHttpOrHttpsUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  let trimmed = url.replace(/^[\x00-\x20\s]+|[\x00-\x20\s]+$/g, '');
  if (!trimmed) return null;

  if (trimmed.startsWith('//')) {
    trimmed = `https:${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Sanitizza un link ad un articolo proveniente da feed Blogger o sorgenti esterne.
 * Se l'URL non è valido o usa protocolli non ammessi, restituisce il fallback sicuro fornito.
 */
export function sanitizeArticleLink(
  url: string | null | undefined,
  fallback = 'https://magazine.5lb.eu'
): string {
  const safe = toHttpOrHttpsUrl(url);
  return safe || fallback;
}
