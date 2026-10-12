import React, { useState } from 'react';
import { Download, Share2, Check, AlertTriangle, Smartphone, WifiOff } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { PWAInstallGuideModal, PWAInstallModalMode } from './PWAInstallGuideModal';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const isOnline = useOnlineStatus();
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

  const [activeModal, setActiveModal] = useState<PWAInstallModalMode | null>(null);

  // 0. Offline status: Replaces "App Attiva" in the sidebar with "APP OFFLINE" LED
  if (!isOnline) {
    if (compact) {
      return (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-100 dark:bg-amber-950/80 dark:text-amber-300 rounded-xl border border-amber-300 dark:border-amber-800"
          title="App Offline — Navigazione da cache locale"
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span className="font-bold tracking-wider text-[11px]">OFFLINE</span>
        </div>
      );
    }

    return (
      <div
        className="flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-50 dark:bg-amber-950/70 dark:text-amber-300 rounded-xl border border-amber-300 dark:border-amber-800 shadow-xs"
        title="Dispositivo offline — Stai consultando i contenuti e articoli salvati in cache"
      >
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          <span className="font-bold tracking-wider uppercase">APP OFFLINE</span>
        </div>
        <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
      </div>
    );
  }

  // 1. Running inside the installed native PWA window (Standalone) - Online & Active
  if (isStandalone) {
    if (compact) return null;
    return (
      <div
        className="flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 dark:bg-emerald-950/70 dark:text-emerald-300 rounded-xl border border-emerald-300 dark:border-emerald-800 shadow-xs"
        title="Applicazione PWA attiva e sincronizzata con magazine.5lb.eu"
      >
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-bold tracking-wide">App Attiva</span>
        </div>
        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
      </div>
    );
  }

  // 2. Running in a browser, but the app is verified as already installed on the system
  if (isInstalled && !isInstallable) {
    return (
      <>
        <button
          onClick={() => setActiveModal('launch')}
          className={`flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-sm transition active:scale-95 cursor-pointer ${
            compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs sm:text-sm w-full justify-center'
          }`}
          title="Apri l'app 5LB Magazine installata sul dispositivo"
        >
          <Smartphone className="w-4 h-4" />
          <span>Apri App</span>
        </button>

        <PWAInstallGuideModal
          isOpen={activeModal !== null}
          onClose={() => setActiveModal(null)}
          mode="launch"
          browserName={unsupportedBrowserName}
          isIPad={isIPad}
        />
      </>
    );
  }

  // 3. Chromium / Android / Desktop flow (Standard beforeinstallprompt)
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-sm transition active:scale-95 cursor-pointer ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs sm:text-sm w-full justify-center'
        }`}
        title="Installa l'app 5LB Magazine sul dispositivo"
      >
        <Download className="w-4 h-4" />
        <span>Installa App</span>
      </button>
    );
  }

  // 4. iOS Safari flow (Official Apple PWA installation via Share sheet)
  if (isIOS && isIOSSafari) {
    const label = compact
      ? 'Installa'
      : isIPad
      ? 'Installa su iPad'
      : 'Installa su iPhone';

    return (
      <>
        <button
          onClick={() => setActiveModal('ios')}
          className={`flex items-center gap-1.5 rounded-xl border border-orange-500/30 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40 dark:text-orange-400 font-medium transition active:scale-95 cursor-pointer ${
            compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs sm:text-sm w-full justify-center'
          }`}
          title={`Istruzioni per installare su ${isIPad ? 'iPad' : 'iPhone'} con Safari`}
        >
          <Share2 className="w-4 h-4" />
          <span>{label}</span>
        </button>

        <PWAInstallGuideModal
          isOpen={activeModal === 'ios'}
          onClose={() => setActiveModal(null)}
          mode="ios"
          browserName="Safari"
          isIPad={isIPad}
        />
      </>
    );
  }

  // 5. iOS Alternative Browser flow (Chrome, Firefox, Opera on iPad or iPhone -> must redirect to Safari)
  if (isIOS && isIOSOtherBrowser) {
    const label = compact ? 'Installa' : 'Installa (Usa Safari)';

    return (
      <>
        <button
          onClick={() => setActiveModal('ios-redirect')}
          className={`flex items-center gap-1.5 rounded-xl border border-orange-500/30 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40 dark:text-orange-400 font-medium transition active:scale-95 cursor-pointer ${
            compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs sm:text-sm w-full justify-center'
          }`}
          title={`Su ${isIPad ? 'iPad' : 'iPhone'} usa Safari per installare l'app`}
        >
          <Share2 className="w-4 h-4 text-orange-500" />
          <span>{label}</span>
        </button>

        <PWAInstallGuideModal
          isOpen={activeModal === 'ios-redirect'}
          onClose={() => setActiveModal(null)}
          mode="ios-redirect"
          browserName={unsupportedBrowserName}
          isIPad={isIPad}
        />
      </>
    );
  }

  // 6. Unsupported Browser flow on Android or Desktop (Opera, Firefox, etc.)
  if (isUnsupportedBrowser) {
    return (
      <>
        <button
          onClick={() => setActiveModal('unsupported')}
          className={`flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-sm transition active:scale-95 cursor-pointer ${
            compact ? 'px-2 py-1 sm:px-2.5 sm:py-1.5 text-xs' : 'px-3 py-2 text-xs sm:text-sm w-full justify-center'
          }`}
          title={`Istruzioni installazione PWA da ${unsupportedBrowserName || 'questo browser'}`}
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Installa App</span>
        </button>

        <PWAInstallGuideModal
          isOpen={activeModal === 'unsupported'}
          onClose={() => setActiveModal(null)}
          mode="unsupported"
          browserName={unsupportedBrowserName}
          isIPad={isIPad}
        />
      </>
    );
  }

  return null;
};
