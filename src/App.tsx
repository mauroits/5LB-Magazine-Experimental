/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ArticleList } from './components/ArticleList';
import { ArticleModal } from './components/ArticleModal';
import { InfoModal } from './components/InfoModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { BadgeModal } from './components/BadgeModal';
import { BadgeUnlockCelebrationModal } from './components/BadgeUnlockCelebrationModal';
import { checkAndUnlockBadges, BadgeTier } from './services/badgeService';
import { openExternalBrowser } from './utils/browserLauncher';


import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { CookieConsentModal } from './components/CookieConsentModal';
import {
  BloggerPost,
  ActiveFilter,
  NavItem,
  NotificationItem
} from './types';
import {
  initAnalyticsWithSavedConsent,
  getStoredCookieConsent,
  trackEvent,
  trackPageView
} from './services/analytics';
import { postMatchesExactPhrase } from './utils/searchUtils';
import {
  fetchBloggerPosts,
  getCachedPosts,
  searchBloggerArchive,
  getReadPostIds,
  saveReadPostIds,
  getFavoritePostIds,
  saveFavoritePostIds,
  computeCategoryCounts,
  FEED_CACHE_TTL_MS,
  getFeedCacheTimestamp
} from './services/bloggerFeed';
import { FEED_SYNC_CONFIG } from './config/syncConfig';
import {
  registerPeriodicSync,
  initSWMessageListener,
  syncNewestPostWithSW
} from './services/periodicSyncService';
import {
  checkForNewPostsAndNotify,
  checkForNewAccadeOggiAndNotify,
  isAccadeOggiNotificationEnabled,
  getStoredNotifications,
  markNotificationAsRead
} from './services/notificationService';
import {
  fetchAccadeOggiPosts,
  getCachedAccadeOggiPosts,
  getAccadeOggiCacheTimestamp
} from './services/accadeOggiFeed';
import { NAV_SECTIONS, GOOGLE_NOTEBOOK_URL } from './config/navigation';
import { openNotebookWithPriority } from './utils/notebookLauncher';
import { useTheme } from './hooks/useTheme';
import { Bell, ArrowRight, X } from 'lucide-react';

interface CategoryFeedState {
  posts: BloggerPost[];
  hasMore: boolean;
  totalResults: number;
}

function getArticlePath(post: BloggerPost): string {
  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  try {
    if (post.link) {
      const parsed = new URL(post.link);
      if (parsed.pathname && parsed.pathname !== '/') {
        const cleanPath = parsed.pathname.startsWith('/') ? parsed.pathname.slice(1) : parsed.pathname;
        return `${cleanBase}${cleanPath}`;
      }
    }
  } catch {
    // fallback se link non è un URL assoluto
  }
  return `${cleanBase}articolo/${encodeURIComponent(post.id)}`;
}

