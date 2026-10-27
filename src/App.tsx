/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ArticleList } from './components/ArticleList';
import { ArticleModal } from './components/ArticleModal';
import { ArchiveArticlePromptModal } from './components/ArchiveArticlePromptModal';
import { InfoModal } from './components/InfoModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { BadgeModal } from './components/BadgeModal';
import { BadgeUnlockCelebrationModal } from './components/BadgeUnlockCelebrationModal';
import { checkAndUnlockBadges, BadgeTier } from './services/badgeService';
import { openExternalBrowser } from './utils/browserLauncher';


import { OfflineIndicator } from './components/OfflineIndicator';
import { RemoteAnnouncementBanner } from './components/RemoteAnnouncementBanner';
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
import { decodeHtmlEntities } from './utils/textUtils';
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
  getFeedCacheTimestamp,
  isMagazineUrl,
  findPostByUrl,
  fetchPostByUrl,
  saveOrUpdatePostInCache,
  initBloggerStorage,
  getCategoryFeedCache,
  getCategoryDownloadedAt,
} from './services/bloggerFeed';
import {
  cleanupOldLocalStorageKeys,
  requestPersistentStorage,
  saveArticlesToDB,
  isMagazineArticle,
} from './utils/idbStorage';
import { initBadgesStorage } from './services/badgeService';
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
  getAccadeOggiCacheTimestamp,
  initAccadeOggiStorage,
  UpdateFailedWithCacheError,
} from './services/accadeOggiFeed';
import { NAV_SECTIONS, GOOGLE_NOTEBOOK_URL } from './config/navigation';
import { openNotebookWithPriority } from './utils/notebookLauncher';
import { useTheme } from './hooks/useTheme';
import { useInterfaceZoom } from './hooks/useInterfaceZoom';
import { usePWAInstall } from './hooks/usePWAInstall';
import {
  initPwaUpdate,
  checkPwaUpdateOnForeground,
} from './services/pwaUpdateService';
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
  const {
    zoomLevel,
    zoomIn,
    zoomOut,
    setZoom,
    resetZoom,
  } = useInterfaceZoom();
  const sections = NAV_SECTIONS;
  const { isInstalled, isStandalone } = usePWAInstall();
  const isAppInstalled = Boolean(isInstalled || isStandalone);

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

  // Refs per evitare cicli infiniti di ri-render / spike CPU nei caricamenti on-demand
  const categoryFeedsRef = useRef<Record<string, CategoryFeedState>>({});
  categoryFeedsRef.current = categoryFeeds;
  const categoryLoadInFlightRef = useRef<Record<string, boolean>>({});
  const postsRef = useRef<BloggerPost[]>(posts);
  postsRef.current = posts;

  // Accade Oggi feed (strictly at most 15 posts, separate from archive)
  const [accadeOggiPosts, setAccadeOggiPosts] = useState<BloggerPost[]>(() => getCachedAccadeOggiPosts());
  const [isAccadeOggiLoading, setIsAccadeOggiLoading] = useState<boolean>(() => getCachedAccadeOggiPosts().length === 0);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineSearchResults, setOnlineSearchResults] = useState<Record<string, BloggerPost[]>>({});
  const activeSearchReqIdRef = useRef<number>(0);


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

  // Link interception popup state for magazine.5lb.eu links
  const [promptArticleUrl, setPromptArticleUrl] = useState<string | null>(null);
  const [isDownloadingArticle, setIsDownloadingArticle] = useState(false);


  // Active in-app Toast Notification
  const [toastNotification, setToastNotification] = useState<NotificationItem | null>(null);

  // Unread notifications count
  const [notifications, setNotifications] = useState<NotificationItem[]>(getStoredNotifications());
  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // Section load error tracking for empty-cache failure states
  const [sectionErrors, setSectionErrors] = useState<Record<string, boolean>>({});

  // Discreet auto-closing banner notice ("Aggiornamento non riuscito, contenuti salvati")
  const [discreetNotice, setDiscreetNotice] = useState<string | null>(null);
  const discreetNoticeTimerRef = useRef<any>(null);

  const showDiscreetNotice = useCallback((msg: string) => {
    if (discreetNoticeTimerRef.current) {
      clearTimeout(discreetNoticeTimerRef.current);
    }
    setDiscreetNotice(msg);
    discreetNoticeTimerRef.current = setTimeout(() => {
      setDiscreetNotice(null);
    }, 4000);
  }, []);

  // Stale-While-Revalidate: background load & revalidation of main feed (15 items)
  const loadFeed = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const res = await fetchBloggerPosts({
        maxResults: 15,
        startIndex: 1,
        forceRefresh: isManualRefresh,
      });
      setSectionErrors((prev) => ({ ...prev, all: false }));

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
              title: 'Nuovo articolo: ' + decodeHtmlEntities(newestNetwork.title),
              body: decodeHtmlEntities(newestNetwork.summary).slice(0, 110) + '...',
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
      if (postsRef.current.length > 0) {
        showDiscreetNotice('Aggiornamento non riuscito, contenuti salvati');
        setSectionErrors((prev) => ({ ...prev, all: false }));
      } else {
        setSectionErrors((prev) => ({ ...prev, all: true }));
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showDiscreetNotice]);

  // Accade Oggi: background load & revalidation of Atom feed (strictly 15 items max)
  const loadAccadeOggiFeed = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const fetched = await fetchAccadeOggiPosts({ forceRefresh: isManualRefresh });
      setSectionErrors((prev) => ({ ...prev, today: false }));

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
                title: 'Accade Oggi: ' + decodeHtmlEntities(newestNetwork.title),
                body: decodeHtmlEntities(newestNetwork.summary).slice(0, 110) + '...',
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
    } catch (err: any) {
      console.error('Errore caricamento feed Accade Oggi:', err);
      const hasCached = getCachedAccadeOggiPosts().length > 0;
      if (err instanceof UpdateFailedWithCacheError || hasCached) {
        if (err.cachedPosts && err.cachedPosts.length > 0) {
          setAccadeOggiPosts(err.cachedPosts);
        }
        showDiscreetNotice('Aggiornamento non riuscito, contenuti salvati');
        setSectionErrors((prev) => ({ ...prev, today: false }));
      } else {
        setSectionErrors((prev) => ({ ...prev, today: true }));
      }
    } finally {
      setIsAccadeOggiLoading(false);
      if (isManualRefresh) setIsRefreshing(false);
    }
  }, [showDiscreetNotice]);

  useEffect(() => {
    // 1. Pulizia vecchie chiavi localStorage e richiesta persistenza IndexedDB
    cleanupOldLocalStorageKeys();
    requestPersistentStorage().catch(() => {});

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

    // Inizializzazione registrazione Service Worker per aggiornamenti silenziosi in background
    const cleanupPwaListener = initPwaUpdate();

    // Controllo aggiornamenti PWA all'avvio con limite 24 ore
    checkPwaUpdateOnForeground().catch(() => {});

    // Inizializza archivio badge da IndexedDB
    initBadgesStorage().catch(() => {});

    // Inizializza feed Accade Oggi da IndexedDB (visualizzazione istantanea 0ms da cache)
    initAccadeOggiStorage().then(({ posts: aoPosts, lastCheckedAt }) => {
      if (aoPosts.length > 0) {
        setAccadeOggiPosts(aoPosts);
        setIsAccadeOggiLoading(false);
      }
      // Verifica in background nel rispetto della finestra minima (30 min) e deduplicazione
      loadAccadeOggiFeed(false);
    }).catch(() => {
      loadAccadeOggiFeed(true);
    });

    // Inizializza feed principale e articoli da IndexedDB (stale-while-revalidate: circa 6 ore)
    initBloggerStorage().then(({ posts: cachedArticles, feedDownloadedAt }) => {
      if (cachedArticles.length > 0) {
        setPosts(cachedArticles);
        setIsLoading(false);
        syncNewestPostWithSW(cachedArticles).catch(() => {});
      }
      const isMainFresh = feedDownloadedAt > 0 && Date.now() - feedDownloadedAt < FEED_SYNC_CONFIG.FOREGROUND_POLL_MS;
      if (!isMainFresh || cachedArticles.length === 0) {
        loadFeed(false);
      }
    }).catch(() => {
      loadFeed(false);
    });

    // 2) Controllo al ritorno in primo piano (focus / visibilitychange)
    const handleForeground = () => {
      if (document.visibilityState === 'visible') {
        // Controllo aggiornamenti PWA / Service Worker (massimo 1 volta ogni 24 ore)
        checkPwaUpdateOnForeground().catch(() => {});

        // Verifica Accade Oggi con logica di intervallo minimo 30 min, slot UTC e jitter anti-Thundering Herd
        loadAccadeOggiFeed(false);

        // Verifica feed principale con intervallo 6 ore
        const lastFetchMain = getFeedCacheTimestamp();
        if (Date.now() - lastFetchMain >= FEED_SYNC_CONFIG.FOREGROUND_POLL_MS) {
          loadFeed(false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleForeground);
    window.addEventListener('focus', handleForeground);

    // 3) Se l'app resta aperta a lungo: ricontrolla a intervalli regolari (ogni 30 minuti)
    const interval = setInterval(handleForeground, 30 * 60 * 1000);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleForeground);
      window.removeEventListener('focus', handleForeground);
      cleanupSWListener();
      cleanupPwaListener();
    };
  }, [loadFeed, loadAccadeOggiFeed]);

  // On-demand category loading: populate category list only when selected (stale-while-revalidate da IndexedDB)
  useEffect(() => {
    let isCancelled = false;

    if (activeFilter.type === 'rss' && activeFilter.category) {
      const catKey = activeFilter.category.trim();

      // Se già in caricamento per questa categoria, non avviare una richiesta concorrente
      if (categoryLoadInFlightRef.current[catKey]) {
        return;
      }

      const loadCategory = async () => {
        categoryLoadInFlightRef.current[catKey] = true;

        try {
          // 1. Prova prima la cache da IndexedDB per risposta istantanea (0ms)
          if (!categoryFeedsRef.current[catKey]) {
            const cached = await getCategoryFeedCache(catKey);
            if (cached && !isCancelled) {
              setCategoryFeeds((prev) => ({
                ...prev,
                [catKey]: {
                  posts: cached.posts,
                  hasMore: cached.hasMore,
                  totalResults: cached.totalResults,
                },
              }));
              const isFresh = Date.now() - cached.downloadedAt < FEED_SYNC_CONFIG.FOREGROUND_POLL_MS;
              if (isFresh || !navigator.onLine) {
                return; // Già fresco (<6 ore) o offline: terminato senza chiamate di rete
              }
            }
          }

          // 2. Se offline e non presente in IndexedDB: popola con gli articoli già presenti in locale nel Magazine
          if (!navigator.onLine) {
            if (!categoryFeedsRef.current[catKey] && !isCancelled) {
              const localMatches = postsRef.current.filter(
                (p) => Array.isArray(p.categories) && p.categories.some((c) => c.toLowerCase() === catKey.toLowerCase())
              );
              setCategoryFeeds((prev) => ({
                ...prev,
                [catKey]: {
                  posts: localMatches,
                  hasMore: false,
                  totalResults: localMatches.length,
                },
              }));
            }
            return;
          }

          // 3. Se online e non in cache o scaduto (> 6 ore): scarica dal network
          const downloadedAt = await getCategoryDownloadedAt(catKey);
          const needsUpdate =
            !categoryFeedsRef.current[catKey] ||
            downloadedAt === 0 ||
            Date.now() - downloadedAt >= FEED_SYNC_CONFIG.FOREGROUND_POLL_MS;

          if (needsUpdate && !isCancelled) {
            if (!categoryFeedsRef.current[catKey]) setIsCategoryLoading(true);
            try {
              const res = await fetchBloggerPosts({
                category: catKey,
                startIndex: 1,
                maxResults: 15,
              });
              if (!isCancelled) {
                setSectionErrors((prev) => ({ ...prev, [catKey]: false }));
                setCategoryFeeds((prev) => ({
                  ...prev,
                  [catKey]: {
                    posts: res.posts,
                    hasMore: res.hasMore,
                    totalResults: res.totalResults,
                  },
                }));

                // Unisci con i post globali del Magazine per ricerca locale e conteggi badge
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
                  saveArticlesToDB(merged).catch(() => {});
                  return merged;
                });
              }
            } catch (e) {
              console.warn('Errore nel caricamento del feed della categoria:', e);
              const cached = categoryFeedsRef.current[catKey]?.posts || [];
              const localMatches = postsRef.current.filter(
                (p) => Array.isArray(p.categories) && p.categories.some((c) => c.toLowerCase() === catKey.toLowerCase())
              );
              if (cached.length > 0 || localMatches.length > 0) {
                showDiscreetNotice('Aggiornamento non riuscito, contenuti salvati');
                setSectionErrors((prev) => ({ ...prev, [catKey]: false }));
                if (!categoryFeedsRef.current[catKey] && !isCancelled) {
                  setCategoryFeeds((prev) => ({
                    ...prev,
                    [catKey]: {
                      posts: localMatches,
                      hasMore: false,
                      totalResults: localMatches.length,
                    },
                  }));
                }
              } else {
                setSectionErrors((prev) => ({ ...prev, [catKey]: true }));
              }
            } finally {
              if (!isCancelled) setIsCategoryLoading(false);
            }
          }
        } finally {
          categoryLoadInFlightRef.current[catKey] = false;
        }
      };

      loadCategory();
    }

    return () => {
      isCancelled = true;
    };
  }, [activeFilter]);

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
          saveArticlesToDB(merged).catch(() => {});
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
          saveArticlesToDB(merged).catch(() => {});
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

  // Verifica se la sezione attiva ha fallito il caricamento con cache vuota
  const currentViewLoadError = useMemo(() => {
    if (activeFilter.type === 'quick') {
      if (activeFilter.id === 'today') return Boolean(sectionErrors['today']);
      if (activeFilter.id === 'all') return Boolean(sectionErrors['all']);
      return false;
    }
    if (activeFilter.type === 'rss' && activeFilter.category) {
      return Boolean(sectionErrors[activeFilter.category.trim()]);
    }
    return false;
  }, [activeFilter, sectionErrors]);

  const handleRetrySection = useCallback(() => {
    if (activeFilter.type === 'quick' && activeFilter.id === 'today') {
      setSectionErrors((prev) => ({ ...prev, today: false }));
      setIsAccadeOggiLoading(true);
      loadAccadeOggiFeed(true);
    } else if (activeFilter.type === 'quick' && activeFilter.id === 'all') {
      setSectionErrors((prev) => ({ ...prev, all: false }));
      setIsLoading(true);
      loadFeed(true);
    } else if (activeFilter.type === 'rss' && activeFilter.category) {
      const catKey = activeFilter.category.trim();
      setSectionErrors((prev) => ({ ...prev, [catKey]: false }));
      setIsCategoryLoading(true);
      categoryLoadInFlightRef.current[catKey] = false;
      fetchBloggerPosts({
        category: catKey,
        startIndex: 1,
        maxResults: 15,
        forceRefresh: true,
      })
        .then((res) => {
          setCategoryFeeds((prev) => ({
            ...prev,
            [catKey]: {
              posts: res.posts,
              hasMore: res.hasMore,
              totalResults: res.totalResults,
            },
          }));
          setSectionErrors((prev) => ({ ...prev, [catKey]: false }));
        })
        .catch((err) => {
          console.warn('Retry fallito per categoria:', err);
          const cached = categoryFeedsRef.current[catKey]?.posts || [];
          if (cached.length > 0) {
            showDiscreetNotice('Aggiornamento non riuscito, contenuti salvati');
            setSectionErrors((prev) => ({ ...prev, [catKey]: false }));
          } else {
            setSectionErrors((prev) => ({ ...prev, [catKey]: true }));
          }
        })
        .finally(() => {
          setIsCategoryLoading(false);
        });
    }
  }, [activeFilter, loadAccadeOggiFeed, loadFeed, showDiscreetNotice]);

  // Filter Title label & search placeholder
  const isAllArchive = activeFilter.type === 'quick' && activeFilter.id === 'all';
  const searchPlaceholder = isAllArchive
    ? "Cerca in tutto l'archivio locale..."
    : "Cerca in questa categoria...";

  const filterTitle = useMemo(() => {
    if (searchQuery.trim()) {
      if (activeFilter.type === 'rss') {
        const catName = activeFilter.label || activeFilter.category;
        return `Risultati per "${searchQuery}" in ${catName}`;
      }
      if (activeFilter.type === 'quick') {
        if (activeFilter.id === 'today') return `Risultati per "${searchQuery}" in Accade Oggi`;
        if (activeFilter.id === 'unread') return `Risultati per "${searchQuery}" in Non letti`;
        if (activeFilter.id === 'favorites') return `Risultati per "${searchQuery}" nei salvati`;
        if (activeFilter.id === 'all') return `Risultati per "${searchQuery}" in tutto l'archivio`;
      }
      return `Risultati per "${searchQuery}" in questa categoria`;
    }

    if (activeFilter.type === 'quick') {
      if (activeFilter.id === 'today') return 'Accade Oggi';
      if (activeFilter.id === 'all') return 'Il mio archivio';
      if (activeFilter.id === 'unread') return 'Articoli Non Letti';
      if (activeFilter.id === 'favorites') return 'Articoli salvati';
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
      window.history.pushState({ postId: post.id }, decodeHtmlEntities(post.title), articlePath);
    }
    document.title = `${decodeHtmlEntities(post.title)} — 5LB Magazine`;

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

  // 1) Debounce di 500ms per ricerca remota online (solo se query >= 3 caratteri)
  // Il filtro locale sui post già presenti in cache resta 100% istantaneo in useMemo
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 3) {
      return;
    }

    if (onlineSearchResults[trimmed.toLowerCase()]) {
      return;
    }

    const reqId = ++activeSearchReqIdRef.current;
    const timer = setTimeout(async () => {
      setIsSearchingOnline(true);
      try {
        const res = await searchBloggerArchive(trimmed, 30);
        // Scarta la risposta se nel frattempo è partita una ricerca più recente (race conditions)
        if (reqId !== activeSearchReqIdRef.current || res.isStale) {
          return;
        }

        if (res.posts.length > 0) {
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
            saveArticlesToDB(merged).catch(() => {});
            return merged;
          });
        }
      } catch (err) {
        if (reqId === activeSearchReqIdRef.current) {
          console.warn('Errore ricerca remota archivio (debounced):', err);
        }
      } finally {
        if (reqId === activeSearchReqIdRef.current) {
          setIsSearchingOnline(false);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, onlineSearchResults]);

  // Online archive search handler manuale (es. click pulsante "Cerca altri risultati online")
  const handleSearchOnline = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setToastNotification({
        id: 'search-min-chars-' + Date.now(),
        title: 'Ricerca archivio online',
        body: 'La ricerca remota richiede almeno 3 caratteri.',
        date: new Date().toISOString(),
        read: false,
      });
      return;
    }
    if (isSearchingOnline) return;

    const reqId = ++activeSearchReqIdRef.current;
    setIsSearchingOnline(true);
    trackEvent('search', { search_term: trimmed });
    try {
      const res = await searchBloggerArchive(trimmed, 30);
      // Se una risposta JSONP arriva dopo che è già partita una ricerca più recente, scartala
      if (reqId !== activeSearchReqIdRef.current || res.isStale) {
        return;
      }

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

          // Persist merged cache to IndexedDB
          saveArticlesToDB(merged).catch(() => {});
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
        // Nessun articolo trovato online: mostra fumetto informativo e RESTA SULLA PAGINA DI RICERCA
        setToastNotification({
          id: 'search-empty-' + Date.now(),
          title: 'Nessun risultato online',
          body: `Nessun nuovo articolo trovato nell'archivio online per "${trimmed}".`,
          date: new Date().toISOString(),
          read: false,
        });
      }
    } catch (err) {
      if (reqId === activeSearchReqIdRef.current) {
        console.warn('Errore durante la ricerca online:', err);
        setToastNotification({
          id: 'search-error-' + Date.now(),
          title: 'Ricerca online non riuscita',
          body: `Impossibile completare la ricerca per "${trimmed}". Riprova più tardi.`,
          date: new Date().toISOString(),
          read: false,
        });
      }
    } finally {
      if (reqId === activeSearchReqIdRef.current) {
        setIsSearchingOnline(false);
      }
    }
  }, [isSearchingOnline]);

  // Matching existing post for link interception modal
  const promptExistingPost = useMemo(() => {
    if (!promptArticleUrl) return null;
    return findPostByUrl(promptArticleUrl, posts) || null;
  }, [promptArticleUrl, posts]);

  // Handler per intercettare i link agli articoli di magazine.5lb.eu:
  // Se l'app NON è installata, apre direttamente nel browser esterno;
  // Se l'app È installata (PWA standalone), apre il popup di download / aggiornamento nell'archivio.
  const handleInterceptArticleLink = useCallback(
    (url: string) => {
      if (!isAppInstalled) {
        openExternalBrowser(url);
        return;
      }
      setPromptArticleUrl(url);
    },
    [isAppInstalled]
  );

  // Handler per aprire link dal banner remoto:
  // Se è un articolo 5LB presente in memoria, lo apre nel visualizzatore nativo;
  // per tutti gli altri link (Google NotebookLM, pagine esterne, ecc.), apre nel browser integrato di sistema
  const handleOpenBannerUrl = useCallback(
    (url: string) => {
      if (!url) return;
      if (isMagazineUrl(url)) {
        const match = findPostByUrl(url, posts);
        if (match) {
          handleSelectPost(match);
          return;
        }
      }
      openExternalBrowser(url);
    },
    [posts, handleSelectPost]
  );

  const handleOpenBannerArticle = useCallback(
    (urlOrId: string) => {
      if (!urlOrId) return;
      const match =
        posts.find((p) => p.id === urlOrId || p.link === urlOrId) ||
        accadeOggiPosts.find((p) => p.id === urlOrId || p.link === urlOrId) ||
        findPostByUrl(urlOrId, posts);
      if (match) {
        handleSelectPost(match);
      } else {
        openExternalBrowser(urlOrId);
      }
    },
    [posts, accadeOggiPosts, handleSelectPost]
  );

  // Handler for downloading / updating an article from a magazine.5lb.eu URL into local archive
  // Segna automaticamente l'articolo nella categoria "Salva per dopo" (isFavorite: true)
  const handleDownloadArticleByUrl = useCallback(
    async (url: string) => {
      setIsDownloadingArticle(true);
      try {
        const fetchedPost = await fetchPostByUrl(url);
        const { updatedPosts, isUpdate, post: savedPost } = saveOrUpdatePostInCache(
          fetchedPost,
          posts,
          { markFavorite: true }
        );
        setPosts(updatedPosts);

        // Check for newly unlocked badges based on the updated count of collected articles
        const newlyUnlocked = checkAndUnlockBadges(updatedPosts.length);
        if (newlyUnlocked.length > 0) {
          setCelebrationBadge(newlyUnlocked[newlyUnlocked.length - 1]);
        }

        // Show toast notification
        setToastNotification({
          id: 'archive-notif-' + Date.now(),
          title: isUpdate ? 'Articolo aggiornato in "Salva per dopo"' : 'Articolo salvato in "Salva per dopo"',
          body: isUpdate
            ? `"${savedPost.title}" era già presente, è stato aggiornato e contrassegnato in "Salva per dopo".`
            : `"${savedPost.title}" è stato scaricato in RSS e aggiunto a "Salva per dopo" (${updatedPosts.length} articoli totali).`,
          date: new Date().toISOString(),
          read: false,
          postId: savedPost.id,
          url: savedPost.link,
        });

        setPromptArticleUrl(null);
      } catch (err: any) {
        console.error('Errore scaricamento articolo via RSS:', err);
        setToastNotification({
          id: 'archive-err-' + Date.now(),
          title: 'Scaricamento non riuscito',
          body: err?.message || 'Impossibile scaricare l’articolo via RSS. Puoi aprirlo nel browser.',
          date: new Date().toISOString(),
          read: false,
        });
        throw err;
      } finally {
        setIsDownloadingArticle(false);
      }
    },
    [posts]
  );

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
            // I link nella sidebar di navigazione si aprono normalmente nel browser
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
        zoomLevel={zoomLevel}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onSetZoom={setZoom}
        onResetZoom={resetZoom}
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
          searchPlaceholder={searchPlaceholder}
        />

        {/* Article Feed Area */}
        <main className="flex-1 overflow-y-auto overscroll-y-contain">
          {/* Banner di annuncio remoto (GitHub Gist) ancorato sotto la barra del logo e sopra le categorie RSS */}
          <RemoteAnnouncementBanner
            onOpenUrl={handleOpenBannerUrl}
            onOpenArticle={handleOpenBannerArticle}
          />

          <ArticleList
            posts={currentViewPosts}
            totalArchiveArticles={posts.length}
            isLoading={isCurrentViewLoading}
            isLoadingMore={isCurrentViewLoadingMore}
            hasMore={currentViewHasMore}
            onLoadMore={handleLoadMore}
            loadError={currentViewLoadError}
            onRetry={handleRetrySection}
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

      {/* Avviso discreto auto-chiudente ("Aggiornamento non riuscito, contenuti salvati") */}
      {discreetNotice && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 animate-in fade-in slide-in-from-top-3 duration-300 pointer-events-auto">
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/95 dark:bg-slate-800/95 text-white backdrop-blur-md shadow-lg border border-slate-700/60 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span>{discreetNotice}</span>
            <button
              onClick={() => setDiscreetNotice(null)}
              className="ml-1 p-0.5 text-slate-400 hover:text-white rounded transition cursor-pointer"
              aria-label="Chiudi avviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

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
        onInterceptLink={handleInterceptArticleLink}
      />

      {/* Confirmation & Archive Download Modal for magazine.5lb.eu links */}
      <ArchiveArticlePromptModal
        isOpen={Boolean(promptArticleUrl)}
        onClose={() => setPromptArticleUrl(null)}
        targetUrl={promptArticleUrl}
        existingPost={promptExistingPost}
        onConfirmDownload={handleDownloadArticleByUrl}
        onOpenExternal={(url) => openExternalBrowser(url)}
        isDownloading={isDownloadingArticle}
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

      {/* Banner installazione PWA (riconosce browser e SO) */}
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
