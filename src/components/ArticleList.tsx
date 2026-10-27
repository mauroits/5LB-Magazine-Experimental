import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Heart,
  Share2,
  CheckCircle2,
  Circle,
  ExternalLink,
  BookOpen,
  Filter,
  LayoutGrid,
  List,
  X,
  CheckCheck,
  Shuffle,
  ArrowDownCircle,
  Globe,
  Search,
  WifiOff,
  RotateCw,
} from 'lucide-react';
import { BloggerPost, ActiveFilter } from '../types';
import { formatItalianDate } from '../services/bloggerFeed';
import { toHttpsUrl } from '../utils/safeUrl';
import { decodeHtmlEntities } from '../utils/textUtils';
import { ArchiveBadgeButton } from './BadgeIcon';
import { getCurrentBadge } from '../services/badgeService';

interface ArticleListProps {
  posts: BloggerPost[];
  totalArchiveArticles?: number;
  isLoading: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadError?: boolean;
  onRetry?: () => void;
  activeFilter: ActiveFilter;
  filterTitle: string;
  searchQuery?: string;
  isSearchingOnline?: boolean;
  onSearchOnline?: (q: string) => void;
  onSearchAllArticles?: () => void;
  onSelectPost: (post: BloggerPost) => void;
  onToggleFavorite: (postId: string, e: React.MouseEvent) => void;
  onToggleRead: (postId: string, e: React.MouseEvent) => void;
  onResetFilter: () => void;
  onOpenNotebook?: () => void;
  onMarkAllAsRead?: () => void;
  onOpenBadgesModal?: () => void;
}

