import { useEffect, useState, useCallback } from 'react';
import {
  isRunningStandalone,
  clearLegacyInstalledFlags,
  detectInstalledRelatedApps,
  launchInstalledApp,
} from '../utils/pwaLauncher';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface BrowserEnvironment {
  isStandalone: boolean;
  isIOS: boolean;
  isIPad: boolean;
  isIPhone: boolean;
  isIOSSafari: boolean;
  isIOSOtherBrowser: boolean;
  isAndroid: boolean;
  isChromium: boolean;
  isOpera: boolean;
  isFirefox: boolean;
  isUnsupported: boolean;
  browserName: string;
}

export function getBrowserEnv(): BrowserEnvironment {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isStandalone: false,
      isIOS: false,
      isIPad: false,
      isIPhone: false,
      isIOSSafari: false,
      isIOSOtherBrowser: false,
      isAndroid: false,
      isChromium: false,
      isOpera: false,
      isFirefox: false,
      isUnsupported: false,
      browserName: '',
    };
  }

  const isStandalone = isRunningStandalone();
  const ua = (navigator.userAgent || '').toLowerCase();
  const platform = ((navigator as unknown as { platform?: string }).platform || '').toLowerCase();
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  // iPad detection:
  // 1. Traditional iPad user-agent containing "ipad"
  // 2. Modern iPadOS 13+ to 18.7+ Safari/Browsers desktop UA (contains "macintosh", platform "macintel", maxTouchPoints > 1)
  const isIPad =
    /ipad/i.test(ua) ||
    ((platform === 'macintel' || /macintosh/i.test(ua)) && maxTouchPoints > 1);

  const isIPhone = /iphone|ipod/i.test(ua);
  const isIOS = isIPad || isIPhone;

  const isAndroid = /android/i.test(ua);
  const isOpera = /opr\/|opera|opt\//i.test(ua);
  const isFirefox = /firefox|fxios/i.test(ua);
  const isChromeIOS = /crios/i.test(ua);
  const isEdgeIOS = /edgios/i.test(ua);

  // Third-party browsers on iOS (Chrome CriOS, Firefox FxiOS, Opera, Edge, etc.)
  const isNonSafariIOS = isChromeIOS || isFirefox || isOpera || isEdgeIOS || /duckduckgo|brave/i.test(ua);

  // Safari on iOS / iPadOS: has "safari" & "version/" and is not one of the third-party browsers
  const isIOSSafari = isIOS && /version\/.*safari/i.test(ua) && !isNonSafariIOS;
  const isIOSOtherBrowser = isIOS && !isIOSSafari;

  // Chromium check for Android & Desktop
  const isChromium =
    (/chrome|edg\//i.test(ua) || Boolean((window as unknown as { chrome?: unknown }).chrome)) &&
    !isOpera &&
    !isFirefox &&
    !isIOS;

  let isUnsupported = false;
  let browserName = '';

  if (isIOS) {
    if (isChromeIOS) {
      browserName = 'Chrome';
    } else if (isFirefox) {
      browserName = 'Firefox';
    } else if (isOpera) {
      browserName = 'Opera';
    } else if (isEdgeIOS) {
      browserName = 'Edge';
    } else if (isIOSSafari) {
      browserName = 'Safari';
    } else {
      browserName = 'questo browser';
    }
  } else if (isAndroid) {
    if (isOpera) {
      isUnsupported = true;
      browserName = 'Opera';
    } else if (isFirefox) {
      isUnsupported = true;
      browserName = 'Firefox';
    } else if (!isChromium) {
      isUnsupported = true;
      browserName = 'questo browser';
    } else {
      browserName = 'Chrome';
    }
  } else {
    // Desktop or other
    if (isOpera) {
      isUnsupported = true;
      browserName = 'Opera';
    } else if (isFirefox) {
      isUnsupported = true;
      browserName = 'Firefox';
    } else if (!isChromium && !isIOSSafari) {
      isUnsupported = true;
      browserName = 'questo browser';
    }
  }

  return {
    isStandalone,
    isIOS,
    isIPad,
    isIPhone,
    isIOSSafari,
    isIOSOtherBrowser,
    isAndroid,
    isChromium,
    isOpera,
    isFirefox,
    isUnsupported,
    browserName,
  };
}

