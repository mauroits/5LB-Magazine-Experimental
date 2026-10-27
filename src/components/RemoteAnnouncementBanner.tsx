import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Info,
  AlertTriangle,
  Sparkles,
  Download,
  BookOpen,
  Heart,
  Compass,
  Star,
  Smartphone,
  Newspaper,
  ArrowRight,
  ExternalLink,
  X,
  Share2,
} from 'lucide-react';
import { RemoteBannerConfig, BannerIconType, BannerThemeColor } from '../types';
import {
  fetchRemoteBannerConfig,
  isBannerDismissed,
  dismissBanner,
  getCachedBannerConfig,
} from '../services/remoteBannerService';
import { openExternalBrowser } from "../utils/browserLauncher";
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallGuideModal, PWAInstallModalMode } from './PWAInstallGuideModal';

interface RemoteAnnouncementBannerProps {
  onOpenUrl: (url: string) => void;
  onOpenArticle?: (urlOrId: string) => void;
  customGistUrl?: string;
}

const ICON_MAP: Record<BannerIconType, React.ComponentType<{ className?: string }>> = {
  bell: Bell,
  info: Info,
  alert: AlertTriangle,
  sparkles: Sparkles,
  download: Download,
  book: BookOpen,
  heart: Heart,
  compass: Compass,
  star: Star,
  smartphone: Smartphone,
  newspaper: Newspaper,
};

const THEME_STYLES: Record<
  BannerThemeColor,
  {
    containerBorder: string;
    iconBg: string;
    iconText: string;
    button: string;
  }
> = {
  blue: {
    containerBorder: 'border-blue-500/40',
    iconBg: 'bg-blue-600/25 border-blue-400/40',
    iconText: 'text-blue-400',
    button: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20',
  },
  amber: {
    containerBorder: 'border-amber-500/40',
    iconBg: 'bg-amber-600/25 border-amber-400/40',
    iconText: 'text-amber-400',
    button: 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold shadow-amber-500/20',
  },
  emerald: {
    containerBorder: 'border-emerald-500/40',
    iconBg: 'bg-emerald-600/25 border-emerald-400/40',
    iconText: 'text-emerald-400',
    button: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20',
  },
  purple: {
    containerBorder: 'border-purple-500/40',
    iconBg: 'bg-purple-600/25 border-purple-400/40',
    iconText: 'text-purple-400',
    button: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/20',
  },
  orange: {
    containerBorder: 'border-orange-500/40',
    iconBg: 'bg-orange-600/25 border-orange-400/40',
    iconText: 'text-orange-400',
    button: 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white shadow-orange-500/20',
  },
};

/**
 * Renderizza il testo del messaggio consentendo link cliccabili inline
 * formato markdown [testo](url) o plain https://...
 */
function renderMessageWithLinks(text: string, onLinkClick: (url: string) => void) {
  if (!text) return null;

  // Pattern per [etichetta](url) oppure URL plain
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s]+)/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    // Aggiungi il testo precedente al match
    if (match.index > lastIndex) {
      elements.push(text.substring(lastIndex, match.index));
    }

    if (match[1] && match[2]) {
      // Formato markdown [testo](url)
      const label = match[1];
      const url = match[2];
      elements.push(
        <button
          key={`md-link-${match.index}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onLinkClick(url);
          }}
          className="text-blue-300 hover:text-blue-100 underline underline-offset-2 font-medium cursor-pointer"
        >
          {label}
        </button>
      );
    } else if (match[3]) {
      // URL diretto
      const url = match[3];
      elements.push(
        <button
          key={`plain-link-${match.index}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onLinkClick(url);
          }}
          className="text-blue-300 hover:text-blue-100 underline underline-offset-2 font-medium cursor-pointer"
        >
          {url}
        </button>
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }

  return elements.length > 0 ? elements : text;
}