export const ArticleList: React.FC<ArticleListProps> = ({
  posts,
  totalArchiveArticles,
  isLoading,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  loadError = false,
  onRetry,
  activeFilter,
  filterTitle,
  searchQuery = '',
  isSearchingOnline = false,
  onSearchOnline,
  onSearchAllArticles,
  onSelectPost,
  onToggleFavorite,
  onToggleRead,
  onResetFilter,
  onMarkAllAsRead,
  onOpenBadgesModal,
}) => {
  const [viewMode, setViewMode] = useState<'card' | 'compact'>('card');
  const isAllArchive = activeFilter.type === 'quick' && activeFilter.id === 'all';
  const badgeArticleCount = totalArchiveArticles ?? posts.length;

  const [sortMode, setSortMode] = useState<'chronological' | 'shuffle'>(() => {
    try {
      const saved = localStorage.getItem('5lb_sort_mode_v1');
      if (saved === 'shuffle' || saved === 'chronological') return saved;
    } catch (e) {
      // ignore
    }
    return 'chronological';
  });

  const [shuffledIds, setShuffledIds] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem('5lb_shuffled_ids_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return [];
  });

  const [isShuffleSpinning, setIsShuffleSpinning] = useState(false);

  const handleSelectChronological = () => {
    setSortMode('chronological');
    try {
      localStorage.setItem('5lb_sort_mode_v1', 'chronological');
    } catch (e) {
      // ignore
    }
  };

  // Every time shuffle is pressed (even if already selected), generate a new random shuffle order
  const handleTriggerShuffle = () => {
    setSortMode('shuffle');
    try {
      localStorage.setItem('5lb_sort_mode_v1', 'shuffle');
    } catch (e) {
      // ignore
    }

    const ids = posts.map((p) => p.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }

    setShuffledIds(ids);
    try {
      sessionStorage.setItem('5lb_shuffled_ids_v1', JSON.stringify(ids));
    } catch (e) {
      // ignore
    }

    // Brief tactile spin animation
    setIsShuffleSpinning(true);
    setTimeout(() => setIsShuffleSpinning(false), 450);
  };

  // If in shuffle mode but shuffledIds is empty (e.g. freshly toggled), populate with a shuffle
  useEffect(() => {
    if (sortMode === 'shuffle' && posts.length > 0 && shuffledIds.length === 0) {
      const ids = posts.map((p) => p.id);
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      setShuffledIds(ids);
    }
  }, [sortMode, posts, shuffledIds.length]);

  // Articles list sorted chronologically or in stable shuffle order
  const displayedPosts = useMemo(() => {
    if (sortMode === 'chronological') {
      return [...posts].sort((a, b) => {
        const diff = new Date(b.published).getTime() - new Date(a.published).getTime();
        if (diff !== 0) return diff;
        return b.id.localeCompare(a.id);
      });
    }

    // Shuffle mode: display posts strictly according to stable shuffledIds order
    // to prevent unwanted re-shuffling on background sync or app switching
    if (shuffledIds.length === 0) {
      return posts;
    }

    const postMap = new Map<string, BloggerPost>();
    for (const p of posts) {
      postMap.set(p.id, p);
    }

    const result: BloggerPost[] = [];
    const includedIds = new Set<string>();

    for (const id of shuffledIds) {
      const p = postMap.get(id);
      if (p) {
        result.push(p);
        includedIds.add(id);
      }
    }

    // If new posts arrived (e.g. loaded more or newly fetched), stably append them
    for (const p of posts) {
      if (!includedIds.has(p.id)) {
        result.push(p);
      }
    }

    return result;
  }, [posts, sortMode, shuffledIds]);

  // Clean skeleton loading view instead of blocking splash screen
  if (isLoading && posts.length === 0) {
    return (
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 animate-pulse">
        <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded-xl w-44 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between h-56"
            >
              <div>
                <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-3" />
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-5/6 mb-2" />
                <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-full mb-1.5" />
                <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
              </div>
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mt-4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
      {/* Subheader Toolbar: Filter badge & view switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {activeFilter.type === 'quick' && activeFilter.id === 'all' ? (
            <ArchiveBadgeButton
              totalArticles={badgeArticleCount}
              onClick={() => {
                if (onOpenBadgesModal) onOpenBadgesModal();
              }}
            />
          ) : (
            <div className="p-1.5 rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-950/70 dark:text-orange-300">
              <Filter className="w-4 h-4" />
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                {filterTitle}
              </h1>
              {activeFilter.type === 'quick' && activeFilter.id === 'all' && (() => {
                const badge = getCurrentBadge(badgeArticleCount);
                if (badge) {
                  return (
                    <button
                      onClick={() => onOpenBadgesModal && onOpenBadgesModal()}
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full cursor-pointer hover:scale-105 transition-transform ${badge.badgeTag}`}
                      title="Clicca per visualizzare tutti i tuoi badge"
                    >
                      {badge.name}
                    </button>
                  );
                }
                return null;
              })()}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {displayedPosts.length} {displayedPosts.length === 1 ? 'articolo trovato' : 'articoli'}
              {sortMode === 'shuffle' ? ' • Casuale' : ' • Recenti'}
            </p>
          </div>

          {searchQuery?.trim() && (
            <div className="flex items-center gap-1.5 ml-1.5 px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-200 text-xs font-medium border border-orange-200 dark:border-orange-800">
              <Search className="w-3 h-3 text-orange-600 dark:text-orange-400 shrink-0" />
              <span className="max-w-[120px] sm:max-w-[200px] truncate">"{searchQuery.trim()}"</span>
              <button
                onClick={onResetFilter}
                className="ml-0.5 p-0.5 hover:bg-orange-200 dark:hover:bg-orange-900 rounded-full transition cursor-pointer"
                title="Cancella ricerca"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Right side controls: Order toggle (Clock / Shuffle) + Mark all as read + View toggle (Card / Compact) */}
        <div className="flex items-center gap-2">
          {/* Paired sort controls: Ordine cronologico (Orologio) & Ordine casuale (Shuffle) */}
          <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-xl">
            <button
              onClick={handleSelectChronological}
              className={`flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium transition cursor-pointer active:scale-95 ${
                sortMode === 'chronological'
                  ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Ordine cronologico (dal più recente)"
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Recenti</span>
            </button>

            <button
              onClick={handleTriggerShuffle}
              className={`flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium transition cursor-pointer active:scale-95 ${
                sortMode === 'shuffle'
                  ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title={
                sortMode === 'shuffle'
                  ? 'Mescola di nuovo in un nuovo ordine casuale'
                  : 'Ordine casuale (Shuffle)'
              }
            >
              <Shuffle className={`w-4 h-4 transition-transform duration-300 ${isShuffleSpinning ? 'rotate-180 scale-110' : ''}`} />
              <span className="hidden sm:inline">Shuffle</span>
            </button>
          </div>

          {activeFilter.type === 'quick' && activeFilter.id === 'unread' && displayedPosts.length > 0 && onMarkAllAsRead && (
            <button
              onClick={onMarkAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
              title="Segna tutti gli articoli non letti come già letti"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Segna tutto come letto</span>
            </button>
          )}

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-xl">
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'card'
                  ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Vista Schede"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'compact'
                  ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Vista Compatta Elenco"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty / Error State */}
      {displayedPosts.length === 0 && !isLoading && (() => {
        if (loadError) {
          return (
            <div className="text-center py-14 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/40 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 mx-auto flex items-center justify-center mb-3">
                <WifiOff className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                Impossibile contattare la fonte dei dati
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                Non è stato possibile caricare i contenuti della sezione. Verifica la connessione di rete e riprova.
              </p>
              {onRetry && (
                <div className="mt-5 flex items-center justify-center">
                  <button
                    onClick={onRetry}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Riprova</span>
                  </button>
                </div>
              )}
            </div>
          );
        }

        const isSubcategory =
          activeFilter.type === 'rss' ||
          (activeFilter.type === 'quick' && activeFilter.id !== 'all');

        return (
          <div className="text-center py-14 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <BookOpen className="w-12 h-12 mx-auto text-slate-400 mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              {searchQuery?.trim()
                ? isSubcategory
                  ? `Nessun articolo trovato in questa categoria per "${searchQuery}"`
                  : `Nessun articolo trovato nell'archivio locale per "${searchQuery}"`
                : 'Nessun articolo trovato in questa sezione'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
              {searchQuery?.trim()
                ? isSubcategory
                  ? `La ricerca è limitata a questa categoria e non ha prodotto risultati. Puoi cercare in tutto l'archivio locale per trovare corrispondenze in altre sezioni.`
                  : 'Nessun riscontro tra gli articoli attualmente memorizzati sul dispositivo. Puoi cercare altri risultati nell\'archivio online di Blogger.'
                : 'Non ci sono articoli per i filtri attuali. Puoi aggiornare i feed o tornare alla home.'}
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              {searchQuery?.trim() && isSubcategory && onSearchAllArticles && (
                <button
                  onClick={onSearchAllArticles}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Cerca in tutto l'archivio locale</span>
                </button>
              )}

              {searchQuery?.trim() && !isSubcategory && onSearchOnline && (
                <button
                  onClick={() => onSearchOnline(searchQuery)}
                  disabled={isSearchingOnline}
                  className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-medium text-xs transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
                >
                  {isSearchingOnline ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Ricerca online in corso...</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-3.5 h-3.5" />
                      <span>Cerca altri risultati online</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={onResetFilter}
                className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs transition cursor-pointer"
              >
                Torna in home
              </button>
            </div>
          </div>
        );
      })()}

      {/* Grid or Compact List View */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {displayedPosts.map((post) => {
            const safeThumb = toHttpsUrl(post.thumbnail);
            return (
              <article
                key={post.id}
                onClick={() => onSelectPost(post)}
                className={`group flex flex-col bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 ${
                  post.isRead
                    ? 'border-slate-200 dark:border-slate-800 opacity-90'
                    : 'border-orange-200/80 dark:border-orange-950/60 shadow-sm ring-1 ring-orange-500/10'
                }`}
              >
                {/* Thumbnail image in framed inset container if available and valid https */}
                {safeThumb && (
                  <div className="thumbnail-frame-wrapper p-3 sm:p-3.5 pb-0">
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs">
                      <img
                        src={safeThumb}
                        alt={decodeHtmlEntities(post.title)}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        onError={(e) => {
                          const wrapper = (e.target as HTMLElement).closest('.thumbnail-frame-wrapper');
                          if (wrapper) {
                            (wrapper as HTMLElement).style.display = 'none';
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                )}

                {/* Card Body */}
                <div className={`p-4 sm:p-5 ${safeThumb ? 'pt-3 sm:pt-3.5' : ''} flex-1 flex flex-col justify-between`}>
                <div>
                  {/* Top meta row */}
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          post.isRead ? 'bg-slate-300 dark:bg-slate-700' : 'bg-orange-500 ring-2 ring-orange-200 dark:ring-orange-950'
                        }`}
                        title={post.isRead ? 'Letto' : 'Non letto'}
                      />
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        {formatItalianDate(post.published)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Read toggle */}
                      <button
                        onClick={(e) => onToggleRead(post.id, e)}
                        className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                        title={post.isRead ? 'Segna come non letto' : 'Segna come già letto'}
                      >
                        {post.isRead ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Circle className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Favorite toggle */}
                      <button
                        onClick={(e) => onToggleFavorite(post.id, e)}
                        className={`p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                          post.isFavorite ? 'text-red-500' : 'text-slate-400 hover:text-slate-700'
                        }`}
                        title={post.isFavorite ? 'Rimuovi dai salvati' : 'Aggiungi a Salva per dopo'}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            post.isFavorite ? 'fill-current text-red-500' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className={`text-base sm:text-lg font-bold leading-snug line-clamp-3 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors ${
                    post.isRead ? 'text-slate-700 dark:text-slate-300 font-semibold' : 'text-slate-900 dark:text-slate-100'
                  }`}>
                    {decodeHtmlEntities(post.title)}
                  </h3>

                  {/* Snippet */}
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {decodeHtmlEntities(post.summary)}
                  </p>
                </div>

                {/* Categories Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5 items-center">
                  {post.categories.slice(0, 3).map((cat, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {decodeHtmlEntities(cat)}
                    </span>
                  ))}
                  {post.categories.length > 3 && (
                    <span className="text-[10px] text-slate-400">
                      +{post.categories.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </article>
            );
          })}
        </div>
      ) : (
        /* Compact List View */
        <div className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          {displayedPosts.map((post) => (
            <div
              key={post.id}
              onClick={() => onSelectPost(post)}
              className={`flex items-start sm:items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer gap-3 ${
                post.isRead ? 'opacity-85' : 'bg-orange-50/20'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <button
                  onClick={(e) => onToggleRead(post.id, e)}
                  className="mt-1 sm:mt-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"
                >
                  {post.isRead ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-orange-500 fill-orange-500" />
                  )}
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {formatItalianDate(post.published)}
                    </span>
                    {post.categories[0] && (
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 font-medium truncate max-w-[120px]">
                        {decodeHtmlEntities(post.categories[0])}
                      </span>
                    )}
                  </div>
                  <h4 className={`text-sm sm:text-base font-semibold truncate ${
                    post.isRead ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-slate-100 font-bold'
                  }`}>
                    {decodeHtmlEntities(post.title)}
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => onToggleFavorite(post.id, e)}
                  className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                    post.isFavorite ? 'text-red-500' : 'text-slate-400'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${post.isFavorite ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Button: Carica altri articoli */}
      {hasMore && onLoadMore && (
        <div className="mt-8 mb-6 flex flex-col items-center justify-center">
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="group flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-semibold text-sm shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoadingMore ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Caricamento altri articoli...</span>
              </>
            ) : (
              <>
                <ArrowDownCircle className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                <span>Carica altri articoli</span>
              </>
            )}
          </button>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
            Scarica i successivi 15 articoli
          </span>
        </div>
      )}

      {/* Bottom action when searching within a specific category */}
      {searchQuery?.trim() && !isAllArchive && onSearchAllArticles && displayedPosts.length > 0 && (
        <div className="mt-8 mb-6 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-xs flex flex-col items-center justify-center gap-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Filter className="w-4 h-4 text-orange-500" />
            <span>I risultati sopra sono limitati a questa categoria ({displayedPosts.length})</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
            Vuoi estendere la ricerca di "{searchQuery.trim()}" a tutti gli articoli del tuo archivio locale?
          </p>
          <button
            onClick={onSearchAllArticles}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs sm:text-sm shadow-sm transition cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Cerca in tutto l'archivio locale</span>
          </button>
        </div>
      )}

      {/* Bottom action when searching in the full local archive */}
      {searchQuery?.trim() && isAllArchive && onSearchOnline && displayedPosts.length > 0 && (
        <div className="mt-8 mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-slate-900 dark:to-slate-800/80 border border-orange-200 dark:border-slate-700 text-center shadow-xs flex flex-col items-center justify-center gap-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Globe className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <span>Cerchi altri risultati non ancora presenti sul dispositivo?</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
            Interroga l'archivio online di 5LB Magazine per scaricare nuovi articoli relativi a "{searchQuery.trim()}".
          </p>
          <button
            onClick={() => onSearchOnline(searchQuery)}
            disabled={isSearchingOnline}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-semibold text-xs sm:text-sm shadow-md transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSearchingOnline ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Ricerca online in corso...</span>
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                <span>Cerca altri risultati online</span>
              </>
            )}
          </button>
        </div>
      )}

      {!searchQuery?.trim() && !hasMore && displayedPosts.length > 0 && !isLoading && (
        <div className="mt-8 mb-6 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Hai visualizzato tutti gli articoli disponibili ({displayedPosts.length})
          </p>
        </div>
      )}
    </div>
  );
};