export function usePWAInstall() {
  const initial = getBrowserEnv();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(initial.isStandalone);
  const [isInstalledOnDevice, setIsInstalledOnDevice] = useState(false);
  const [env, setEnv] = useState<BrowserEnvironment>(initial);

  useEffect(() => {
    // Clear any obsolete localStorage flags that previously caused false "installed" status
    clearLegacyInstalledFlags();

    const currentEnv = getBrowserEnv();
    setEnv(currentEnv);
    setIsStandalone(currentEnv.isStandalone);

    // Controlla se prima-install-prompt è stato catturato presto in index.html
    const earlyPrompt = (window as unknown as { __pwaDeferredPrompt?: BeforeInstallPromptEvent }).__pwaDeferredPrompt;
    if (earlyPrompt) {
      setDeferredPrompt(earlyPrompt);
      setIsInstalledOnDevice(false);
    }

    // Check Chrome/Android installed related apps API
    detectInstalledRelatedApps().then((installed) => {
      if (installed) {
        setIsInstalledOnDevice(true);
      }
    });

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      (window as unknown as { __pwaDeferredPrompt?: BeforeInstallPromptEvent }).__pwaDeferredPrompt = e as BeforeInstallPromptEvent;
      // If beforeinstallprompt fired, the browser confirms the app is NOT installed
      setIsInstalledOnDevice(false);
    };

    const handleEarlyCustomEvent = (e: Event) => {
      const customEvt = e as CustomEvent<BeforeInstallPromptEvent>;
      if (customEvt.detail) {
        setDeferredPrompt(customEvt.detail);
        setIsInstalledOnDevice(false);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalledOnDevice(true);
      setDeferredPrompt(null);
      (window as unknown as { __pwaDeferredPrompt?: null }).__pwaDeferredPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('5lb:beforeinstallprompt', handleEarlyCustomEvent);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('5lb:beforeinstallprompt', handleEarlyCustomEvent);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    const promptToUse =
      deferredPrompt ||
      (window as unknown as { __pwaDeferredPrompt?: BeforeInstallPromptEvent }).__pwaDeferredPrompt;

    if (!promptToUse) return false;

    try {
      await promptToUse.prompt();
      const { outcome } = await promptToUse.userChoice;
      if (outcome === 'accepted') {
        setIsInstalledOnDevice(true);
        setDeferredPrompt(null);
        (window as unknown as { __pwaDeferredPrompt?: null }).__pwaDeferredPrompt = null;
        return true;
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
    return false;
  };

  const launchApp = useCallback(() => {
    launchInstalledApp();
  }, []);

  // When beforeinstallprompt is active, the app is definitely installable
  const isInstallable = Boolean(deferredPrompt);

  // If in standalone mode, the app is running as an installed PWA
  // If not standalone, isInstalled reflects verified OS installation (related apps or recent install)
  const isInstalled = isStandalone || (!isInstallable && isInstalledOnDevice);

  return {
    isInstallable,
    isStandalone,
    isInstalled,
    isInstalledOnDevice,
    isChromium: env.isChromium,
    isIOS: env.isIOS,
    isIPad: env.isIPad,
    isIPhone: env.isIPhone,
    isIOSSafari: env.isIOSSafari,
    isIOSOtherBrowser: env.isIOSOtherBrowser,
    isAndroid: env.isAndroid,
    isOpera: env.isOpera,
    isFirefox: env.isFirefox,
    isUnsupportedBrowser: env.isUnsupported,
    unsupportedBrowserName: env.browserName,
    install,
    launchApp,
  };
}