export const RemoteAnnouncementBanner: React.FC<RemoteAnnouncementBannerProps> = ({
  onOpenUrl,
  onOpenArticle,
  customGistUrl,
}) => {
  const [config, setConfig] = useState<RemoteBannerConfig | null>(() => getCachedBannerConfig());
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [activeModal, setActiveModal] = useState<PWAInstallModalMode | null>(null);

  // Hook per supporto nativo installazione PWA (se configurato come azione)
  const {
    isInstallable,
    isStandalone,
    isInstalled,
    isIOS,
    isIPad,
    isIOSSafari,
    isIOSOtherBrowser,
    isUnsupportedBrowser,
    unsupportedBrowserName,
    install,
  } = usePWAInstall();

  // Caricamento configurazione remota all'avvio e ad ogni cambio finestra attiva
  const loadConfig = useCallback(async () => {
    try {
      const remoteData = await fetchRemoteBannerConfig(customGistUrl);
      setConfig(remoteData);

      // Verifica se l'ID specifico è già stato chiuso dall'utente
      if (remoteData.id && isBannerDismissed(remoteData.id)) {
        setIsDismissed(true);
      } else {
        setIsDismissed(false);
      }
    } catch (err) {
      console.warn('Errore refresh remote banner:', err);
    }
  }, [customGistUrl]);

  useEffect(() => {
    loadConfig();

    // Ricarica la configurazione quando la tab torna visibile in primo piano
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadConfig();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadConfig]);

  // Se non c'è config, o è disabilitato dal programmatore, o è già stato chiuso con questo ID, non mostrare nulla
  if (!config || !config.enabled || isDismissed) {
    return null;
  }

  // Gestione chiusura banner da parte dell'utente
  const handleDismiss = () => {
    if (config.id) {
      dismissBanner(config.id);
    }
    setIsDismissed(true);
  };

  // Gestione click sul pulsante d'azione
  const handleActionClick = async () => {
    const action = config.action;
    if (!action) return;

    if (action.type === 'pwa_install') {
      if (isInstalled && !isInstallable) {
        setActiveModal('launch');
      } else if (isIOS && isIOSOtherBrowser) {
        setActiveModal('ios-redirect');
      } else if (isIOS && isIOSSafari) {
        setActiveModal('ios');
      } else if (isInstallable) {
        const ok = await install();
        if (!ok && !isStandalone) {
          setActiveModal('chrome');
        }
      } else if (isUnsupportedBrowser) {
        setActiveModal('unsupported');
      } else {
        const ok = await install();
        if (!ok) {
          setActiveModal('chrome');
        }
      }
      return;
    }

    if (action.type === 'article' && action.url) {
      if (onOpenArticle) {
        onOpenArticle(action.url);
      } else {
        onOpenUrl(action.url);
      }
      return;
    }

    // Default: link web (apre nel browser integrato dell'app)
    if (action.url) {
      if (onOpenUrl) {
        onOpenUrl(action.url);
      } else {
        openExternalBrowser(action.url);
      }
    }
  };

  const themeKey = config.theme && THEME_STYLES[config.theme] ? config.theme : 'blue';
  const theme = THEME_STYLES[themeKey];

  const IconComponent =
    config.icon && ICON_MAP[config.icon] ? ICON_MAP[config.icon] : Bell;

  const action = config.action;
  const hasAction = Boolean(action && action.label);

  return (
    <>
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 pt-3 sm:pt-4 pb-0">
        <div
          role="region"
          aria-label="Avviso in evidenza"
          className={`w-full bg-[#0e1838] text-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-lg border ${theme.containerBorder} flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300 backdrop-blur-md`}
        >
          {/* Blocco Icona e Testo */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={`w-10 h-10 rounded-2xl ${theme.iconBg} border flex items-center justify-center shrink-0 ${theme.iconText} shadow-inner`}
          >
            <IconComponent className="w-5 h-5" />
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
              {config.title}
            </h4>
            <div className="text-[11px] sm:text-xs text-slate-300 leading-snug line-clamp-2 mt-0.5">
              {renderMessageWithLinks(config.message, (url) => {
                if (action?.type === 'article' && onOpenArticle) {
                  onOpenArticle(url);
                } else {
                  onOpenUrl(url);
                }
              })}
            </div>
          </div>
        </div>

        {/* Pulsanti Azione e Chiusura */}
        <div className="flex items-center gap-2 shrink-0">
          {hasAction && (
            <button
              type="button"
              onClick={handleActionClick}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs transition active:scale-95 cursor-pointer shadow-sm ${theme.button}`}
            >
              <span>{action!.label}</span>
              {action?.type === 'pwa_install' ? (
                <Download className="w-3.5 h-3.5" />
              ) : action?.openIn === 'external' ? (
                <ExternalLink className="w-3.5 h-3.5" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Pulsante Chiusura X ad Alto Contrasto: visibile e nitido anche sul blu scuro */}
          {config.canDismiss !== false && (
            <button
              type="button"
              onClick={handleDismiss}
              title="Chiudi avviso"
              aria-label="Chiudi avviso"
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 active:bg-white/45 text-white border border-white/40 flex items-center justify-center shrink-0 shadow-md transition active:scale-90 cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>
    </div>

      {/* Modale guida installazione PWA se attivata tramite azione pwa_install */}
      <PWAInstallGuideModal
        isOpen={activeModal !== null}
        onClose={() => setActiveModal(null)}
        mode={activeModal || 'chrome'}
        browserName={unsupportedBrowserName}
        isIPad={isIPad}
        onRetryInstall={install}
      />
    </>
  );
};
