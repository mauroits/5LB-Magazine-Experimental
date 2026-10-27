import { RemoteBannerConfig } from '../types';

/**
 * CONFIGURAZIONE DEL BANNER REMOTO TRAMITE GITHUB GIST
 *
 * Istruzioni per il programmatore:
 * 1. Crea un Gist pubblico su https://gist.github.com
 * 2. Assegna al file il nome "banner.json"
 * 3. Incolla il contenuto JSON strutturato come l'esempio
 * 4. Clicca su "Create public gist", poi sul pulsante "Raw" del file
 * 5. Copia l'URL della pagina Raw (es. https://gist.githubusercontent.com/<tuo-utente>/<gist-id>/raw/banner.json)
 * 6. Inserisci quell'URL qui sotto in REMOTE_BANNER_GIST_URL oppure nella variabile d'ambiente VITE_REMOTE_BANNER_GIST_URL
 */

export const REMOTE_BANNER_GIST_URL: string =
  (import.meta.env.VITE_REMOTE_BANNER_GIST_URL as string) ||
  'https://gist.githubusercontent.com/mauroits/3b3b18e7d13dc5264a8bf2f568b8de11/raw/banner.json';

export const DISMISSED_BANNER_STORAGE_KEY = '5lb_dismissed_remote_banner_id';
export const CACHED_BANNER_STORAGE_KEY = '5lb_cached_remote_banner';
export const BANNER_CACHE_WINDOW_MS = 120000; // 2 minuti

export const DEFAULT_FALLBACK_BANNER: RemoteBannerConfig = {
  enabled: true,
  id: 'welcome-announcement-v1',
  title: '5LB Magazine News',
  message: 'Consulta tutti gli articoli offline e installa l’App sul tuo dispositivo.',
  icon: 'newspaper',
  theme: 'blue',
  action: {
    label: 'Installa App',
    type: 'pwa_install',
  },
  canDismiss: true,
};
