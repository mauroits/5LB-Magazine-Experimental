import React from 'react';
import { Menu, Bell, Sparkles, Search, X } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { Logo5LB } from './Logo5LB';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenNotebook: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  currentFilterLabel?: string;
  searchPlaceholder?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenNotebook,
  onOpenNotifications,
  unreadNotificationsCount,
  searchQuery,
  onSearchChange,
  currentFilterLabel,
  searchPlaceholder = 'Cerca in questa categoria...',
}) => {
  const [showSearchInput, setShowSearchInput] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 bg-[#0e1838] text-white shadow-md border-b border-slate-800 select-none pt-[env(safe-area-inset-top,0px)] shrink-0">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 h-15 flex items-center justify-between gap-2">
        {/* Left: Mobile hamburger menu + Mobile logo only (hidden on desktop/landscape tablet where sidebar is fixed) */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            aria-label="Apri menu"
            className="p-2 rounded-xl text-slate-200 hover:text-white hover:bg-white/10 active:scale-95 transition cursor-pointer shrink-0 lg:hidden"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Pure official logo: VISIBLE ONLY ON MOBILE (< lg) when sidebar is hidden in off-canvas drawer.
              HIDDEN ON DESKTOP & LANDSCAPE TABLETS (lg+) where the sidebar is fixed and already has the logo at the top */}
          <div className="lg:hidden flex items-center py-0.5">
            <Logo5LB className="h-8 sm:h-9" />
          </div>
        </div>

        {/* Center: Search input on larger screens */}
        <div className="flex-1 max-w-md mx-2 hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl pl-9 pr-8 py-1.5 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Mobile search toggle */}
          <button
            onClick={() => {
              if (showSearchInput && searchQuery) {
                onSearchChange('');
              }
              setShowSearchInput(!showSearchInput);
            }}
            className="p-2 rounded-xl text-slate-200 hover:text-white hover:bg-white/10 active:scale-95 transition md:hidden cursor-pointer"
            title="Cerca"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Chiedi / Google NotebookLM Button */}
          <button
            onClick={onOpenNotebook}
            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs sm:text-sm shadow-md active:scale-95 transition group cursor-pointer"
            title="Chiedi — Domande e ricerca semantica sulle 5 Leggi Biologiche"
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 group-hover:rotate-12 transition-transform shrink-0" />
            <span className="font-semibold tracking-wide">Chiedi</span>
          </button>

          {/* Notification Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl text-slate-200 hover:text-white hover:bg-white/10 active:scale-95 transition cursor-pointer"
            title="Notifiche push e aggiornamenti"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full bg-red-500 text-white font-bold text-[10px] ring-2 ring-[#0e1838] animate-pulse">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* PWA Install Button (always visible on mobile & desktop if not installed, or compact status) */}
          <div className="flex items-center">
            <PWAInstallButton compact />
          </div>
        </div>
      </div>

      {/* Mobile search expandable row */}
      {showSearchInput && (
        <div className="p-2.5 bg-slate-900 border-t border-slate-800 md:hidden animate-in slide-in-from-top-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
