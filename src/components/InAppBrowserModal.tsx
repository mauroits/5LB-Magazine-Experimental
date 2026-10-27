import React, { useState, useEffect } from 'react';
import { X, ExternalLink, RotateCw, Globe, Shield, AlertCircle } from 'lucide-react';
import { openExternalBrowser } from '../utils/browserLauncher';
import { toHttpOrHttpsUrl } from '../utils/safeUrl';

interface InAppBrowserModalProps {
  isOpen: boolean;
  url: string | null;
  title?: string;
  onClose: () => void;
}

export const InAppBrowserModal: React.FC<InAppBrowserModalProps> = ({
  isOpen,
  url,
  title,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
    }
  }, [isOpen, url]);

  if (!isOpen || !url) return null;

  const validUrl = toHttpOrHttpsUrl(url);

  let hostname = '';
  try {
    if (validUrl) {
      hostname = new URL(validUrl).hostname;
    }
  } catch {
    hostname = validUrl || '';
  }

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  const handleOpenExternal = () => {
    if (validUrl) {
      openExternalBrowser(validUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
      {/* Top App Bar / In-App Browser Header */}
      <div className="bg-[#0e1838] px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] text-white flex items-center justify-between gap-3 border-b border-blue-500/30 shadow-lg shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-white truncate">
              {title || hostname || 'Navigatore In-App'}
            </h3>
            <p className="text-[11px] text-slate-300 truncate flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-400 inline shrink-0" />
              <span>{hostname}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleRefresh}
            title="Ricarica pagina"
            aria-label="Ricarica pagina"
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition cursor-pointer"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenExternal}
            title="Apri nel browser esterno"
            aria-label="Apri nel browser esterno"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-600/40 hover:bg-blue-600/60 border border-blue-400/40 text-xs font-medium text-white transition active:scale-95 cursor-pointer"
          >
            <span className="hidden sm:inline">Browser esterno</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {/* High-contrast X close button */}
          <button
            onClick={onClose}
            title="Chiudi visualizzatore"
            aria-label="Chiudi visualizzatore"
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white border border-white/30 active:scale-95 transition cursor-pointer shadow-sm ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Browser Viewport Frame */}
      <div className="relative flex-1 w-full bg-slate-900 overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/70 text-slate-200 gap-3">
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium text-slate-300">Caricamento pagina...</p>
          </div>
        )}

        {validUrl ? (
          <iframe
            key={iframeKey}
            src={validUrl}
            title={title || 'Browser In-App 5LB'}
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
            className="w-full h-full border-none bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-300">
            <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
            <p className="text-sm">Indirizzo web non valido.</p>
          </div>
        )}
      </div>
    </div>
  );
};
