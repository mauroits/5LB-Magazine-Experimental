/**
 * Utility per la validazione e normalizzazione sicura degli URL provenienti da feed esterni.
 */

/**
 * Restituisce la stringa URL normalizzata solo se, dopo trim e new URL(),
 * il protocollo è rigorosamente 'https:' (gestendo anche gli URL protocol-relative "//host" come https).
 * In caso contrario, restituisce null.
 * Rifiuta schemi javascript:, data:, vbscript:, intent:, file:, http: e qualsiasi altro schema.
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
 * Come toHttpsUrl, ma accetta sia 'http:' sia 'https:'.
 * Rifiuta javascript:, data:, vbscript:, intent:, file: e qualsiasi altro schema non-HTTP/HTTPS,
 * indipendentemente da maiuscole/minuscole o spazi/caratteri di controllo iniziali.
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