export default function App() {
  const { themeMode, cycleTheme } = useTheme();
  const sections = NAV_SECTIONS;

  // Stale-While-Revalidate: Initialize immediately from cached articles for 0ms load
  const [posts, setPosts] = useState<BloggerPost[]>(() => getCachedPosts());
  const [isLoading, setIsLoading] = useState<boolean>(() => getCachedPosts().length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mainFeedHasMore, setMainFeedHasMore] = useState(true);
  const [isMainFeedLoadingMore, setIsMainFeedLoadingMore] = useState(false);

  // Category RSS feeds (lazy loaded on first click, 15 articles at a time)
  const [categoryFeeds, setCategoryFeeds] = useState<Record<string, CategoryFeedState>>({});
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [isCategoryLoadingMore, setIsCategoryLoadingMore] = useState(false);

  // Accade Oggi feed (strictly at most 15 posts, separate from archive)
  const [accadeOggiPosts, setAccadeOggiPosts] = useState<BloggerPost[]>(() => getCachedAccadeOggiPosts());
  const [isAccadeOggiLoading, setIsAccadeOggiLoading] = useState<boolean>(() => getCachedAccadeOggiPosts().length === 0);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineSearchResults, setOnlineSearchResults] = useState<Record<string, BloggerPost[]>>({});

  // Home view on open is now the Accade Oggi feed
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>({
    type: 'quick',
    id: 'today',
  });

  // Modals & Panels
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BloggerPost | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);
  const [isCookieManageMode, setIsCookieManageMode] = useState(false);
  const [isBadgesModalOpen, setIsBadgesModalOpen] = useState(false);
  const [celebrationBadge, setCelebrationBadge] = useState<BadgeTier | null>(null);

  // Active in-app Toast Notification
  const [toastNotification, setToastNotification] = useState<NotificationItem | null>(null);

  // Unread notifications count
  const [notifications, setNotifications] = useState<NotificationItem[]>(getStoredNotifications());
  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // Stale-While-Revalidate: background load & revalidation of main feed (15 items)
  const loadFeed = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const res = await fetchBloggerPosts({
        maxResults: 15,
        startIndex: 1,
        forceRefresh: isManualRefresh,
      });

      setPosts((prev) => {
        // Detect newly published articles compared to previous cache
        if (res.posts.length > 0 && prev.length > 0) {
          const newestNetwork = res.posts[0];
          const newestCached = prev[0];
          if (
            newestNetwork.id !== newestCached.id &&
            new Date(newestNetwork.published).getTime() > new Date(newestCached.published).getTime()
          ) {
            // New article found! Trigger notification
            const notifItem: NotificationItem = {
              id: 'notif-' + Date.now(),
              title: 'Nuovo articolo: ' + newestNetwork.title,
              body: newestNetwork.summary.slice(0, 110) + '...',
              date: new Date().toISOString(),
              read: false,
              postId: newestNetwork.id,
              url: newestNetwork.link,
            };
            setToastNotification(notifItem);
            checkForNewPostsAndNotify(res.posts);
          }
        } else if (res.posts.length > 0 && prev.length === 0) {
          checkForNewPostsAndNotify(res.posts);
        }

        // Optimization: if incoming posts match existing leading posts exactly,
        // do not allocate a new array to prevent unnecessary component re-renders
        const isUnchanged =
          prev.length >= res.posts.length &&
          res.posts.length > 0 &&
          res.posts.every((p, idx) => prev[idx]?.id === p.id && prev[idx]?.title === p.title);
        if (isUnchanged) {
          return prev;
        }

        // Merge network posts with existing posts preserving user read/fav status
        const map = new Map<string, BloggerPost>();
        for (const p of prev) map.set(p.id, p);
        for (const p of res.posts) {
          const existing = map.get(p.id);
          map.set(
            p.id,
            existing ? { ...p, isRead: existing.isRead, isFavorite: existing.isFavorite } : p
          );
        }
        const merged = Array.from(map.values());
        merged.sort((a, b) => {
          const diff = new Date(b.published).getTime() - new Date(a.published).getTime();
          if (diff !== 0) return diff;
          return b.id.localeCompare(a.id);
        });
        return merged;
      });

      setMainFeedHasMore(res.hasMore);
    } catch (err) {
      console.error('Errore caricamento feed:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Accade Oggi: background load & revalidation of Atom feed (strictly 15 items max)
  const loadAccadeOggiFeed = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const fetched = await fetchAccadeOggiPosts({ forceRefresh: isManualRefresh });

      setAccadeOggiPosts((prev) => {
        // Detect newly published articles compared to previous cache
        if (fetched.length > 0 && prev.length > 0) {
          const newestNetwork = fetched[0];
          const newestCached = prev[0];
          if (
            newestNetwork.id !== newestCached.id &&
            new Date(newestNetwork.published).getTime() > new Date(newestCached.published).getTime()
          ) {
            // New post from Accade Oggi! Notify only if user enabled Accade Oggi notifications
            if (isAccadeOggiNotificationEnabled()) {
              const notifItem: NotificationItem = {
                id: 'notif-today-' + Date.now(),
                title: 'Accade Oggi: ' + newestNetwork.title,
                body: newestNetwork.summary.slice(0, 110) + '...',
                date: new Date().toISOString(),
                read: false,
                postId: newestNetwork.id,
                url: newestNetwork.link,
              };
              setToastNotification(notifItem);
              checkForNewAccadeOggiAndNotify(fetched);
            }
          }
        } else if (fetched.length > 0 && prev.length === 0) {
          if (isAccadeOggiNotificationEnabled()) {
            checkForNewAccadeOggiAndNotify(fetched);
          }
        }

        // Synchronize read and favorite state
        const readIds = getReadPostIds();
        const favIds = getFavoritePostIds();
        return fetched.map((p) => ({
          ...p,
          isRead: readIds.has(p.id),
          isFavorite: favIds.has(p.id),
        }));
      });
    } catch (err) {
      console.error('Errore caricamento feed Accade Oggi:', err);
    } finally {
      setIsAccadeOggiLoading(false);
      if (isManualRefresh) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    initAnalyticsWithSavedConsent();

    // Traccia la visualizzazione iniziale di pagina
    trackPageView(window.location.pathname || '/', '5LB Magazine');

    // Mostra il banner del consenso prima dell'uso se l'utente non ha ancora espresso una scelta
    const savedConsent = getStoredCookieConsent();
    if (!savedConsent || !savedConsent.hasChosen) {
      setIsCookieModalOpen(true);
      setIsCookieManageMode(false);
    }

    // Listener messaggi Service Worker per navigazione diretta ad articolo su click notifica
    const cleanupSWListener = initSWMessageListener();

    // Registra Periodic Background Sync del Service Worker (12 ore, configurabile in syncConfig.ts)
    registerPeriodicSync().catch(() => {});

    // Sincronizza lo stato iniziale del post più recente con l'IndexedDB del Service Worker
    if (posts.length > 0) {
      syncNewestPostWithSW(posts).catch(() => {});
    }

    // 1) Controllo di aggiornamenti al boot della PWA per entrambi i feed
    loadAccadeOggiFeed(false);
    loadFeed(false);

    // 2) Se l'app resta aperta: controlla periodicamente
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        const lastFetchMain = getFeedCacheTimestamp();
        if (Date.now() - lastFetchMain >= FEED_SYNC_CONFIG.FOREGROUND_POLL_MS) {
          loadFeed(false);
        }

        const lastFetchToday = getAccadeOggiCacheTimestamp();
        if (Date.now() - lastFetchToday >= FEED_SYNC_CONFIG.FOREGROUND_POLL_MS) {
          loadAccadeOggiFeed(false);
        }
      }
    }, 60000); // verifica ogni minuto se è trascorso l'intervallo mentre l'app è aperta

    return () => {
      clearInterval(interval);
      cleanupSWListener();
    };
  }, [loadFeed, loadAccadeOggiFeed]);

  // On-demand category loading: populate category list only when selected for the first time
  useEffect(() => {
    let isCancelled = false;

    if (activeFilter.type === 'rss' && activeFilter.category) {
      const catKey = activeFilter.category.trim();

      // Only fetch if not already populated
      if (!categoryFeeds[catKey]) {
        setIsCategoryLoading(true);
        fetchBloggerPosts({
          category: catKey,
          startIndex: 1,
          maxResults: 15,
        })
          .then((res) => {
            if (!isCancelled) {
              setCategoryFeeds((prev) => ({
                ...prev,
                [catKey]: {
                  posts: res.posts,
                  hasMore: res.hasMore,
                  totalResults: res.totalResults,
                },
              }));

              // Merge into global posts for search index and badge counts
              setPosts((prev) => {
                const map = new Map<string, BloggerPost>();
                for (const p of prev) map.set(p.id, p);
                for (const p of res.posts) {
                  const existing = map.get(p.id);
                  map.set(
                    p.id,
                    existing ? { ...p, isRead: existing.isRead, isFavorite: existing.isFavorite } : p
                  );
                }
                const merged = Array.from(map.values());
                merged.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());
                try {
                  localStorage.setItem('5lb_magazine_posts_cache_v1', JSON.stringify(merged));
                } catch (e) {
                  // ignore
                }
                return merged;
              });
            }
          })
          .catch((e) => {
            console.warn('Errore nel caricamento del feed della categoria:', e);
          })
          .finally(() => {
            if (!isCancelled) setIsCategoryLoading(false);
          });
      }
    }

    return () => {
      isCancelled = true;
    };
  }, [activeFilter, categoryFeeds]);

  // Pagination: "Carica altri articoli" handler
  const handleLoadMore = useCallback(async () => {
    if (activeFilter.type === 'quick' && activeFilter.id === 'all') {
      if (isMainFeedLoadingMore || !mainFeedHasMore) return;
      setIsMainFeedLoadingMore(true);
      try {
        const startIndex = posts.length + 1;
        const res = await fetchBloggerPosts({
          maxResults: 15,
          startIndex,
        });
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newPosts = res.posts.filter((p) => !existingIds.has(p.id));
          const merged = [...prev, ...newPosts];
          try {
            localStorage.setItem('5lb_magazine_posts_cache_v1', JSON.stringify(merged));
          } catch (e) {
            // ignore
          }
          return merged;
        });
        setMainFeedHasMore(res.hasMore);
      } catch (err) {
        console.error('Errore caricamento altri post:', err);
      } finally {
        setIsMainFeedLoadingMore(false);
      }
    } else if (activeFilter.type === 'rss') {
      const catKey = activeFilter.category.trim();
      const currentFeed = categoryFeeds[catKey];
      if (!currentFeed || isCategoryLoadingMore || !currentFeed.hasMore) return;
      setIsCategoryLoadingMore(true);
      try {
        const startIndex = currentFeed.posts.length + 1;
        const res = await fetchBloggerPosts({
          category: catKey,
          maxResults: 15,
          startIndex,
        });
        setCategoryFeeds((prev) => {
          const existing = prev[catKey]?.posts || [];
          const existingIds = new Set(existing.map((p) => p.id));
          const newPosts = res.posts.filter((p) => !existingIds.has(p.id));
          return {
            ...prev,
            [catKey]: {
              posts: [...existing, ...newPosts],
              hasMore: res.hasMore,
              totalResults: res.totalResults,
            },
          };
        });
        // Also merge into global posts
        setPosts((prev) => {
          const map = new Map<string, BloggerPost>();
          for (const p of prev) map.set(p.id, p);
          for (const p of res.posts) {
            if (!map.has(p.id)) map.set(p.id, p);
          }
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.published).getTime() - new Date(a.published).getTime()
          );
          try {
            localStorage.setItem('5lb_magazine_posts_cache_v1', JSON.stringify(merged));
          } catch (e) {
            // ignore
          }
          return merged;
        });
      } catch (err) {
        console.error('Errore caricamento altri post categoria:', err);
      } finally {
        setIsCategoryLoadingMore(false);
      }
    }
  }, [
    activeFilter,
    isMainFeedLoadingMore,
    mainFeedHasMore,
    posts.length,
    categoryFeeds,
    isCategoryLoadingMore,
  ]);

  // Listen for custom notification events
  useEffect(() => {
    const handleNewNotif = (e: any) => {
      setNotifications(getStoredNotifications());
      if (e.detail) {
        setToastNotification(e.detail);
        setTimeout(() => setToastNotification(null), 8000);
      }
    };

    const handleNotifsUpdated = () => {
      setNotifications(getStoredNotifications());
    };

    const handleOpenPost = (e: any) => {
      const targetId = e.detail;
      const found = posts.find((p) => p.id === targetId);
      if (found) {
        handleSelectPost(found);
      }
    };

    window.addEventListener('5lb:new-notification', handleNewNotif);
    window.addEventListener('5lb:notifications-updated', handleNotifsUpdated);
    window.addEventListener('5lb:open-post', handleOpenPost);

    return () => {
      window.removeEventListener('5lb:new-notification', handleNewNotif);
      window.removeEventListener('5lb:notifications-updated', handleNotifsUpdated);
      window.removeEventListener('5lb:open-post', handleOpenPost);
    };
  }, [posts, accadeOggiPosts]);

  // Monitor badge progression based on articles in "Il mio archivio" (posts.length)
  useEffect(() => {
    if (posts.length > 0) {
      const newlyUnlocked = checkAndUnlockBadges(posts.length);
      if (newlyUnlocked.length > 0) {
        // Show celebratory modal for the highest newly unlocked badge
        setCelebrationBadge(newlyUnlocked[newlyUnlocked.length - 1]);
      }
    }
  }, [posts.length]);

  // Derived counts
  const unreadCount = useMemo(
    () => posts.filter((p) => !p.isRead).length + accadeOggiPosts.filter((p) => !p.isRead).length,
    [posts, accadeOggiPosts]
  );
  const favoritesCount = useMemo(
    () => posts.filter((p) => p.isFavorite).length + accadeOggiPosts.filter((p) => p.isFavorite).length,
    [posts, accadeOggiPosts]
  );
  const todayCount = useMemo(() => accadeOggiPosts.length, [accadeOggiPosts]);

  const categoryCounts = useMemo(() => computeCategoryCounts(posts), [posts]);

  // Active view posts & pagination state
  const { currentViewPosts, currentViewHasMore, isCurrentViewLoading, isCurrentViewLoadingMore } = useMemo(() => {
    let basePosts: BloggerPost[] = [];
    let baseHasMore = false;
    let baseIsLoading = false;
    let baseIsLoadingMore = false;

    // Active category RSS filter
    if (activeFilter.type === 'rss') {
      const catKey = activeFilter.category.trim();
      const feed = categoryFeeds[catKey];
      basePosts = feed ? feed.posts : [];
      baseHasMore = feed ? feed.hasMore : false;
      baseIsLoading = !feed && isCategoryLoading;
      baseIsLoadingMore = isCategoryLoadingMore;
    } else if (activeFilter.type === 'quick') {
      // Active quick filters
      if (activeFilter.id === 'today') {
        // Accade Oggi feed (at most 15 items, strictly separated from archive)
        basePosts = accadeOggiPosts;
        baseHasMore = false;
        baseIsLoading = isAccadeOggiLoading;
        baseIsLoadingMore = false;
      } else if (activeFilter.id === 'all') {
        // "Il mio archivio" (Blogger archive articles only, strictly excludes Accade Oggi)
        const q = searchQuery.toLowerCase().trim();
        const onlinePosts = q ? (onlineSearchResults[q] || []) : [];
        const onlineIdSet = new Set(onlinePosts.map((p) => p.id));
        basePosts = [...onlinePosts, ...posts.filter((p) => !onlineIdSet.has(p.id))];
        baseHasMore = mainFeedHasMore;
        baseIsLoading = isLoading;
        baseIsLoadingMore = isMainFeedLoadingMore;
      } else if (activeFilter.id === 'unread') {
        basePosts = [...accadeOggiPosts.filter((p) => !p.isRead), ...posts.filter((p) => !p.isRead)];
      } else if (activeFilter.id === 'favorites') {
        basePosts = [...accadeOggiPosts.filter((p) => p.isFavorite), ...posts.filter((p) => p.isFavorite)];
      }
    } else {
      basePosts = posts;
    }

    // Search query filter (applies within current view/category with exact word/phrase matching)
    if (searchQuery.trim()) {
      const filtered = basePosts.filter((p) => postMatchesExactPhrase(p, searchQuery));

      return {
        currentViewPosts: filtered,
        currentViewHasMore: false,
        isCurrentViewLoading: baseIsLoading,
        isCurrentViewLoadingMore: false,
      };
    }

    return {
      currentViewPosts: basePosts,
      currentViewHasMore: baseHasMore,
      isCurrentViewLoading: baseIsLoading,
      isCurrentViewLoadingMore: baseIsLoadingMore,
    };
  }, [
    posts,
    accadeOggiPosts,
    searchQuery,
    onlineSearchResults,
    activeFilter,
    categoryFeeds,
    isCategoryLoading,
    isCategoryLoadingMore,
    mainFeedHasMore,
    isLoading,
    isAccadeOggiLoading,
    isMainFeedLoadingMore,
  ]);

  // Filter Title label
  const filterTitle = useMemo(() => {
    if (searchQuery.trim()) return `Risultati per "${searchQuery}"`;
    if (activeFilter.type === 'quick') {
      if (activeFilter.id === 'today') return 'Accade Oggi';
      if (activeFilter.id === 'all') return 'Il mio archivio';
      if (activeFilter.id === 'unread') return 'Articoli Non Letti';
      if (activeFilter.id === 'favorites') return 'Articoli che Ti Piacciono';
    } else if (activeFilter.type === 'rss') {
      return activeFilter.label || activeFilter.category;
    }
    return '5LB Magazine';
  }, [activeFilter, searchQuery]);

  // Post Actions with History pushState & Google Analytics Virtual Pageviews
  const handleSelectPost = useCallback((post: BloggerPost, updateHistory = true) => {
    const currentRead = getReadPostIds();
    currentRead.add(post.id);
    saveReadPostIds(currentRead);

    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, isRead: true } : p))
    );

    setAccadeOggiPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, isRead: true } : p))
    );

    setCategoryFeeds((prev) => {
      const updated = { ...prev };
      for (const k of Object.keys(updated)) {
        updated[k] = {
          ...updated[k],
          posts: updated[k].posts.map((p) => (p.id === post.id ? { ...p, isRead: true } : p)),
        };
      }
      return updated;
    });

    const articlePath = getArticlePath(post);

    if (updateHistory) {
      window.history.pushState({ postId: post.id }, post.title, articlePath);
    }
    document.title = `${post.title} — 5LB Magazine`;

    // Invia visualizzazione di pagina e evento a Google Analytics (attivo sia con cookie che con modellazione cookieless)
    trackPageView(articlePath, post.title);
    trackEvent('view_item', {
      content_type: 'article',
      item_id: post.id,
      item_name: post.title,
      page_path: articlePath,
    });
    trackEvent('select_content', {
      content_type: 'article',
      item_id: post.id,
      item_name: post.title,
      page_path: articlePath,
    });

    setSelectedPost({ ...post, isRead: true });
  }, []);

  const handleClosePost = useCallback(() => {
    setSelectedPost(null);
    const basePath = import.meta.env.BASE_URL || '/';
    if (window.location.pathname !== basePath && window.location.pathname !== basePath.replace(/\/$/, '')) {
      window.history.pushState({}, '5LB Magazine', basePath);
      document.title = '5LB Magazine';
      trackPageView(basePath, '5LB Magazine');
    }
  }, []);

  // Gestione del pulsante Indietro del browser / Android Back button
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.postId) {
        const found =
          posts.find((p) => p.id === e.state.postId) ||
          accadeOggiPosts.find((p) => p.id === e.state.postId);
        if (found) {
          handleSelectPost(found, false);
          return;
        }
      }
      // Se si torna alla pagina principale
      const basePath = import.meta.env.BASE_URL || '/';
      setSelectedPost(null);
      document.title = '5LB Magazine';
      trackPageView(window.location.pathname || basePath, '5LB Magazine');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [posts, accadeOggiPosts, handleSelectPost]);

  // Deep linking al caricamento iniziale se l'URL contiene il percorso di un articolo
  useEffect(() => {
    const allAvailable = [...accadeOggiPosts, ...posts];
    const basePath = import.meta.env.BASE_URL || '/';
    const isAtBase = window.location.pathname === basePath || window.location.pathname === basePath.replace(/\/$/, '');
    if (allAvailable.length > 0 && !selectedPost && !isAtBase) {
      const currentPath = window.location.pathname;
      const matched = allAvailable.find((p) => {
        try {
          const articlePath = getArticlePath(p);
          return articlePath === currentPath || new URL(p.link).pathname === currentPath;
        } catch {
          return false;
        }
      });
      if (matched) {
        handleSelectPost(matched, false);
      }
    }
  }, [posts, accadeOggiPosts, selectedPost, handleSelectPost]);

  // Tracciamento categorie e filtri in Google Analytics
  useEffect(() => {
    if (activeFilter.type === 'rss') {
      const categoryPath = `/categoria/${encodeURIComponent(activeFilter.category)}`;
      const title = `${activeFilter.label || activeFilter.category} — 5LB Magazine`;
      trackPageView(categoryPath, title);
    } else if (activeFilter.type === 'quick' && activeFilter.id !== 'all') {
      const filterPath = `/filtro/${activeFilter.id}`;
      const title = `${filterTitle} — 5LB Magazine`;
      trackPageView(filterPath, title);
    }
  }, [activeFilter, filterTitle]);

  const handleToggleFavorite = (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const currentFavs = getFavoritePostIds();
    const isNowFav = !currentFavs.has(postId);
    if (isNowFav) currentFavs.add(postId);
    else currentFavs.delete(postId);
    saveFavoritePostIds(currentFavs);

    trackEvent('favorite_article', {
      item_id: postId,
      is_favorite: isNowFav,
    });

    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, isFavorite: isNowFav } : p))
    );

    setAccadeOggiPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, isFavorite: isNowFav } : p))
    );

    setCategoryFeeds((prev) => {
      const updated = { ...prev };
      for (const k of Object.keys(updated)) {
        updated[k] = {
          ...updated[k],
          posts: updated[k].posts.map((p) => (p.id === postId ? { ...p, isFavorite: isNowFav } : p)),
        };
      }
      return updated;
    });

    if (selectedPost && selectedPost.id === postId) {
      setSelectedPost({ ...selectedPost, isFavorite: isNowFav });
    }
  };

  const handleToggleRead = (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const currentRead = getReadPostIds();
    const isNowRead = !currentRead.has(postId);
    if (isNowRead) currentRead.add(postId);
    else currentRead.delete(postId);
    saveReadPostIds(currentRead);

    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, isRead: isNowRead } : p))
    );

    setAccadeOggiPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, isRead: isNowRead } : p))
    );

    setCategoryFeeds((prev) => {
      const updated = { ...prev };
      for (const k of Object.keys(updated)) {
        updated[k] = {
          ...updated[k],
          posts: updated[k].posts.map((p) => (p.id === postId ? { ...p, isRead: isNowRead } : p)),
        };
      }
      return updated;
    });
  };

  const handleMarkAllAsRead = () => {
    const currentRead = getReadPostIds();
    for (const p of posts) {
      currentRead.add(p.id);
    }
    for (const p of accadeOggiPosts) {
      currentRead.add(p.id);
    }
    saveReadPostIds(currentRead);
    setPosts((prev) => prev.map((p) => ({ ...p, isRead: true })));
    setAccadeOggiPosts((prev) => prev.map((p) => ({ ...p, isRead: true })));
    setCategoryFeeds((prev) => {
      const updated = { ...prev };
      for (const k of Object.keys(updated)) {
        updated[k] = {
          ...updated[k],
          posts: updated[k].posts.map((p) => ({ ...p, isRead: true })),
        };
      }
      return updated;
    });
  };

  const handleOpenNotebook = () => {
    trackPageView('/link/notebooklm', 'Google NotebookLM — 5LB Magazine');
    trackEvent('open_external_link', {
      link_url: GOOGLE_NOTEBOOK_URL,
      link_title: 'Google NotebookLM',
      link_type: 'notebook',
    });
    openNotebookWithPriority();
  };

  const handleOpenTelegram = () => {
    trackPageView('/link/telegram', 'Telegram Accade Oggi — 5LB Magazine');
    trackEvent('open_external_link', {
      link_url: 'https://t.me/s/magazine5LB',
      link_title: 'Accade Oggi (Telegram)',
      link_type: 'telegram',
    });
    openExternalBrowser('https://t.me/s/magazine5LB');
  };

  // Online archive search handler: calls Blogger API and imports found articles into local state
  const handleSearchOnline = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || isSearchingOnline) return;
    setIsSearchingOnline(true);
    trackEvent('search', { search_term: trimmed });
    try {
      const res = await searchBloggerArchive(trimmed, 30);
      if (res.posts.length > 0) {
        // Save in online search results map for instant view access
        setOnlineSearchResults((prev) => ({
          ...prev,
          [trimmed.toLowerCase()]: res.posts,
        }));

        setPosts((prev) => {
          const map = new Map<string, BloggerPost>();
          for (const p of prev) map.set(p.id, p);
          for (const p of res.posts) {
            const existing = map.get(p.id);
            map.set(
              p.id,
              existing ? { ...p, isRead: existing.isRead, isFavorite: existing.isFavorite } : p
            );
          }
          const merged = Array.from(map.values());
          merged.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());

          // Persist merged cache to localStorage
          try {
            localStorage.setItem('5lb_magazine_posts_cache_v1', JSON.stringify(merged));
          } catch (e) {
            // ignore
          }

          return merged;
        });

        setToastNotification({
          id: 'search-success-' + Date.now(),
          title: 'Articoli importati dall’archivio',
          body: `Trovati e importati ${res.posts.length} articoli per "${trimmed}".`,
          date: new Date().toISOString(),
          read: false,
        });
      } else {
        // Nessun articolo trovato online: mostra fumetto e torna in home
        setToastNotification({
          id: 'search-empty-' + Date.now(),
          title: 'Nessun risultato online',
          body: `Nessun articolo trovato nell'archivio online per "${trimmed}".`,
          date: new Date().toISOString(),
          read: false,
        });

        // Torna in home
        setSearchQuery('');
        setActiveFilter({ type: 'quick', id: 'today' });
      }
    } catch (err) {
      console.warn('Errore durante la ricerca online:', err);
      setToastNotification({
        id: 'search-error-' + Date.now(),
        title: 'Ricerca online non riuscita',
        body: `Impossibile completare la ricerca per "${trimmed}". Riprova più tardi.`,
        date: new Date().toISOString(),
        read: false,
      });

      // Torna in home
      setSearchQuery('');
      setActiveFilter({ type: 'quick', id: 'today' });
    } finally {
      setIsSearchingOnline(false);
    }
  }, [isSearchingOnline]);

  return (
    <div className="min-h-screen h-screen bg-slate-100 dark:bg-slate-950 flex font-sans overflow-hidden">
      {/* Responsive Drawer on mobile / Stationary Full-Height Sidebar reaching the top on desktop & landscape tablet (lg+) */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sections={sections}
        activeFilter={activeFilter}
        onSelectFilter={(f) => {
          setActiveFilter(f);
          setSearchQuery('');
        }}
        onSelectLink={(item) => {
          if (item.targetUrl) {
            const domain = (() => {
              try {
                return new URL(item.targetUrl).hostname;
              } catch {
                return '';
              }
            })();
            trackPageView(`/link/${encodeURIComponent(item.label)}`, `${item.label} — 5LB Magazine`);
            trackEvent('open_external_link', {
              link_url: item.targetUrl,
              link_title: item.label,
              link_domain: domain,
              link_type: 'external_resource',
            });
            openExternalBrowser(item.targetUrl);
          }
        }}
        onOpenNotebook={handleOpenNotebook}
        onOpenTelegram={handleOpenTelegram}
        onOpenInfo={() => setIsInfoOpen(true)}
        onOpenCookieSettings={() => {
          setIsCookieManageMode(true);
          setIsCookieModalOpen(true);
        }}
        onOpenBadgesModal={() => setIsBadgesModalOpen(true)}
        unreadCount={unreadCount}
        totalCount={posts.length}
        favoritesCount={favoritesCount}
        todayCount={todayCount}
        categoryCounts={categoryCounts}
        themeMode={themeMode}
        onCycleTheme={cycleTheme}
      />

      {/* Main Content Column (Header + Article Feed) */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenNotebook={handleOpenNotebook}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          unreadNotificationsCount={unreadNotificationsCount}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          currentFilterLabel={filterTitle}
        />

        {/* Article Feed Area */}
        <main className="flex-1 overflow-y-auto">
          <ArticleList
            posts={currentViewPosts}
            isLoading={isCurrentViewLoading}
            isLoadingMore={isCurrentViewLoadingMore}
            hasMore={currentViewHasMore}
            onLoadMore={handleLoadMore}
            activeFilter={activeFilter}
            filterTitle={filterTitle}
            searchQuery={searchQuery}
            isSearchingOnline={isSearchingOnline}
            onSearchOnline={handleSearchOnline}
            onSearchAllArticles={() => {
              setActiveFilter({ type: 'quick', id: 'all' });
            }}
            onSelectPost={handleSelectPost}
            onToggleFavorite={handleToggleFavorite}
            onToggleRead={handleToggleRead}
            onResetFilter={() => {
              setActiveFilter({ type: 'quick', id: 'today' });
              setSearchQuery('');
            }}
            onMarkAllAsRead={handleMarkAllAsRead}
            onOpenNotebook={handleOpenNotebook}
            onOpenBadgesModal={() => setIsBadgesModalOpen(true)}
          />
        </main>
      </div>

      {/* Floating Toast Notification when new post push arrives */}
      {toastNotification && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-[#0e1838] text-white rounded-2xl p-4 shadow-2xl border border-orange-500/30 flex items-start gap-3 animate-in slide-in-from-bottom-5">
          <div className="p-2 rounded-xl bg-orange-600 text-white shrink-0 mt-0.5">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
                Nuova Notifica Push
              </span>
              <button
                onClick={() => setToastNotification(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <h5 className="text-sm font-bold mt-0.5 truncate">
              {toastNotification.title}
            </h5>
            <p className="text-xs text-slate-300 mt-1 line-clamp-2">
              {toastNotification.body}
            </p>
            {toastNotification.postId && (
              <button
                onClick={() => {
                  const p =
                    posts.find((it) => it.id === toastNotification.postId) ||
                    accadeOggiPosts.find((it) => it.id === toastNotification.postId);
                  if (p) handleSelectPost(p);
                  markNotificationAsRead(toastNotification.id);
                  setToastNotification(null);
                }}
                className="mt-2 text-xs font-semibold text-orange-400 hover:text-orange-300 flex items-center gap-1"
              >
                <span>Leggi subito</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <ArticleModal
        post={selectedPost}
        onClose={handleClosePost}
        onToggleFavorite={handleToggleFavorite}
        isFavorite={selectedPost ? selectedPost.isFavorite || false : false}
        initialSearchQuery={searchQuery}
      />

      <InfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        onRefreshFeed={() => {
          loadAccadeOggiFeed(true);
          loadFeed(true);
        }}
        isRefreshing={isRefreshing}
        onOpenCookieSettings={() => {
          setIsCookieManageMode(true);
          setIsCookieModalOpen(true);
        }}
      />

      <NotificationCenterModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onSelectPostId={(postId) => {
          const p =
            posts.find((it) => it.id === postId) ||
            accadeOggiPosts.find((it) => it.id === postId);
          if (p) handleSelectPost(p);
        }}
      />

      {/* Badge Progress & Details Modal */}
      <BadgeModal
        isOpen={isBadgesModalOpen}
        onClose={() => setIsBadgesModalOpen(false)}
        totalArticles={posts.length}
        onExploreArchive={() => {
          setActiveFilter({ type: 'quick', id: 'all' });
          setSearchQuery('');
        }}
      />

      {/* Celebratory Modal when a badge tier is freshly unlocked */}
      <BadgeUnlockCelebrationModal
        badge={celebrationBadge}
        onClose={() => setCelebrationBadge(null)}
        onViewAllBadges={() => {
          setCelebrationBadge(null);
          setIsBadgesModalOpen(true);
        }}
      />


      {/* PWA Offline indicator */}
      <OfflineIndicator />

      {/* Proactive PWA Install Banner */}
      <PWAInstallBanner />

      {/* Cookie Consent Modal / Banner (Informativa sui Cookie) */}
      <CookieConsentModal
        isOpen={isCookieModalOpen}
        onClose={() => setIsCookieModalOpen(false)}
        isManageMode={isCookieManageMode}
      />
    </div>
  );
}
