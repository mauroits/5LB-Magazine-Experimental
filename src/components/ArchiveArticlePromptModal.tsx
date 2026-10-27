import React, { useEffect, useState } from 'react';
import {
  Download,
  RotateCw,
  ExternalLink,
  X,
  Archive,
  CheckCircle2,
  Sparkles,
  Loader2,
  FileText,
  Heart
} from 'lucide-react';
import { BloggerPost } from '../types';
import { formatItalianDate } from '../services/bloggerFeed';
import { decodeHtmlEntities } from '../utils/textUtils';

export interface ArchiveArticlePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUrl: string | null;
  existingPost?: BloggerPost | null;
  onConfirmDownload: (url: string) => Promise<void>;
  onOpenExternal: (url: string) => void;
  isDownloading?: boolean;
}

export const ArchiveArticlePromptModal: React.FC<ArchiveArticlePromptModalProps> = ({
  isOpen,
  onClose,
  targetUrl,
  existingPost,
  onConfirmDownload,
  onOpenExternal,
  isDownloading = false,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setErrorMsg(null);
  }, [targetUrl, isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDownloading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDownloading, onClose]);

  if (!isOpen || !targetUrl) return null;

  const isAlreadyArchived = Boolean(existingPost);

  // Clean path display
  let cleanDisplayUrl = targetUrl;
  try {
    const parsed = new URL(targetUrl);
    cleanDisplayUrl = `${parsed.hostname}${parsed.pathname}`;
  } catch {
    // fallback
  }

  const handleDownload = async () => {
    setErrorMsg(null);
    try {
      await onConfirmDownload(targetUrl);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Impossibile scaricare l’articolo via RSS.');
    }
  };

  const handleExternal = () => {
    onOpenExternal(targetUrl);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDownloading) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-modal-title"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header decoration */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-2xl flex items-center justify-center ${
                isAlreadyArchived
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/60'
              }`}
            >
              {isAlreadyArchived ? (
                <RotateCw className="w-6 h-6" />
              ) : (
                <Download className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    isAlreadyArchived
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                      : 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-300'
                  }`}
                >
                  {isAlreadyArchived ? 'Già archiviato' : 'Nuovo articolo'}
                </span>
              </div>
              <h2
                id="archive-modal-title"
                className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 leading-snug"
              >
                {isAlreadyArchived
                  ? 'Aggiorna articolo nell’archivio'
                  : 'Aggiungi al tuo archivio'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isDownloading}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-40"
            title="Chiudi popup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 space-y-4 text-sm">
          {/* Article Info Preview */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-start gap-2.5">
              <FileText className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                  {decodeHtmlEntities(existingPost?.title || 'Articolo da magazine.5lb.eu')}
                </p>
                {existingPost?.published && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Pubblicato il {formatItalianDate(existingPost.published)}
                  </p>
                )}
                <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-1 font-mono">
                  {cleanDisplayUrl}
                </p>
              </div>
            </div>
          </div>

          {/* Context explanation */}
          <div className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs sm:text-sm">
            {isAlreadyArchived ? (
              <p>
                Questo articolo è <strong>già presente</strong> nel tuo archivio locale.
              </p>
            ) : (
              <p>
                Il link selezionato fa parte delle pubblicazioni di <strong>magazine.5lb.eu</strong>.
                Non è presente nel tuo archivio locale, puoi scaricarlo e salvarlo ora.
              </p>
            )}
          </div>

          {/* Salva per dopo badge info */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 text-rose-800 dark:text-rose-200 text-xs">
            <Heart className="w-4 h-4 fill-current text-rose-500 shrink-0" />
            <span>L'articolo sarà messo nella categoria <strong>Salva per dopo</strong> della barra laterale.</span>
          </div>

          {/* Badges hint */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              {isAlreadyArchived
                ? "L'aggiornamento non contribuisce al livello del tuo archivio."
                : "Ogni articolo scaricato ti avvicina al prossimo livello di complessità dell'archivio!"}
            </span>
          </div>

          {/* Error Message if any */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-4 sm:p-6 bg-slate-50/80 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row-reverse items-stretch sm:items-center justify-between gap-2.5">
          {/* Primary Action Button */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-xs sm:text-sm transition shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
              isAlreadyArchived
                ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                : 'bg-orange-600 hover:bg-orange-700 active:scale-95'
            }`}
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Scaricamento in corso...</span>
              </>
            ) : isAlreadyArchived ? (
              <>
                <RotateCw className="w-4 h-4" />
                <span>Aggiorna e salva per dopo</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Scarica e salva per dopo</span>
              </>
            )}
          </button>

          {/* Secondary Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExternal}
              disabled={isDownloading}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium text-xs sm:text-sm transition cursor-pointer"
              title="Apri subito nel browser"
            >
              <span>Apri subito nel browser</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              onClick={onClose}
              disabled={isDownloading}
              className="px-3.5 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-xs sm:text-sm transition cursor-pointer"
            >
              Annulla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
