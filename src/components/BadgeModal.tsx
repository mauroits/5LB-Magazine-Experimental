import React from 'react';
import {
  X,
  Award,
  CheckCircle2,
  Lock,
  Sparkles,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Compass,
  Search
} from 'lucide-react';
import {
  BADGE_TIERS,
  getCurrentBadge,
  getNextBadge,
  getBadgeProgress
} from '../services/badgeService';
import { BadgeTierIcon } from './BadgeIcon';

interface BadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalArticles: number;
  onExploreArchive?: () => void;
}

export const BadgeModal: React.FC<BadgeModalProps> = ({
  isOpen,
  onClose,
  totalArticles,
  onExploreArchive,
}) => {
  if (!isOpen) return null;

  const currentBadge = getCurrentBadge(totalArticles);
  const nextBadge = getNextBadge(totalArticles);
  const progress = getBadgeProgress(totalArticles);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl max-h-[92vh] bg-white dark:bg-slate-900 shadow-2xl rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-[#0e1838] px-5 sm:px-6 py-4 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-600/90 text-white">
              <Award className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                I Tuoi Badge & Livelli di Conoscenza
              </h2>
              <p className="text-xs text-slate-300">
                Collezione articoli in "Il mio archivio"
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
            title="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-slate-800 dark:text-slate-200">
          {/* Current Status Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-orange-50/40 dark:from-slate-800/80 dark:to-orange-950/20 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                {currentBadge ? (
                  <BadgeTierIcon iconName={currentBadge.iconName} className={`w-8 h-8 ${currentBadge.badgeText}`} />
                ) : (
                  <BookOpen className="w-7 h-7 text-orange-500" />
                )}
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  {currentBadge ? `Livello ${currentBadge.level} Raggiunto` : 'Inizio del Cammino'}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {currentBadge ? currentBadge.name : 'Nuovo Esploratore Biologico'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Hai attualmente <span className="font-bold text-slate-900 dark:text-slate-200">{totalArticles}</span> articoli collezionati nel tuo archivio locale
                </p>
              </div>
            </div>

            {/* Quick Stat Pill */}
            <div className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-center shrink-0 self-stretch sm:self-auto">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Totale Archivio
              </span>
              <span className="text-xl font-black text-orange-600 dark:text-orange-400 tabular-nums">
                {totalArticles}
              </span>
            </div>
          </div>

          {/* Progress to Next Level */}
          {nextBadge ? (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-orange-500" />
                  Progresso verso il Livello {nextBadge.level} ({nextBadge.name})
                </span>
                <span className="font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                  {totalArticles} / {nextBadge.threshold} ({progress.remaining} mancanti)
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200 font-medium">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Congratulazioni! Hai sbloccato tutti i livelli massimi dell'archivio (350+ articoli).</span>
            </div>
          )}

          {/* All 5 Badges List */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Tutti i Livelli di Badge (20, 80, 150, 250, 350 articoli)
            </h4>

            <div className="space-y-3">
              {BADGE_TIERS.map((tier) => {
                const isUnlocked = totalArticles >= tier.threshold;

                return (
                  <div
                    key={tier.id}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-start sm:items-center justify-between gap-3.5 ${
                      isUnlocked
                        ? `${tier.badgeBg} ${tier.badgeBorder} shadow-2xs`
                        : 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-70'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${
                          isUnlocked
                            ? `bg-white dark:bg-slate-800 ${tier.badgeBorder} ${tier.badgeText}`
                            : 'bg-slate-200/80 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-400'
                        }`}
                      >
                        <BadgeTierIcon iconName={tier.iconName} className="w-5 h-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isUnlocked
                                ? tier.badgeTag
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            Livello {tier.level} • {tier.threshold} Articoli
                          </span>
                          <h5 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {tier.name}
                          </h5>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                          {tier.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 pt-1 sm:pt-0">
                      {isUnlocked ? (
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Sbloccato</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                          <Lock className="w-3.5 h-3.5" />
                          <span className="tabular-nums">
                            {totalArticles}/{tier.threshold}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Informative explanation banner */}
          <div className="p-4 rounded-2xl bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/80">
            <h5 className="text-xs font-bold text-orange-900 dark:text-orange-200 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              Come collezionare più articoli e conoscenza?
            </h5>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-1.5 leading-relaxed">
              Più navighi tra le diverse sezioni del menu (notizie, sintomi, apparati ed eziologie) e più utilizzi la ricerca interna per trovare argomenti specifici, più articoli vengono importati e memorizzati nel tuo archivio locale. Questo arricchisce la tua biblioteca 5LB personale e sblocca i badge successivi!
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-5 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
            I badge sbloccati rimangono salvati nella memoria locale del dispositivo.
          </p>

          <div className="flex items-center gap-2 ml-auto">
            {onExploreArchive && (
              <button
                onClick={() => {
                  onExploreArchive();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <span>Vai a "Il mio archivio"</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
