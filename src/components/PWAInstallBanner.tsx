import React, { useState } from 'react';
import { Download, X, Smartphone, Globe, AlertTriangle, ArrowRight, Compass, Share2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallGuideModal, PWAInstallModalMode } from './PWAInstallGuideModal';

export const PWAInstallBanner: React.FC = () => {
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

  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('5lb_dismiss_pwa_banner') === 'true';
    } catch {
      return false;
    }
  });

  const [activeModal, setActiveModal] = useState<PWAInstallModalMode | null>(null);

  // If already running inside standalone native PWA or dismissed for this browser session, hide banner
  if (isStandalone || isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('5lb_dismiss_pwa_banner', 'true');
    } catch {
      // ignore
    }
  };

  const deviceName = isIPad ? 'iPad' : 'iPhone';

  const handleActionClick = async () => {
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
  };

  // Case A: User has the app installed on their system, but opened a link in a browser
  if (isInstalled && !isInstallable) {
    return (
      <>
        <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-3 right-3 sm:left-auto sm:right-4 z-40 max-w-md bg-[#0e1838] text-white p-4 rounded-3xl shadow-2xl border border-blue-500/40 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center shrink-0 text-blue-400">
              <Globe className="w-5 h-5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5">
                <span>Stai usando il browser</span>
              </h4>
              <p className="text-[11px] text-slate-300 truncate">
                Tocca per aprire l’App nativa a schermo intero
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleActionClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs shadow-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition active:scale-95 cursor-pointer"
            >
              <span>Apri App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleDismiss}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 active:bg-white/45 text-white border border-white/40 flex items-center justify-center shrink-0 shadow-md transition active:scale-90 cursor-pointer"
              title="Continua nel browser"
              aria-label="Chiudi avviso"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

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

  // Case B: Not installed yet
  // Determine banner copy & styling based on device and browser
  let bannerTitle = 'Stai usando la versione browser';
  let bannerSubtitle = "Installa l'App per lettura offline e notifiche push";
  let buttonText = 'Installa App';
  let ButtonIcon = Download;
  let isAlertStyle = false;

  if (isIOS && isIOSOtherBrowser) {
    bannerTitle = `Stai usando ${unsupportedBrowserName || 'Chrome'} su ${deviceName}`;
    bannerSubtitle = "Su iOS per installare l'app è necessario usare Safari";
    buttonText = 'Usa Safari';
    ButtonIcon = Compass;
    isAlertStyle = true;
  } else if (isIOS && isIOSSafari) {
    bannerTitle = `Stai usando Safari su ${deviceName}`;
    bannerSubtitle = "Aggiungi l'app alla schermata Home per averla a schermo intero";
    buttonText = 'Installa App';
    ButtonIcon = Share2;
  } else if (isUnsupportedBrowser) {
    bannerTitle = `Stai usando la versione browser (${unsupportedBrowserName || 'alternativo'})`;
    bannerSubtitle = "Installa l'App per lettura offline e notifiche push";
    buttonText = 'Info App';
    ButtonIcon = AlertTriangle;
    isAlertStyle = true;
  }

  return (
    <>
      <div className={`fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-3 right-3 sm:left-auto sm:right-4 z-40 max-w-md bg-[#0e1838] text-white p-4 rounded-3xl shadow-2xl border ${
        isAlertStyle ? 'border-amber-500/40' : 'border-orange-500/30'
      } flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-2xl ${
            isAlertStyle ? 'bg-amber-600/20 border border-amber-500/40 text-amber-400' : 'bg-orange-600/20 border border-orange-500/40 text-orange-400'
          } flex items-center justify-center shrink-0`}>
            {isAlertStyle ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Smartphone className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-white truncate">
              {bannerTitle}
            </h4>
            <p className="text-[11px] text-slate-300 truncate">
              {bannerSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleActionClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs shadow-sm transition active:scale-95 cursor-pointer ${
              isAlertStyle
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-orange-600 hover:bg-orange-700 text-white'
            }`}
          >
            <ButtonIcon className="w-3.5 h-3.5" />
            <span>{buttonText}</span>
          </button>

          <button
            onClick={handleDismiss}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 active:bg-white/45 text-white border border-white/40 flex items-center justify-center shrink-0 shadow-md transition active:scale-90 cursor-pointer"
            title="Non ora"
            aria-label="Chiudi avviso"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      <PWAInstallGuideModal
        isOpen={activeModal !== null}
        onClose={() => setActiveModal(null)}
        mode={activeModal || 'unsupported'}
        browserName={unsupportedBrowserName}
        isIPad={isIPad}
        onRetryInstall={install}
      />
    </>
  );
};
