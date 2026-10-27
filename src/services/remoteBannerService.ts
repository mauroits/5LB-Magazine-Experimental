/**
 * Normalizza gli URL raw di GitHub Gist rimuovendo l'eventuale hash del commit
 * (es. .../raw/ab336bb57a0fb597b31af46f4e167820849e3051/banner.json -> .../raw/banner.json)
 * in modo che punti sempre automaticamente all'ultima versione pubblicata del Gist.
 */
export function normalizeGistRawUrl(url: string): string {
  if (!url) return url;
  return url.replace(
    /(https:\/\/gist\.githubusercontent\.com\/[^\/]+\/[^\/]+\/raw)\/[a-f0-9]{40}\/(.+)/i,
    "$1/$2"
  );
}

import { RemoteBannerConfig } from '../types';
import {
  REMOTE_BANNER_GIST_URL,
  DISMISSED_BANNER_STORAGE_KEY,
  CACHED_BANNER_STORAGE_KEY,
  BANNER_CACHE_WINDOW_MS,
  DEFAULT_FALLBACK_BANNER,
} from '../config/remoteBannerConfig';

/**
 * Recupera l'ID del banner archiviato come chiuso dall'utente.
 */
export function getDismissedBannerId(): string | null {
  try {
    return localStorage.getItem(DISMISSED_BANNER_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Salva l'ID del messaggio chiuso dall'utente in localStorage.
 */
export function dismissBanner(id: string): void {
  try {
    localStorage.setItem(DISMISSED_BANNER_STORAGE_KEY, id);
  } catch {
    // ignore
  }
}

/**
 * Verifica se lo specifico messaggio ID è già stato chiuso dall'utente.
 */
export function isBannerDismissed(id: string): boolean {
  if (!id) return false;
  return getDismissedBannerId() === id;
}

/**
 * Legge l'ultima configurazione salvata in cache locale.
 */
export function getCachedBannerConfig(): RemoteBannerConfig | null {
  try {
    const raw = localStorage.getItem(CACHED_BANNER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RemoteBannerConfig;
  } catch {
    return null;
  }
}

/**
 * Salva la configurazione valida in cache locale.
 */
export function saveCachedBannerConfig(config: RemoteBannerConfig): void {
  try {
    localStorage.setItem(CACHED_BANNER_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

/**
 * Effettua il fetch della configurazione del banner da GitHub Gist / endpoint remoto.
 * Usa un parametro timestamp di cache-busting basato su una finestra di 2 minuti.
 */
export async function fetchRemoteBannerConfig(
  customUrl?: string
): Promise<RemoteBannerConfig> {
  const targetUrl = normalizeGistRawUrl(customUrl || REMOTE_BANNER_GIST_URL);

  // Costruisci URL con cache-busting per evitare che il CDN di GitHub o il browser blocchino le modifiche
  const cacheBuster = Math.floor(Date.now() / BANNER_CACHE_WINDOW_MS);
  const delimiter = targetUrl.includes('?') ? '&' : '?';
  const requestUrl = `${targetUrl}${delimiter}_t=${cacheBuster}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(requestUrl, {
      signal: controller.signal,
      cache: 'no-cache',
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} durante il caricamento del banner`);
    }

    const data = await response.json();

    // Validazione dei campi essenziali
    if (typeof data !== 'object' || data === null) {
      throw new Error('Formato JSON del banner non valido');
    }

    const config: RemoteBannerConfig = {
      enabled: typeof data.enabled === 'boolean' ? data.enabled : true,
      id: typeof data.id === 'string' && data.id.trim() ? data.id.trim() : 'annuncio-default',
      title: typeof data.title === 'string' ? data.title.trim() : 'Avviso 5LB Magazine',
      message: typeof data.message === 'string' ? data.message.trim() : '',
      icon: data.icon || 'bell',
      theme: data.theme || 'blue',
      action: data.action && typeof data.action === 'object' ? data.action : undefined,
      canDismiss: typeof data.canDismiss === 'boolean' ? data.canDismiss : true,
    };

    saveCachedBannerConfig(config);
    return config;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('Impossibile scaricare la configurazione remota del banner:', err);

    // Fallback: prova la cache locale salvata in precedenza, altrimenti la configurazione base
    const cached = getCachedBannerConfig();
    if (cached) {
      return cached;
    }
    return DEFAULT_FALLBACK_BANNER;
  }
}
