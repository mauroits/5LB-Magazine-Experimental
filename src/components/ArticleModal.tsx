import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X,
  ExternalLink,
  Share2,
  Heart,
  Volume2,
  VolumeX,
  Minus,
  Plus,
  Calendar,
  User,
  Tag,
  Check,
  Search,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Square,
  Facebook,
  Instagram,
  Youtube,
  Send
} from 'lucide-react';
import { BloggerPost } from '../types';
import { formatItalianDate, isMagazineUrl } from '../services/bloggerFeed';
import { highlightHtmlContent } from '../utils/searchUtils';
import { sanitizeArticleHtml } from '../utils/sanitizeHtml';
import { toHttpsUrl, toHttpOrHttpsUrl } from '../utils/safeUrl';
import { trackEvent } from '../services/analytics';
import { openExternalBrowser } from '../utils/browserLauncher';
import { decodeHtmlEntities } from '../utils/textUtils';

export interface ArticleChunk {
  index: number;
  text: string;
  wordCount: number;
}

/**
 * Robust extraction of the entire article body from Blogger HTML.
 * Strips script, style, ads and media while preserving natural line breaks for block elements.
 * Generates uniform universal chunks (~40-50 words per chunk) aligned to natural sentence boundaries.
 * Prevents isolated subtitles, bullet items, or parentheses from creating erratic micro-jumps.
 */
export function extractArticleChunks(
  title: string,
  contentHtml: string,
  targetWordsPerChunk = 45
): ArticleChunk[] {
  let fullText = '';
  const cleanTitle = (title || '').replace(/\s+/g, ' ').trim();

  try {
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(contentHtml || '', 'text/html');

      // Strip non-content and embed elements
      doc
        .querySelectorAll('script, style, iframe, noscript, svg, audio, video, img, figure, button, form')
        .forEach((el) => el.remove());

      // Add line breaks for block-level elements so headings, paragraphs, and list items separate naturally
      const blockTags = [
        'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'tr', 'section', 'article', 'br', 'hr',
      ];
      blockTags.forEach((tag) => {
        doc.querySelectorAll(tag).forEach((el) => {
          if (tag === 'br' || tag === 'hr') {
            el.replaceWith(document.createTextNode('\n'));
          } else {
            el.after(document.createTextNode('\n'));
          }
        });
      });

      const rawText = doc.body.textContent || '';
      const cleanBody = decodeHtmlEntities(rawText)
        .replace(/\r\n/g, '\n')
        .replace(/\t/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n+/g, '\n')
        .trim();

      if (cleanTitle && cleanBody) {
        if (cleanBody.toLowerCase().startsWith(cleanTitle.toLowerCase())) {
          fullText = cleanBody;
        } else {
          fullText = `${cleanTitle}.\n\n${cleanBody}`;
        }
      } else {
        fullText = cleanTitle || cleanBody;
      }
    } else {
      const raw = (title + '. ' + (contentHtml || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
      fullText = raw;
    }
  } catch {
    fullText = `${cleanTitle}. ${(contentHtml || '').replace(/<[^>]+>/g, ' ')}`.replace(/\s+/g, ' ').trim();
  }

  if (!fullText.trim()) {
    return cleanTitle
      ? [{ index: 0, text: cleanTitle, wordCount: cleanTitle.split(/\s+/).filter(Boolean).length }]
      : [];
  }

  // Tokenize by sentence boundaries (. ! ? \n)
  const rawSentences = fullText.match(/[^.!?\n]+(?:[.!?]+|\n+|$)/g) || [fullText];
  const chunkTexts: string[] = [];
  let currentWords: string[] = [];

  for (const raw of rawSentences) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    // If an extraordinarily long sentence exists (> 65 words), break it into smaller sub-clauses
    if (words.length > 65) {
      if (currentWords.length > 0) {
        chunkTexts.push(currentWords.join(' '));
        currentWords = [];
      }
      for (let i = 0; i < words.length; i += targetWordsPerChunk) {
        chunkTexts.push(words.slice(i, i + targetWordsPerChunk).join(' '));
      }
      continue;
    }

    if (currentWords.length + words.length <= targetWordsPerChunk + 10) {
      currentWords.push(...words);
    } else {
      if (currentWords.length >= 22) {
        chunkTexts.push(currentWords.join(' '));
        currentWords = [...words];
      } else {
        currentWords.push(...words);
        chunkTexts.push(currentWords.join(' '));
        currentWords = [];
      }
    }
  }

  if (currentWords.length > 0) {
    chunkTexts.push(currentWords.join(' '));
  }

  const finalChunks = chunkTexts
    .map((txt) => txt.trim())
    .filter((txt) => txt.length > 0)
    .map((text, index) => ({
      index,
      text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
    }));

  return finalChunks.length > 0
    ? finalChunks
    : [{ index: 0, text: cleanTitle || 'Testo articolo', wordCount: (cleanTitle || '').split(/\s+/).filter(Boolean).length || 1 }];
}

