import React, { useState, useEffect } from 'react';
import { WifiOff, X } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [isDismissed, setIsDismissed] = useState(false);

  // If connection returns, reset dismissal so that future disconnects show the indicator
  useEffect(() => {
    if (isOnline) {
      setIsDismissed(false);
    }
  }, [isOnline]);

  if (isOnline || isDismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-50 flex items-center justify-between gap-3 rounded-2xl bg-amber-600 px-4 py-3 text-sm font-medium text-white shadow-2xl border border-amber-500/40 animate-in fade-in slide-in-from-bottom-2"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-xl bg-amber-700/80 shrink-0">
          <WifiOff className="w-5 h-5 text-amber-100" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-xs uppercase tracking-wider text-amber-100">
            Modalità Offline
          </p>
          <p className="text-xs text-amber-50 leading-snug">
            Sei offline. Stai consultando i contenuti e articoli salvati in cache.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsDismissed(true)}
        className="p-1.5 rounded-xl text-amber-100 hover:text-white hover:bg-amber-700/70 transition cursor-pointer shrink-0"
        title="Chiudi avviso modalità offline"
        aria-label="Chiudi avviso modalità offline"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
