import React, { useState, useRef, useEffect } from 'react';
import { Minus, Plus, X, RotateCcw } from 'lucide-react';
import { ZOOM_PRESETS, DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM } from '../hooks/useInterfaceZoom';

/**
 * Dedicated SVG Icon rendering a magnifying glass containing '-' and '+' symbols.
 */
export const IconZoomLens: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Magnifier lens circle */}
    <circle cx="10" cy="10" r="7.5" />
    {/* Handle */}
    <line x1="21" y1="21" x2="15.5" y2="15.5" />
    {/* Plus horizontal and vertical lines */}
    <line x1="7.5" y1="8" x2="12.5" y2="8" />
    <line x1="10" y1="5.5" x2="10" y2="10.5" />
    {/* Minus horizontal line */}
    <line x1="7.5" y1="13" x2="12.5" y2="13" />
  </svg>
);

interface InterfaceZoomControlProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSetZoom: (level: number) => void;
  onResetZoom: () => void;
  minZoom?: number;
  maxZoom?: number;
}

export const InterfaceZoomControl: React.FC<InterfaceZoomControlProps> = ({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onSetZoom,
  onResetZoom,
  minZoom = MIN_ZOOM,
  maxZoom = MAX_ZOOM,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const isCustom = zoomLevel !== DEFAULT_ZOOM;

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      {/* Trigger Button: small lens -/+ button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`p-1.5 rounded-lg transition cursor-pointer shrink-0 relative ${
          isOpen
            ? 'bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400 ring-1 ring-orange-400/40'
            : isCustom
            ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-950/60'
            : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
        }`}
        title={`Ingrandimento interfaccia (${zoomLevel}%)`}
        aria-label={`Regola livello di ingrandimento dell'interfaccia, attualmente a ${zoomLevel}%`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <IconZoomLens className="w-4 h-4" />
        {isCustom && (
          <span
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-orange-500 ring-2 ring-white dark:ring-slate-900"
            title={`Personalizzato: ${zoomLevel}%`}
          />
        )}
      </button>

      {/* Floating Popover Panel positioned above the button */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Regolazione ingrandimento interfaccia"
          className="absolute bottom-full right-0 mb-2.5 w-64 p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-100 z-50 select-none animate-in fade-in slide-in-from-bottom-2 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900 dark:text-slate-100">
              <IconZoomLens className="w-4 h-4 text-orange-500 shrink-0" />
              <span>Ingrandimento</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Chiudi pannello"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Stepper with Minus / Current percentage / Plus */}
          <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-900/80 p-1.5 rounded-xl mb-2.5">
            <button
              type="button"
              onClick={onZoomOut}
              disabled={zoomLevel <= minZoom}
              className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition active:scale-95"
              title="Riduci ingrandimento (-10%)"
              aria-label="Riduci dimensione interfaccia"
            >
              <Minus className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center">
              <span className="text-base font-bold tabular-nums text-slate-900 dark:text-white leading-tight">
                {zoomLevel}%
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {zoomLevel === DEFAULT_ZOOM
                  ? 'Predefinito'
                  : zoomLevel > DEFAULT_ZOOM
                  ? `+${zoomLevel - DEFAULT_ZOOM}%`
                  : `${zoomLevel - DEFAULT_ZOOM}%`}
              </span>
            </div>

            <button
              type="button"
              onClick={onZoomIn}
              disabled={zoomLevel >= maxZoom}
              className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition active:scale-95"
              title="Aumenta ingrandimento (+10%)"
              aria-label="Aumenta dimensione interfaccia"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Presets */}
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 px-0.5">
            Livelli rapidi
          </div>
          <div className="grid grid-cols-5 gap-1 mb-2">
            {ZOOM_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onSetZoom(preset)}
                className={`py-1 text-xs rounded-lg font-medium transition cursor-pointer active:scale-95 ${
                  zoomLevel === preset
                    ? 'bg-orange-500 text-white shadow-xs font-semibold'
                    : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title={`Imposta ingrandimento a ${preset}%`}
              >
                {preset}%
              </button>
            ))}
          </div>

          {/* Reset button when custom */}
          {isCustom && (
            <button
              type="button"
              onClick={onResetZoom}
              className="w-full mt-1.5 py-1.5 px-2 flex items-center justify-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 rounded-lg transition font-medium cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ripristina standard (100%)</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