// Compatibility helper
export function parseArticleParagraphs(title: string, contentHtml: string): string[] {
  return extractArticleChunks(title, contentHtml).map((c) => c.text);
}

interface ArticleModalProps {
  post: BloggerPost | null;
  onClose: () => void;
  onToggleFavorite: (postId: string) => void;
  isFavorite: boolean;
  initialSearchQuery?: string;
  onInterceptLink?: (url: string) => void;
}

export const ArticleModal: React.FC<ArticleModalProps> = ({
  post,
  onClose,
  onToggleFavorite,
  isFavorite,
  initialSearchQuery = '',
  onInterceptLink,
}) => {
  const [fontSize, setFontSize] = useState<number>(17); // base px
  const [copied, setCopied] = useState(false);

  // In-article word search state
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(Boolean(initialSearchQuery.trim()));
  const [searchWord, setSearchWord] = useState<string>(initialSearchQuery.trim());
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isExactWord, setIsExactWord] = useState<boolean>(true);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync search query when post changes or initial query arrives:
  // Se la ricerca è vuota (ricerca resettata, uscita dalla ricerca, cambio categoria o home),
  // dimentica e azzera completamente qualsiasi parola cercata in precedenza.
  useEffect(() => {
    const trimmed = initialSearchQuery.trim();
    if (trimmed) {
      setSearchWord(trimmed);
      setIsSearchOpen(true);
      setActiveIndex(0);
    } else {
      setSearchWord('');
      setIsSearchOpen(false);
      setActiveIndex(0);
    }
  }, [post?.id, initialSearchQuery]);

  // Native Web Speech Synthesis state and refs
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);

  const chunks = useMemo(() => {
    if (!post) return [];
    return extractArticleChunks(post.title, post.content);
  }, [post?.title, post?.content]);

  const currentChunkIndexRef = useRef<number>(0);
  const isSpeakingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const chunksRef = useRef<ArticleChunk[]>([]);
  chunksRef.current = chunks;

  const stopSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isSpeakingRef.current = false;
    isPausedRef.current = false;
    setIsSpeaking(false);
    setIsPaused(false);
    currentChunkIndexRef.current = 0;
    setCurrentChunkIndex(0);
  }, []);

  const speakChunk = useCallback(
    (index: number) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      const currentChunks = chunksRef.current;
      if (index < 0 || index >= currentChunks.length) {
        stopSpeech();
        return;
      }

      // Stop any current utterance
      window.speechSynthesis.cancel();

      currentChunkIndexRef.current = index;
      setCurrentChunkIndex(index);
      isSpeakingRef.current = true;
      isPausedRef.current = false;
      setIsSpeaking(true);
      setIsPaused(false);

      const chunk = currentChunks[index];
      const utterance = new SpeechSynthesisUtterance(chunk.text);
      utterance.lang = 'it-IT';
      utterance.rate = 1.0;

      // Select Italian voice if installed in browser
      const voices = window.speechSynthesis.getVoices();
      const itVoice = voices.find((v) => v.lang.startsWith('it'));
      if (itVoice) {
        utterance.voice = itVoice;
      }

      utterance.onend = () => {
        if (isSpeakingRef.current && !isPausedRef.current) {
          if (index + 1 < currentChunks.length) {
            speakChunk(index + 1);
          } else {
            stopSpeech();
          }
        }
      };

      utterance.onerror = (e) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          if (isSpeakingRef.current && !isPausedRef.current) {
            stopSpeech();
          }
        }
      };

      window.speechSynthesis.speak(utterance);
    },
    [stopSpeech]
  );

  const handleTogglePlayPause = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isPausedRef.current) {
      // Resume reading from current chunk
      speakChunk(currentChunkIndexRef.current);
    } else {
      // Pause
      window.speechSynthesis.cancel();
      isPausedRef.current = true;
      setIsPaused(true);
    }
  }, [speakChunk]);

  const handleNextChunk = useCallback(() => {
    if (currentChunkIndexRef.current < chunks.length - 1) {
      speakChunk(currentChunkIndexRef.current + 1);
    }
  }, [chunks.length, speakChunk]);

  const handlePrevChunk = useCallback(() => {
    if (currentChunkIndexRef.current > 0) {
      speakChunk(currentChunkIndexRef.current - 1);
    }
  }, [speakChunk]);

  const startSpeech = useCallback(() => {
    if (!post || chunks.length === 0) return;
    speakChunk(0);
  }, [post, chunks.length, speakChunk]);

  const toggleSpeech = () => {
    if (isSpeaking) {
      stopSpeech();
    } else {
      startSpeech();
    }
  };

  // Stop speech when post changes or modal is closed
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, [post?.id, stopSpeech]);

  // Sanitize raw HTML content (from Blogger and Telegram feed) with DOMPurify
  const safeHtmlContent = useMemo(() => {
    if (!post?.content) return '';
    return sanitizeArticleHtml(post.content);
  }, [post?.content]);

  // Highlighted HTML content & match count computation
  const { highlightedHtml, totalMatches } = useMemo(() => {
    if (!safeHtmlContent) return { highlightedHtml: '', totalMatches: 0 };
    if (!isSearchOpen || !searchWord.trim()) {
      return { highlightedHtml: safeHtmlContent, totalMatches: 0 };
    }
    const highlighted = highlightHtmlContent(safeHtmlContent, searchWord, activeIndex, isExactWord);
    return {
      highlightedHtml: sanitizeArticleHtml(highlighted.highlightedHtml),
      totalMatches: highlighted.totalMatches,
    };
  }, [safeHtmlContent, isSearchOpen, searchWord, activeIndex, isExactWord]);

  // Jump to next match
  const handleNextMatch = useCallback(() => {
    if (totalMatches <= 0) return;
    setActiveIndex((prev) => (prev + 1) % totalMatches);
  }, [totalMatches]);

  // Jump to previous match
  const handlePrevMatch = useCallback(() => {
    if (totalMatches <= 0) return;
    setActiveIndex((prev) => (prev - 1 + totalMatches) % totalMatches);
  }, [totalMatches]);

  // Toggle in-article search bar
  const handleToggleSearch = useCallback(() => {
    setIsSearchOpen((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => searchInputRef.current?.focus(), 60);
      }
      return next;
    });
  }, []);

  // Smooth scroll to active highlighted match
  useEffect(() => {
    if (isSearchOpen && totalMatches > 0) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`article-match-${activeIndex}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeIndex, isSearchOpen, totalMatches, searchWord]);

  // Safe HTTP/HTTPS URL for original post link
  const safePostLink = useMemo(() => {
    return toHttpOrHttpsUrl(post?.link);
  }, [post?.link]);

  if (!post) return null;

  const handleShare = async () => {
    const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    const shareUrl = safePostLink || undefined;

    trackEvent('share', {
      method: canShare ? 'native_share' : 'clipboard',
      content_type: 'article',
      item_id: post.id,
      url: shareUrl,
    });

    if (canShare && shareUrl) {
      try {
        await navigator.share({
          url: shareUrl,
        });
      } catch (e) {
        // user cancelled
      }
    } else if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        // ignore
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">

      <div className="relative w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-3xl bg-white dark:bg-slate-900 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Sticky Reader Toolbar */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          {/* Left: Close button */}
          <button
            onClick={() => {
              stopSpeech();
              setSearchWord('');
              setIsSearchOpen(false);
              setActiveIndex(0);
              onClose();
            }}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Chiudi articolo"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Center: Font size adjuster & Speech */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl text-xs">
            <button
              onClick={() => setFontSize((s) => Math.max(14, s - 1))}
              className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
              title="Riduci dimensione testo"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-semibold text-slate-700 dark:text-slate-200 px-1">
              {fontSize}px
            </span>
            <button
              onClick={() => setFontSize((s) => Math.min(24, s + 1))}
              className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
              title="Aumenta dimensione testo"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right actions: Cerca parola, TTS, Favorite, Share, External Link */}
          <div className="flex items-center gap-1">
            {/* Pulsante Cerca parola nel testo */}
            <button
              onClick={handleToggleSearch}
              className={`p-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                isSearchOpen
                  ? 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400 font-semibold ring-1 ring-orange-500/40'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Cerca parola nel testo"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Cerca parola</span>
            </button>

            <button
              onClick={toggleSpeech}
              className={`p-2 rounded-xl transition cursor-pointer ${
                isSpeaking
                  ? 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400 animate-pulse'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={
                isSpeaking
                  ? 'Ferma lettura vocale'
                  : 'Ascolta articolo (Lettura vocale)'
              }
            >
              {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => onToggleFavorite(post.id)}
              className={`p-2 rounded-xl transition cursor-pointer ${
                isFavorite
                  ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current text-red-500' : ''}`} />
            </button>

            <button
              onClick={handleShare}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Condividi articolo"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            </button>

            {safePostLink && (
              <a
                href={safePostLink ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  openExternalBrowser(safePostLink);
                }}
                className="p-2 rounded-xl text-slate-500 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Apri articolo originale su magazine.5lb.eu"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Active Speech Control Bar */}
        {isSpeaking && (
          <div className="bg-orange-50/95 dark:bg-slate-800/95 border-b border-orange-200 dark:border-slate-700 px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-800 dark:text-slate-100 shadow-xs backdrop-blur-md animate-in fade-in">
            {/* Left: Indicator & Chunk Count */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                {!isPaused && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isPaused ? 'bg-amber-500' : 'bg-orange-500'}`}></span>
              </span>
              <span className="font-bold text-orange-950 dark:text-orange-200 truncate">
                Lettura vocale {isPaused ? 'in pausa' : 'attiva'}
              </span>
              {chunks.length > 0 && (
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-orange-100/80 dark:bg-slate-700/80 px-2 py-0.5 rounded-full shrink-0">
                  Blocco {currentChunkIndex + 1} di {chunks.length}
                  {chunks[currentChunkIndex]?.wordCount ? ` • ~${chunks[currentChunkIndex].wordCount} parole` : ''}
                </span>
              )}

            </div>

            {/* Right: Controls (Salto Indietro, Play/Pausa, Salto Avanti, Ferma) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Salto chunk indietro */}
              <button
                type="button"
                onClick={handlePrevChunk}
                disabled={currentChunkIndex <= 0}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-orange-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Salto indietro (~45 parole indietro)"
                aria-label="Salto indietro"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              {/* Play / Pausa */}
              <button
                type="button"
                onClick={handleTogglePlayPause}
                className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                title={isPaused ? 'Riprendi lettura vocale' : 'Metti in pausa'}
                aria-label={isPaused ? 'Riprendi lettura vocale' : 'Metti in pausa'}
              >
                {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
                <span className="text-[11px] font-bold">{isPaused ? 'Riprendi' : 'Pausa'}</span>
              </button>

              {/* Salto chunk avanti */}
              <button
                type="button"
                onClick={handleNextChunk}
                disabled={currentChunkIndex >= chunks.length - 1}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-orange-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Salto avanti (~45 parole avanti)"
                aria-label="Salto avanti"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              {/* Ferma */}
              <button
                type="button"
                onClick={stopSpeech}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer ml-1"
                title="Ferma lettura vocale"
                aria-label="Ferma lettura vocale"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
          </div>
        )}

        {/* Sticky In-Article Search Bar with Jump Arrows & Counter */}
        {isSearchOpen && (
          <div className="sticky top-[53px] z-20 bg-orange-50/95 dark:bg-slate-800/95 border-b border-orange-200 dark:border-slate-700 px-3 sm:px-5 py-2.5 flex flex-wrap items-center gap-2 text-xs backdrop-blur-md shadow-xs animate-in slide-in-from-top-2">
            <div className="relative flex-1 min-w-[170px]">
              <input
                ref={searchInputRef}
                type="text"
                value={searchWord}
                onChange={(e) => {
                  setSearchWord(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.shiftKey) handlePrevMatch();
                    else handleNextMatch();
                  } else if (e.key === 'Escape') {
                    setIsSearchOpen(false);
                    setSearchWord('');
                    setActiveIndex(0);
                  }
                }}
                placeholder="Cerca parola nell'articolo..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchWord && (
                <button
                  onClick={() => {
                    setSearchWord('');
                    setActiveIndex(0);
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="Cancella testo"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Counter Badge */}
            {searchWord.trim() && (
              <div className="shrink-0 text-[11px] font-medium">
                {totalMatches > 0 ? (
                  <span className="bg-orange-200/80 dark:bg-orange-950/80 text-orange-950 dark:text-orange-200 px-2 py-1 rounded-lg font-bold">
                    {activeIndex + 1} di {totalMatches}
                  </span>
                ) : (
                  <span className="text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-900/40">
                    Nessun risultato
                  </span>
                )}
              </div>
            )}

            {/* Freccia successiva e precedente per saltare nel testo */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handlePrevMatch}
                disabled={totalMatches <= 1}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-orange-100 dark:hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed transition cursor-pointer"
                title="Parola precedente (Shift+Invio)"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleNextMatch}
                disabled={totalMatches <= 1}
                className="px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-35 disabled:cursor-not-allowed transition shadow-xs flex items-center gap-1 text-[11px] font-semibold cursor-pointer active:scale-95"
                title="Salta alla parola successiva (Invio)"
              >
                <span>Successiva</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Exact Word Toggle */}
            <button
              onClick={() => {
                setIsExactWord((v) => !v);
                setActiveIndex(0);
              }}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition border cursor-pointer shrink-0 ${
                isExactWord
                  ? 'bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800'
                  : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}
              title={isExactWord ? 'Ricerca parola esatta attiva' : 'Ricerca parziale attiva'}
            >
              {isExactWord ? 'Esatta' : 'Parziale'}
            </button>

            {/* Close button */}
            <button
              onClick={() => {
                setIsSearchOpen(false);
                setSearchWord('');
                setActiveIndex(0);
              }}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-orange-100 dark:hover:bg-slate-700 rounded-lg shrink-0 cursor-pointer"
              title="Chiudi barra di ricerca"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scrollable Article Body */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overscroll-y-contain px-5 sm:px-10 py-6">
          {/* Comment row if opened from Accade Oggi feed */}
          {post.isAccadeOggi && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-sky-50 via-blue-50/60 to-indigo-50/60 dark:from-slate-800 dark:via-slate-800/90 dark:to-slate-800 border border-sky-200 dark:border-slate-700 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  Commenta su:
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Facebook */}
                  <a
                    href="https://www.facebook.com/5lbEvidenceBased"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      trackEvent('social_comment_click', { network: 'facebook', article_title: post.title });
                      openExternalBrowser('https://www.facebook.com/5lbEvidenceBased');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2] text-[#1877F2] hover:text-white dark:bg-[#1877F2]/20 dark:hover:bg-[#1877F2] dark:text-sky-300 dark:hover:text-white text-xs font-semibold transition active:scale-95 cursor-pointer border border-[#1877F2]/20"
                    title="Commenta su Facebook"
                  >
                    <Facebook className="w-3.5 h-3.5 fill-current" />
                    <span>Facebook</span>
                  </a>

                  {/* Instagram */}
                  <a
                    href="https://www.instagram.com/5lbmagazine/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      trackEvent('social_comment_click', { network: 'instagram', article_title: post.title });
                      openExternalBrowser('https://www.instagram.com/5lbmagazine/');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E4405F]/10 hover:bg-[#E4405F] text-[#E4405F] hover:text-white dark:bg-[#E4405F]/20 dark:hover:bg-[#E4405F] dark:text-pink-300 dark:hover:text-white text-xs font-semibold transition active:scale-95 cursor-pointer border border-[#E4405F]/20"
                    title="Commenta su Instagram"
                  >
                    <Instagram className="w-3.5 h-3.5" />
                    <span>Instagram</span>
                  </a>

                  {/* Telegram */}
                  <a
                    href="https://t.me/magazine5LB"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      trackEvent('social_comment_click', { network: 'telegram', article_title: post.title });
                      openExternalBrowser('https://t.me/magazine5LB');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#229ED9]/10 hover:bg-[#229ED9] text-[#229ED9] hover:text-white dark:bg-[#229ED9]/20 dark:hover:bg-[#229ED9] dark:text-sky-300 dark:hover:text-white text-xs font-semibold transition active:scale-95 cursor-pointer border border-[#229ED9]/20"
                    title="Commenta su Telegram"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Telegram</span>
                  </a>

                  {/* YouTube */}
                  <a
                    href="https://www.youtube.com/@5LBmagazine/posts"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      trackEvent('social_comment_click', { network: 'youtube', article_title: post.title });
                      openExternalBrowser('https://www.youtube.com/@5LBmagazine/posts');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF0000]/10 hover:bg-[#FF0000] text-[#FF0000] hover:text-white dark:bg-[#FF0000]/20 dark:hover:bg-[#FF0000] dark:text-rose-300 dark:hover:text-white text-xs font-semibold transition active:scale-95 cursor-pointer border border-[#FF0000]/20"
                    title="Commenta su YouTube"
                  >
                    <Youtube className="w-3.5 h-3.5" />
                    <span>YouTube</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Categories row */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {post.categories.map((c, i) => (
              <span
                key={i}
                className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300"
              >
                {decodeHtmlEntities(c)}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 leading-tight mb-4">
            {decodeHtmlEntities(post.title)}
          </h1>

          {/* Metadata bar */}
          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400 pb-5 mb-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-orange-500" />
              <span>{formatItalianDate(post.published)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-400" />
              <span>{post.author.name}</span>
            </div>
            <div className="ml-auto text-xs font-medium text-slate-400">
              {post.isAccadeOggi ? 'Fonte: Canale Telegram @magazine5LB' : 'Fonte: magazine.5lb.eu'}
            </div>
          </div>

          {/* Article HTML Content formatted with custom typography */}
          <div
            className="article-content max-w-none text-slate-800 dark:text-slate-200 leading-relaxed space-y-4 text-justify [text-align:justify] hyphens-auto [&_p]:text-justify [&_p]:[text-align:justify] [&_p]:hyphens-auto [&_p]:mb-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-orange-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_img]:rounded-xl [&_img]:border [&_img]:border-slate-200/90 dark:[&_img]:border-slate-800 [&_img]:bg-slate-50 dark:[&_img]:bg-slate-900/40 [&_img]:shadow-xs [&_img]:max-w-full [&_img]:h-auto [&_img]:my-4 [&_a]:text-orange-600 dark:[&_a]:text-orange-400 [&_a]:underline [&_a]:font-medium hover:[&_a]:text-orange-700 dark:hover:[&_a]:text-orange-300"
            style={{ fontSize: `${fontSize}px`, textAlign: 'justify', hyphens: 'auto' }}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            onClick={(e) => {
              const target = (e.target as HTMLElement).closest('a');
              if (target) {
                const rawHref = target.getAttribute('href');
                if (rawHref && !rawHref.startsWith('#')) {
                  e.preventDefault();
                  const safeHref = toHttpOrHttpsUrl(rawHref);
                  if (!safeHref) {
                    console.warn('Scartato link con protocollo non sicuro:', rawHref);
                    return;
                  }
                  trackEvent('article_link_click', {
                    link_url: safeHref,
                    link_text: target.innerText?.trim() || '',
                    article_title: post.title,
                    article_id: post.id,
                  });
                  if (onInterceptLink && isMagazineUrl(safeHref)) {
                    onInterceptLink(safeHref);
                  } else {
                    openExternalBrowser(safeHref);
                  }
                }
              }
            }}
          />

          {/* Original Source Link Banner */}
          {post.isAccadeOggi ? (
            <div className="mt-10 p-5 rounded-2xl bg-sky-50/80 dark:bg-slate-800/60 border border-sky-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Post dal canale Telegram @magazine5LB
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Consulta il post originale, i commenti e le reazioni su Telegram.
                </p>
              </div>
              {safePostLink && (
                <a
                  href={safePostLink ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.preventDefault();
                    trackEvent('open_original_telegram_post', {
                      link_url: safePostLink,
                      article_title: post.title,
                      article_id: post.id,
                    });
                    openExternalBrowser(safePostLink);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#229ED9] hover:bg-[#1d8bc0] text-white font-medium text-xs transition shadow-xs cursor-pointer"
                >
                  <span>Apri su Telegram</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ) : (
            <div className="mt-10 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Leggi l'articolo originale su 5LB Magazine
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Consulta commenti, immagini e contenuti multimediali su Blogger.
                </p>
              </div>
              {safePostLink && (
                <a
                  href={safePostLink ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.preventDefault();
                    trackEvent('open_original_blogger_post', {
                      link_url: safePostLink,
                      article_title: post.title,
                      article_id: post.id,
                    });
                    if (onInterceptLink && isMagazineUrl(safePostLink)) {
                      onInterceptLink(safePostLink);
                    } else {
                      openExternalBrowser(safePostLink);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-medium text-xs transition shadow-xs cursor-pointer"
                >
                  <span>Vai a magazine.5lb.eu</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
