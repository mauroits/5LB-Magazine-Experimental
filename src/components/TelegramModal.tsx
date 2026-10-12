import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Send,
  RefreshCw,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { TELEGRAM_CHANNEL_URL } from '../config/navigation';

interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TelegramModal: React.FC<TelegramModalProps> = ({ isOpen, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  if (!isOpen) return null;

  // Uses local proxy route to bypass X-Frame-Options: SAMEORIGIN
  const iframeSrc = '/api/telegram-view';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-3 md:p-6 bg-black/75 backdrop-blur-xs">
      <div
        className={`relative w-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen
            ? 'h-full w-full rounded-none'
            : 'h-full sm:h-[94vh] sm:max-w-4xl sm:rounded-3xl border border-slate-200 dark:border-slate-800'
        }`}
      >
        {/* Modal Header */}
        <div className="bg-[#0e1838] px-4 py-3 text-white flex items-center justify-between gap-2 shadow-md shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Telegram circular icon */}
            <div className="w-8 h-8 rounded-full bg-[#229ED9] flex items-center justify-center text-white shrink-0 shadow-sm">
              <Send className="w-4 h-4 ml-0.5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold truncate">
                  Accade oggi — Canale Telegram @magazine5LB
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  <ShieldCheck className="w-3 h-3" /> Canale Ufficiale
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                Aggiornamenti in tempo reale e notizie flash del giorno
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Reload iframe */}
            <button
              onClick={() => setIframeKey((k) => k + 1)}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
              title="Ricarica canale Telegram"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Direct Open in Telegram App */}
            <a
              href="https://t.me/magazine5LB"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#229ED9] hover:bg-[#1d8bc0] text-white font-medium text-xs shadow-sm transition active:scale-95 cursor-pointer"
              title="Apri direttamente nell'applicazione Telegram"
            >
              <span>Apri nell'app Telegram</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
              title={isFullscreen ? 'Riduci finestra' : 'Schermo intero'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
              title="Chiudi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Embedded Iframe */}
        <div className="relative flex-1 w-full bg-slate-100 dark:bg-slate-950 flex flex-col">
          <iframe
            key={iframeKey}
            src={iframeSrc}
            title="Canale Telegram 5LB Magazine"
            className="w-full flex-1 border-none bg-slate-50 dark:bg-slate-950"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />

          {/* Quick bar at bottom */}
          <div className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 shrink-0">
            <span className="truncate pr-2">
              Segui il canale per non perdere le anticipazioni e gli aggiornamenti biologici.
            </span>
            <a
              href="https://t.me/magazine5LB"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 shrink-0"
            >
              Unisciti al canale <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
