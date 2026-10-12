import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Cookie,
  ShieldCheck,
  ExternalLink,
  Sliders,
  Check,
  X,
  Lock,
  ChevronLeft
} from 'lucide-react';
import {
  CookieConsentSettings,
  getStoredCookieConsent,
  saveCookieConsent
} from '../services/analytics';

interface CookieConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Se true, mostra anche il pulsante di chiusura X (ad esempio quando aperto dal menu impostazioni) */
  isManageMode?: boolean;
}

export const CookieConsentModal: React.FC<CookieConsentModalProps> = ({
  isOpen,
  onClose,
  isManageMode = false,
}) => {
  const [view, setView] = useState<'prompt' | 'customize'>('prompt');
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  // Inizializza lo stato dello switch dalle preferenze memorizzate
  useEffect(() => {
    if (isOpen) {
      const stored = getStoredCookieConsent();
      setAnalyticsEnabled(stored ? stored.analytics : false);
      setView('prompt');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAcceptAll = () => {
    saveCookieConsent(true);
    setAnalyticsEnabled(true);
    onClose();
  };

  const handleRejectAll = () => {
    saveCookieConsent(false);
    setAnalyticsEnabled(false);
    onClose();
  };

  const handleSaveCustom = () => {
    saveCookieConsent(analyticsEnabled);
    onClose();
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-consent-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in"
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
        {/* Intestazione Brand */}
        <div className="bg-[#000836] px-5 py-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-600/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
              <Cookie className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2
                id="cookie-consent-title"
                className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2"
              >
                Informativa sui Cookie
              </h2>
              <span className="text-[11px] text-slate-300 font-medium">
                5LB Magazine • Tutela della Privacy & Trasparenza
              </span>
            </div>
          </div>

          {/* Icona chiusura solo se aperto deliberatamente dal menu impostazioni */}
          {isManageMode && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
              title="Chiudi"
              aria-label="Chiudi"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Contenuto principale */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 text-slate-800 dark:text-slate-200 space-y-4">
          {view === 'prompt' ? (
            /* Vista 1: Banner e Testo principale richiesto */
            <div className="space-y-4 text-sm sm:text-[15px] leading-relaxed">
              <p className="text-slate-700 dark:text-slate-300">
                Utilizziamo cookie tecnici essenziali per far funzionare l'App e cookie
                analitici (Google Analytics) per comprendere come viene utilizzata l'applicazione
                (pagine viste, interazioni e posizione approssimativa) al solo scopo di migliorarne
                le prestazioni. Non utilizziamo cookie di profilazione né pubblicitari.
              </p>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <p>
                  Per saperne di più consulta la nostra{' '}
                  <a
                    href="https://framework.5lb.eu/it/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    <span>Privacy Policy</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  .
                </p>
              </div>
            </div>
          ) : (
            /* Vista 2: Personalizzazione avanzata dei Cookie */
            <div className="space-y-4">
              <button
                onClick={() => setView('prompt')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer mb-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Torna all'informativa generale</span>
              </button>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                Puoi scegliere quali categorie di cookie autorizzare. I cookie tecnici essenziali
                sono sempre attivi per garantire il corretto funzionamento dell'applicazione.
              </p>

              {/* Sezione 1: Cookie tecnici essenziali */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-500" />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Cookie Tecnici Essenziali
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Sempre Attivi
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Necessari per il funzionamento dell'App: gestione delle impostazioni, salvataggio locale degli articoli preferiti, articoli letti, tema grafico chiaro/scuro e funzionamento offline PWA.
                </p>
              </div>

              {/* Sezione 2: Cookie analitici (Google Analytics) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Cookie Analitici (Google Analytics)</span>
                    </h3>
                  </div>

                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={analyticsEnabled}
                      onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-orange-600"></div>
                  </label>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Permettono di comprendere in forma anonima e aggregata le interazioni degli utenti (pagine viste, durata della sessione e posizione approssimativa) al solo scopo di ottimizzare le prestazioni. Non vengono usati cookie pubblicitari né di profilazione.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Barra Pulsanti Inferiore */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
          {view === 'prompt' ? (
            /* Tre pulsanti richiesti: [ Accetta Tutti ] [ Rifiuta ] [ Personalizza ] */
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setView('customize')}
                className="order-3 sm:order-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sliders className="w-4 h-4 text-slate-500" />
                <span>Personalizza</span>
              </button>

              <button
                type="button"
                onClick={handleRejectAll}
                className="order-2 sm:order-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center"
              >
                <span>Rifiuta</span>
              </button>

              <button
                type="button"
                onClick={handleAcceptAll}
                className="order-1 sm:order-3 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-md shadow-orange-600/20 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Accetta Tutti</span>
              </button>
            </div>
          ) : (
            /* Pulsanti nella schermata Personalizza */
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => setView('prompt')}
                className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
              >
                Annulla
              </button>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={handleRejectAll}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Rifiuta Tutti
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="px-4 py-2 rounded-xl border border-orange-500 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 text-xs font-semibold transition cursor-pointer"
                >
                  Accetta Tutti
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustom}
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-orange-600/20 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Salva Preferenze</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
