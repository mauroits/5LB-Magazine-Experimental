import React, { useState } from 'react';
import {
  Clock,
  Mail,
  Heart,
  Send,
  ArrowRightCircle,
  Newspaper,
  ZoomIn,
  RotateCw,
  ListCheck,
  AlertTriangle,
  GitFork,
  BookOpen,
  MessageCircle,
  Bookmark,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Info,
  Sparkles,
  Cookie,
  Users,
  Archive,
  X
} from 'lucide-react';
import { NavItem, NavSection, ActiveFilter } from '../types';
import {
  IconDEX,
  IconNeofiti,
  IconCognitivo,
  IconApplicativo,
  IconOperatori,
  IconPresenzaLab,
  IconPresencingCircle,
  IconConsulenza,
  IconFramework,
  IconHameriano,
  IconAndrogyne,
  IconCovid19
} from './CustomIcons';
import { Logo5LB } from './Logo5LB';
import { PWAInstallButton } from './PWAInstallButton';
import { ThemeMode } from '../hooks/useTheme';
import { Sun, Moon, Monitor } from 'lucide-react';
import { openExternalBrowser } from '../utils/browserLauncher';
import { BadgeNavPill } from './BadgeIcon';
import { InterfaceZoomControl } from './InterfaceZoomControl';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sections: NavSection[];
  activeFilter: ActiveFilter;
  onSelectFilter: (filter: ActiveFilter) => void;
  onSelectLink?: (item: NavItem) => void;
  onOpenNotebook: () => void;
  onOpenTelegram: () => void;
  onOpenInfo: () => void;
  onOpenCookieSettings?: () => void;
  onOpenBadgesModal?: () => void;
  unreadCount: number;
  totalCount: number;
  favoritesCount: number;
  todayCount: number;
  categoryCounts: Record<string, number>;
  themeMode: ThemeMode;
  onCycleTheme: () => void;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSetZoom: (level: number) => void;
  onResetZoom: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  sections,
  activeFilter,
  onSelectFilter,
  onSelectLink,
  onOpenNotebook,
  onOpenTelegram,
  onOpenInfo,
  onOpenCookieSettings,
  onOpenBadgesModal,
  unreadCount,
  totalCount,
  favoritesCount,
  todayCount,
  categoryCounts,
  themeMode,
  onCycleTheme,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onSetZoom,
  onResetZoom,
}) => {
  // Collapsed / Expanded states for macrosections (INFORMAZIONE is open by default)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const s of sections) {
      if (s.defaultOpen) {
        initial[s.id] = true;
      }
    }
    return initial;
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const current = prev[sectionId] ?? sections.find((s) => s.id === sectionId)?.defaultOpen ?? false;
      return {
        ...prev,
        [sectionId]: !current,
      };
    });
  };

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'archive':
        return <Archive className="w-5 h-5 text-orange-500" />;
      case 'clock':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'users':
        return <Users className="w-5 h-5 text-black dark:text-white" />;
      case 'mail':
        return <Mail className="w-5 h-5 text-emerald-500" />;
      case 'heart':
        return <Heart className="w-5 h-5 text-slate-800 dark:text-slate-200 fill-current" />;
      case 'send':
        return <Send className="w-5 h-5 text-slate-800 dark:text-slate-200 fill-current" />;
      case 'arrow-right-circle':
        return <ArrowRightCircle className="w-5 h-5 text-slate-800 dark:text-slate-200" />;
      case 'newspaper':
        return <Newspaper className="w-5 h-5 text-slate-800 dark:text-slate-200" />;
      case 'search-plus':
        return <ZoomIn className="w-5 h-5 text-slate-800 dark:text-slate-200" />;
      case 'repeat':
        return <RotateCw className="w-5 h-5 text-slate-800 dark:text-slate-200" />;
      case 'message-square-check':
        return <ListCheck className="w-5 h-5 text-slate-800 dark:text-slate-200" />;
      case 'alert-triangle':
        return <AlertTriangle className="w-5 h-5 text-slate-800 dark:text-slate-200 fill-current" />;
      case 'git-fork':
        return <GitFork className="w-5 h-5 text-slate-800 dark:text-slate-200" />;
      case 'book-open':
        return <BookOpen className="w-5 h-5 text-slate-800 dark:text-slate-200" />;
      case 'message-circle':
        return <MessageCircle className="w-5 h-5 text-slate-800 dark:text-slate-200" />;
      case 'hash-7':
        return (
          <div className="w-5 h-5 border-2 border-slate-800 dark:border-slate-200 rounded flex items-center justify-center font-bold text-xs text-slate-800 dark:text-slate-200">
            7
          </div>
        );
      case 'bookmark':
        return <Bookmark className="w-5 h-5 text-slate-800 dark:text-slate-200 stroke-[1.75]" />;
      case 'custom-dex':
        return <IconDEX className="w-6 h-6" />;
      case 'custom-neofiti':
        return <IconNeofiti className="w-6 h-5" />;
      case 'custom-cognitivo':
        return <IconCognitivo className="w-6 h-5" />;
      case 'custom-applicativo':
        return <IconApplicativo className="w-6 h-5" />;
      case 'custom-operatori':
        return <IconOperatori className="w-6 h-5" />;
      case 'custom-presenzalab':
        return <IconPresenzaLab className="w-5 h-5" />;
      case 'custom-presencing-circle':
        return <IconPresencingCircle className="w-5 h-5" />;
      case 'custom-consulenza':
        return <IconConsulenza className="w-6 h-6" />;
      case 'custom-framework':
        return <IconFramework className="w-8 h-5" />;
      case 'custom-hameriano':
        return <IconHameriano className="w-5 h-5" />;
      case 'custom-androgyne':
        return <IconAndrogyne className="w-5 h-5" />;
      case 'custom-covid19':
        return <IconCovid19 className="w-5 h-5" />;
      default:
        return <Bookmark className="w-5 h-5 text-slate-800 dark:text-slate-200" />;
    }
  };

  // Check if item is currently active
  const isItemActive = (item: NavItem) => {
    if (item.type === 'filter') {
      if (item.id === 'filter-ultime') return activeFilter.type === 'quick' && activeFilter.id === 'all';
      if (item.id === 'filter-non-letto') return activeFilter.type === 'quick' && activeFilter.id === 'unread';
      if (item.id === 'filter-ti-piace') return activeFilter.type === 'quick' && activeFilter.id === 'favorites';
      if (item.id === 'filter-accade-oggi') return activeFilter.type === 'quick' && activeFilter.id === 'today';
    }
    if (item.type === 'rss' && item.rssCategory) {
      return activeFilter.type === 'rss' && activeFilter.category === item.rssCategory;
    }
    return false;
  };

  const handleItemClick = (item: NavItem) => {
    if (item.type === 'filter') {
      if (item.id === 'filter-accade-oggi') onSelectFilter({ type: 'quick', id: 'today' });
      else if (item.id === 'filter-ultime') onSelectFilter({ type: 'quick', id: 'all' });
      else if (item.id === 'filter-non-letto') onSelectFilter({ type: 'quick', id: 'unread' });
      else if (item.id === 'filter-ti-piace') onSelectFilter({ type: 'quick', id: 'favorites' });
      onClose();
    } else if (item.type === 'rss') {
      onSelectFilter({
        type: 'rss',
        category: item.rssCategory || item.label,
        label: item.label,
      });
      onClose();
    } else if (item.type === 'link') {
      if (onSelectLink) {
        onSelectLink(item);
      } else if (item.targetUrl) {
        openExternalBrowser(item.targetUrl);
      }
      onClose();
    }
  };

  // Get badge count for RSS item
  const getItemBadge = (item: NavItem) => {
    // Il numero a lato di Accade oggi deve essere rimosso
    if (item.id === 'filter-accade-oggi') return undefined;
    if (item.id === 'filter-ultime') return totalCount || undefined;
    if (item.id === 'filter-non-letto') return unreadCount || undefined;
    if (item.id === 'filter-ti-piace') return favoritesCount || undefined;

    if (item.type === 'rss' && item.rssCategory) {
      const target = item.rssCategory.toLowerCase();
      for (const [catName, count] of Object.entries(categoryCounts)) {
        if (catName.toLowerCase() === target || catName.toLowerCase().includes(target)) {
          return count;
        }
      }
    }
    return undefined;
  };

  return (
    <>
      {/* Backdrop overlay on mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity lg:hidden"
        />
      )}

      {/* Slide-out Sidebar Drawer on mobile / Stationary Full-Height Sidebar reaching the top on desktop & landscape tablet (lg+) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-80 max-w-[85vw] lg:static lg:z-20 lg:w-72 xl:w-80 lg:h-screen lg:shrink-0 lg:translate-x-0 bg-white dark:bg-slate-900 shadow-2xl lg:shadow-none flex flex-col border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Drawer Header (Official 5LB Logo at the very top of the page) */}
        <div className="relative bg-[#0e1838] px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-4 text-white shadow-md border-b border-slate-800/80 shrink-0">
          <div className="flex items-center justify-between">
            {/* Official Logo rendered clean without duplicate headers */}
            <Logo5LB className="h-8 sm:h-9" />

            <div className="flex items-center gap-1">
              <button
                onClick={onOpenInfo}
                title="Informazioni sull'App"
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <Info className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition lg:hidden cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Chiedi button in sidebar header */}
          <button
            onClick={() => {
              onOpenNotebook();
              onClose();
            }}
            className="mt-3.5 w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600/90 to-indigo-600/90 hover:from-blue-600 hover:to-indigo-600 text-white shadow-sm transition group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform shrink-0" />
              <span className="text-xs font-semibold tracking-wide">Chiedi a 5LB Magazine</span>
            </div>
          </button>
        </div>

        {/* Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto overscroll-y-contain divide-y divide-slate-100 dark:divide-slate-800/60 select-none pb-6">
          {/* Quick Filters Section */}
          <div className="py-2">
            {[
              { id: 'filter-accade-oggi', label: 'Accade oggi', icon: 'users', color: 'text-black dark:text-white' },
              { id: 'filter-ultime', label: 'Il mio archivio', icon: 'archive', color: 'text-orange-600' },
              { id: 'filter-non-letto', label: 'Non letto', icon: 'mail', color: 'text-emerald-600' },
              { id: 'filter-ti-piace', label: 'Salvati per dopo', icon: 'heart', color: 'text-slate-900 dark:text-white' },
            ].map((f) => {
              const item: NavItem = {
                id: f.id,
                label: f.label,
                type: 'filter',
                iconName: f.icon,
              };
              const active = isItemActive(item);
              const badge = getItemBadge(item);

              if (f.id === 'filter-ultime') {
                return (
                  <div
                    key={f.id}
                    className={`w-full flex items-center justify-between px-5 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                      active ? 'bg-orange-50/80 dark:bg-orange-950/30 font-semibold' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleItemClick(item)}
                      className="flex-1 flex items-center gap-4 text-left cursor-pointer min-w-0 py-0.5"
                    >
                      <span className="w-6 flex items-center justify-center shrink-0">
                        {renderIcon(f.icon)}
                      </span>
                      <span
                        className={`text-[0.9375rem] font-medium truncate ${
                          active
                            ? 'text-orange-600 dark:text-orange-400 font-semibold'
                            : f.color
                        }`}
                      >
                        {f.label}
                      </span>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {typeof badge === 'number' && badge > 0 && (
                        <button
                          type="button"
                          onClick={() => handleItemClick(item)}
                          className="text-sm font-semibold tabular-nums text-orange-600 dark:text-orange-400 cursor-pointer hover:underline"
                        >
                          {badge}
                        </button>
                      )}
                      <BadgeNavPill
                        totalArticles={totalCount}
                        onClick={() => {
                          if (onOpenBadgesModal) {
                            onOpenBadgesModal();
                          }
                        }}
                      />
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={`w-full flex items-center justify-between px-5 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${
                    active ? 'bg-orange-50/80 dark:bg-orange-950/30 font-semibold' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="w-6 flex items-center justify-center shrink-0">
                      {renderIcon(f.icon)}
                    </span>
                    <span
                      className={`text-[0.9375rem] font-medium ${
                        f.id === 'filter-accade-oggi'
                          ? 'text-black dark:text-white font-semibold'
                          : active
                          ? 'text-orange-600 dark:text-orange-400 font-semibold'
                          : f.color
                      }`}
                    >
                      {f.label}
                    </span>
                  </div>
                  {typeof badge === 'number' && badge > 0 ? (
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        f.id === 'filter-accade-oggi'
                          ? 'text-sky-600 dark:text-sky-400 font-bold'
                          : f.id === 'filter-non-letto'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Macrosections (Accordion collapsible) */}
          {sections.map((section) => {
            const isSectionOpen = expandedSections[section.id] ?? section.defaultOpen ?? false;

            return (
              <div key={section.id} className="py-2">
                {/* Section Header with toggle */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-5 py-2.5 text-left text-xs font-bold tracking-wider text-slate-800 dark:text-slate-200 uppercase hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group cursor-pointer"
                >
                  <span className="tracking-widest font-extrabold">{section.title}</span>
                  <span className="p-0.5 rounded text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">
                    {isSectionOpen ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </span>
                </button>

                {/* Section Items */}
                {isSectionOpen && (
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const active = isItemActive(item);
                      const badge = getItemBadge(item);

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleItemClick(item)}
                          className={`w-full flex items-center justify-between px-5 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50 group cursor-pointer ${
                            active
                              ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-semibold border-r-4 border-orange-500'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0 pr-2">
                            <span className="w-6 flex items-center justify-center shrink-0">
                              {renderIcon(item.iconName)}
                            </span>
                            <span className="text-[0.90625rem] truncate font-medium group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                              {item.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* If external link, display subtle link indicator */}
                            {item.type === 'link' && (
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-500 transition-colors" />
                            )}
                            {/* RSS badge count */}
                            {typeof badge === 'number' && badge > 0 && (
                              <span className="text-sm font-semibold tabular-nums text-slate-600 dark:text-slate-400">
                                {badge}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* PWA Install / Status Indicator LED in sidebar (App Attiva <-> APP OFFLINE) */}
        <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200/80 dark:border-slate-800/80 shrink-0">
          <PWAInstallButton />
        </div>

        {/* Bottom Drawer Footer: Info page link + Cookie settings + Theme switch */}
        <div className="p-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 gap-1.5 shrink-0">
          <div className="flex items-center gap-1 min-w-0">
            <button
              onClick={() => {
                onOpenInfo();
                onClose();
              }}
              className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition cursor-pointer truncate"
              title="Informazioni sull'App e Privacy"
            >
              <Info className="w-4 h-4 text-orange-500 shrink-0" />
              <span className="truncate">Info</span>
            </button>

            {onOpenCookieSettings && (
              <button
                onClick={() => {
                  onOpenCookieSettings();
                  onClose();
                }}
                className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition cursor-pointer truncate"
                title="Gestisci preferenze cookie"
              >
                <Cookie className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="truncate">Cookie</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Regolazione Ingrandimento Interfaccia (Lente -/+) */}
            <InterfaceZoomControl
              zoomLevel={zoomLevel}
              onZoomIn={onZoomIn}
              onZoomOut={onZoomOut}
              onSetZoom={onSetZoom}
              onResetZoom={onResetZoom}
            />

            {/* Pulsante Tema (Chiaro / Scuro / Sistema) */}
            <button
              onClick={onCycleTheme}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer shrink-0"
              title={
                themeMode === 'system'
                  ? 'Tema: Sistema'
                  : themeMode === 'light'
                  ? 'Tema: Chiaro'
                  : 'Tema: Scuro'
              }
            >
              {themeMode === 'system' ? (
                <Monitor className="w-4 h-4" />
              ) : themeMode === 'light' ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
