import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  Share2,
  X,
  Check,
  AlertTriangle,
  Copy,
  ExternalLink,
  Smartphone,
  Compass,
} from 'lucide-react';
import { launchInstalledApp } from '../utils/pwaLauncher';

export type PWAInstallModalMode = 'unsupported' | 'ios' | 'ios-redirect' | 'launch' | 'chrome';

interface PWAInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: PWAInstallModalMode;
  browserName?: string;
  isIPad?: boolean;
  onInstalledMarked?: () => void;
  onRetryInstall?: () => void;
}

export const PWAInstallGuideModal: React.FC<PWAInstallGuideModalProps> = ({
  isOpen,
  onClose,
  mode,
  browserName,
  isIPad = false,
  onInstalledMarked,
  onRetryInstall,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleOpenChromeForInstall = () => {
    // Specifically targets Google Chrome on Android without triggering OS browser chooser
    const targetUrl = window.location.href;
    const cleanHostPath = `${window.location.host}${window.location.pathname}${window.location.search}`;

    const googleChromeScheme = `googlechrome://navigate?url=${encodeURIComponent(targetUrl)}`;
    const chromeIntentUrl = `intent://${cleanHostPath}#Intent;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.android.chrome;scheme=https;end`;

    try {
      window.location.href = googleChromeScheme;
      setTimeout(() => {
        window.location.href = chromeIntentUrl;
      }, 300);
    } catch {
      window.location.href = chromeIntentUrl;
    }
  };

  const handleDirectLaunchApp = () => {
    if (onInstalledMarked) onInstalledMarked();
    launchInstalledApp();
  };

  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
  const deviceName = isIPad ? 'iPad' : 'iPhone';

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs overscroll-contain animate-in fade-in">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 -z-10"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Dialog Card: strictly capped in height with flex column structure */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
        className="relative w-full max-w-lg max-h-[90dvh] sm:max-h-[85vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95"
      >
        {/* 1. FIXED HEADER: X button and Title are ALWAYS visible and clickable */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 select-none">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            {mode === 'unsupported' && (
              <div className="p-2 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
            )}
            {mode === 'ios' && (
              <div className="p-2 rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/70 dark:text-orange-400 shrink-0">
                <Download className="w-5 h-5" />
              </div>
            )}
            {mode === 'ios-redirect' && (
              <div className="p-2 rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/70 dark:text-orange-400 shrink-0">
                <Compass className="w-5 h-5" />
              </div>
            )}
            {mode === 'launch' && (
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400 shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
            )}
            {mode === 'chrome' && (
              <div className="p-2 rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/70 dark:text-orange-400 shrink-0">
                <Download className="w-5 h-5" />
              </div>
            )}

            <h3
              id="pwa-install-title"
              className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate"
            >
              {mode === 'unsupported' && `Installazione da ${browserName || 'questo browser'}`}
              {mode === 'ios' && `Installa su ${deviceName} (Safari)`}
              {mode === 'ios-redirect' && `Usa Safari per installare su ${deviceName}`}
              {mode === 'launch' && 'App 5LB Magazine'}
              {mode === 'chrome' && `Installa con ${browserName || 'Google Chrome'}`}
            </h3>
          </div>

          <button
            onClick={onClose}
            aria-label="Chiudi finestra"
            className="p-2 -mr-1 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. SCROLLABLE BODY: Even on large browser font sizes, content scrolls smoothly */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 overscroll-contain">
          {/* CASE A: Android / Desktop Unsupported Browser (Opera, Firefox, etc.) */}
          {mode === 'unsupported' && (
            <>
              {/* Highlight Box */}
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
                <strong>Nota:</strong> Questo browser ({browserName || 'il browser attuale'}) non supporta l'installazione delle Progressive Web App (PWA). L'opzione standard &ldquo;Aggiungi a schermata iniziale&rdquo; crea solo un <em>semplice preferito web</em> privo di avvio autonomo a schermo intero, consultazione offline e notifiche push.
              </div>

              {/* Se l'utente ha già installato l'app sul dispositivo */}
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-blue-950 dark:text-blue-200 text-xs sm:text-sm">
                      Hai già installato l'app sul telefono?
                    </h4>
                    <p className="text-xs text-blue-800 dark:text-blue-300 mt-1 leading-relaxed">
                      Per aprire la vera app a schermo intero, tocca direttamente l'icona <strong>5LB Mag</strong> nella schermata Home o nel cassetto delle applicazioni del tuo dispositivo.
                    </p>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={handleDirectLaunchApp}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm active:scale-95 cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Tenta apertura App</span>
                  </button>
                </div>
              </div>

              {/* Se invece non è ancora installata */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm mb-2">
                  Se non l'hai ancora installata:
                </h4>
                <ol className="space-y-2.5 list-decimal list-inside text-xs leading-relaxed">
                  <li>
                    Tocca il pulsante arancione in basso <strong>&ldquo;Apri in Chrome per procedere all'installazione&rdquo;</strong>.
                  </li>
                  <li>
                    In Chrome comparirà l'opzione per installare con un tocco la <strong>vera App nativa</strong> con lettura offline e notifiche push attive.
                  </li>
                  <li>
                    In alternativa puoi copiare il link per aprirlo manualmente in Chrome o Edge.
                  </li>
                </ol>
              </div>
            </>
          )}

          {/* CASE B: iOS Safari (Official installation flow) */}
          {mode === 'ios' && (
            <>
              <div className="p-3.5 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 text-orange-900 dark:text-orange-200 text-xs leading-relaxed">
                Su <strong>{deviceName}</strong> l'installazione viene eseguita direttamente tramite Safari:
              </div>

              <div className="space-y-3.5 pt-1">
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold text-xs shrink-0 dark:bg-orange-950 dark:text-orange-300">
                    1
                  </span>
                  <p className="text-xs sm:text-sm">
                    Tocca il pulsante <strong className="text-slate-900 dark:text-white">Condividi</strong> (icona del quadrato con la freccia verso l'alto ⎋) {isIPad ? "nella barra superiore di Safari" : "nella barra in basso di Safari"}.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold text-xs shrink-0 dark:bg-orange-950 dark:text-orange-300">
                    2
                  </span>
                  <p className="text-xs sm:text-sm">
                    Scorri le opzioni del foglio di condivisione e seleziona <strong className="text-slate-900 dark:text-white">&ldquo;Aggiungi alla schermata Home&rdquo;</strong> ⊞.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold text-xs shrink-0 dark:bg-orange-950 dark:text-orange-300">
                    3
                  </span>
                  <p className="text-xs sm:text-sm">
                    Tocca <strong className="text-slate-900 dark:text-white">Aggiungi</strong> in alto a destra. L'icona 5LB Magazine apparirà sulla tua schermata Home e si avvierà come app a schermo intero!
                  </p>
                </div>
              </div>
            </>
          )}

          {/* CASE C: iOS Alternative Browser (Chrome, Firefox, Opera on iPad/iPhone) -> REDIRECT TO SAFARI */}
          {mode === 'ios-redirect' && (
            <>
              {/* Highlight Explanation Box */}
              <div className="p-3.5 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-800/60 text-orange-950 dark:text-orange-200 text-xs leading-relaxed">
                <strong>Attenzione:</strong> Stai visualizzando l'app da <strong>{browserName || 'Chrome'}</strong> su {deviceName}.
                Su iOS e iPadOS, per vincoli del sistema operativo Apple, l'aggiunta di vere App alla schermata Home è possibile <strong>esclusivamente tramite il browser Safari</strong>.
                {browserName || 'Chrome'} non ha il supporto per creare icone PWA autonome su questo dispositivo.
              </div>

              {/* Se l'utente l'ha già installata su iPad */}
              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-2">
                <div className="flex items-start gap-2.5">
                  <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-blue-950 dark:text-blue-200 text-xs">
                      Hai già aggiunto 5LB Mag alla schermata Home?
                    </h4>
                    <p className="text-xs text-blue-800 dark:text-blue-300 mt-0.5 leading-relaxed">
                      Esci dal browser e tocca l'icona <strong>5LB Mag</strong> nella schermata Home del tuo {deviceName}.
                    </p>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={handleDirectLaunchApp}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm active:scale-95 cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Tenta apertura App</span>
                  </button>
                </div>
              </div>

              {/* Istruzioni per installare con Safari */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm mb-2.5 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-orange-600" />
                  <span>Come installarla in 3 semplici passi con Safari:</span>
                </h4>

                <ol className="space-y-3 list-decimal list-inside text-xs leading-relaxed">
                  <li>
                    Tocca il pulsante arancione in basso <strong>&ldquo;Copia link per Safari&rdquo;</strong>.
                  </li>
                  <li>
                    Apri l'app <strong>Safari</strong> (l'icona con la bussola blu di Apple) sul tuo {deviceName}.
                  </li>
                  <li>
                    Incolla l'indirizzo nella barra di Safari, tocca il pulsante <strong>Condividi (⎋)</strong> e seleziona <strong>&ldquo;Aggiungi alla schermata Home&rdquo;</strong> ⊞.
                  </li>
                </ol>
              </div>
            </>
          )}

          {/* CASE D: Already Installed, Launch prompt */}
          {mode === 'launch' && (
            <div className="space-y-4 py-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center shadow-inner">
                <Smartphone className="w-7 h-7" />
              </div>

              <div className="text-center space-y-1.5">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  App 5LB Magazine presente sul dispositivo
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto">
                  L'applicazione è presente sul tuo dispositivo. Per usufruire dell'esperienza completa a schermo intero e con notifiche, aprila direttamente dalla schermata Home.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                <p>
                  <strong>Come aprirla:</strong>
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Tocca l'icona con il logo <strong>5LB Mag</strong> sulla tua schermata Home.</li>
                  <li>Puoi anche provare il pulsante qui sotto per richiedere al sistema di aprire l'applicazione.</li>
                </ul>
              </div>
            </div>
          )}

          {/* CASE E: Chrome on Android / Desktop Manual Guide */}
          {mode === 'chrome' && (
            <>
              <div className="p-3.5 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 text-orange-950 dark:text-orange-200 text-xs leading-relaxed">
                Puoi installare <strong>5LB Magazine</strong> come vera applicazione (con lettura offline e notifiche) direttamente da <strong>{browserName || 'Chrome'}</strong>:
              </div>

              <div className="space-y-3.5 pt-1">
                {isAndroid ? (
                  <>
                    <div className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold text-xs shrink-0 dark:bg-orange-950 dark:text-orange-300">
                        1
                      </span>
                      <p className="text-xs sm:text-sm">
                        Tocca il pulsante <strong className="text-slate-900 dark:text-white">Menu (⋮)</strong> con i tre puntini verticali in alto a destra in Chrome.
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold text-xs shrink-0 dark:bg-orange-950 dark:text-orange-300">
                        2
                      </span>
                      <p className="text-xs sm:text-sm">
                        Seleziona la voce <strong className="text-slate-900 dark:text-white">&ldquo;Installa applicazione&rdquo;</strong> (oppure &ldquo;Aggiungi a schermata Home&rdquo;).
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold text-xs shrink-0 dark:bg-orange-950 dark:text-orange-300">
                        3
                      </span>
                      <p className="text-xs sm:text-sm">
                        Tocca <strong className="text-slate-900 dark:text-white">&ldquo;Installa&rdquo;</strong> per confermare. L'icona 5LB Magazine apparirà sulla tua schermata Home!
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold text-xs shrink-0 dark:bg-orange-950 dark:text-orange-300">
                        1
                      </span>
                      <p className="text-xs sm:text-sm">
                        Fai clic sull'icona di installazione <strong className="text-slate-900 dark:text-white">⊕ o Computer</strong> che compare all'estremità destra della barra degli indirizzi di Chrome.
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold text-xs shrink-0 dark:bg-orange-950 dark:text-orange-300">
                        2
                      </span>
                      <p className="text-xs sm:text-sm">
                        In alternativa, apri il menu di Chrome <strong className="text-slate-900 dark:text-white">(⋮)</strong> in alto a destra, seleziona <strong className="text-slate-900 dark:text-white">&ldquo;Salva e condividi&rdquo;</strong> e clicca su <strong className="text-slate-900 dark:text-white">&ldquo;Installa 5LB Magazine&rdquo;</strong>.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* 3. FIXED FOOTER: Buttons are ALWAYS visible and clickable */}
        <div className="shrink-0 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex flex-col gap-2.5">
          {mode === 'unsupported' && (
            <>
              {/* Pulsante primario evidenziato: Apri in Chrome (Android) */}
              {isAndroid && (
                <button
                  onClick={handleOpenChromeForInstall}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95 py-2.5 sm:py-3 px-4 text-xs sm:text-sm font-bold text-white transition shadow-md shadow-orange-600/20 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  <span>Apri in Chrome per procedere all'installazione</span>
                </button>
              )}

              {/* Pulsante secondario: Copia link */}
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 py-2.5 px-4 text-xs font-semibold text-slate-800 dark:text-slate-200 transition cursor-pointer active:scale-95"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Link copiato! Ora incollalo in Chrome</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span>Copia link per Chrome o Edge</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="w-full py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 text-xs font-medium transition cursor-pointer"
              >
                Chiudi
              </button>
            </>
          )}

          {mode === 'chrome' && (
            <>
              {onRetryInstall && (
                <button
                  onClick={() => {
                    onRetryInstall();
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95 py-2.5 sm:py-3 px-4 text-xs sm:text-sm font-bold text-white transition shadow-sm cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Avvia finestra di installazione</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium transition cursor-pointer"
              >
                Ho capito le istruzioni
              </button>
            </>
          )}

          {mode === 'ios' && (
            <>
              <button
                onClick={onClose}
                className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 py-2.5 text-xs font-semibold text-white transition shadow-sm cursor-pointer active:scale-95"
              >
                Ho capito le istruzioni
              </button>
            </>
          )}

          {mode === 'ios-redirect' && (
            <>
              {/* Pulsante primario ben visibile: Copia link per Safari */}
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95 py-2.5 sm:py-3 px-4 text-xs sm:text-sm font-bold text-white transition shadow-md shadow-orange-600/20 cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>✓ Link copiato! Ora incollalo in Safari</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copia link per Safari</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="w-full py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 text-xs font-medium transition cursor-pointer"
              >
                Chiudi
              </button>
            </>
          )}

          {mode === 'launch' && (
            <>
              <button
                onClick={handleDirectLaunchApp}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 py-2.5 text-xs font-semibold text-white transition shadow-sm cursor-pointer active:scale-95"
              >
                <Smartphone className="w-4 h-4" />
                <span>Richiedi apertura all'app di sistema</span>
              </button>

              <button
                onClick={onClose}
                className="w-full py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium transition cursor-pointer"
              >
                Continua nel browser
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
