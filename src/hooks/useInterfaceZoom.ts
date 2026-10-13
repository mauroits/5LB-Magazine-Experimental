import { useState, useEffect, useCallback } from 'react';

export const ZOOM_STORAGE_KEY = '5lb_interface_zoom_v1';
export const DEFAULT_ZOOM = 100;
export const MIN_ZOOM = 80;
export const MAX_ZOOM = 140;
export const ZOOM_STEP = 10;
export const ZOOM_PRESETS = [90, 100, 110, 120, 130] as const;

export function useInterfaceZoom() {
  const [zoomLevel, setZoomLevelState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(ZOOM_STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_ZOOM && parsed <= MAX_ZOOM) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_ZOOM;
  });

  const applyZoom = useCallback((level: number) => {
    if (typeof document !== 'undefined') {
      // Scaling root font-size scales all rem units across typography and layouts uniformly
      // without breaking iOS PWA fixed-position coordinates, safe areas or touch targets
      document.documentElement.style.fontSize = `${level}%`;
      document.documentElement.style.setProperty('--app-interface-zoom', `${level / 100}`);
    }
  }, []);

  const setZoom = useCallback(
    (level: number) => {
      const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(level)));
      setZoomLevelState(clamped);
      try {
        localStorage.setItem(ZOOM_STORAGE_KEY, clamped.toString());
      } catch {
        // ignore
      }
      applyZoom(clamped);
    },
    [applyZoom]
  );

  const zoomIn = useCallback(() => {
    setZoom(zoomLevel + ZOOM_STEP);
  }, [zoomLevel, setZoom]);

  const zoomOut = useCallback(() => {
    setZoom(zoomLevel - ZOOM_STEP);
  }, [zoomLevel, setZoom]);

  const resetZoom = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
  }, [setZoom]);

  // Apply on mount and sync if changed
  useEffect(() => {
    applyZoom(zoomLevel);
  }, [zoomLevel, applyZoom]);

  return {
    zoomLevel,
    zoomIn,
    zoomOut,
    setZoom,
    resetZoom,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    isCustomZoom: zoomLevel !== DEFAULT_ZOOM,
  };
}
