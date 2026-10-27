import React from 'react';
import { X, Sparkles, Award, ArrowRight } from 'lucide-react';
import { BadgeTier } from '../services/badgeService';
import { BadgeTierIcon } from './BadgeIcon';

interface BadgeUnlockCelebrationModalProps {
  badge: BadgeTier | null;
  onClose: () => void;
  onViewAllBadges: () => void;
}

export const BadgeUnlockCelebrationModal: React.FC<BadgeUnlockCelebrationModalProps> = ({
  badge,
  onClose,
  onViewAllBadges,
}) => {
  if (!badge) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-orange-500/30 shadow-2xl overflow-hidden p-6 text-center animate-in zoom-in-95">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Celebratory badge container */}
        <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-300 p-1 shadow-lg shadow-orange-500/20 mb-4 animate-bounce">
          <div className="w-full h-full rounded-[22px] bg-white dark:bg-slate-900 flex items-center justify-center">
            <BadgeTierIcon iconName={badge.iconName} className={`w-10 h-10 ${badge.badgeText}`} />
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 text-xs font-bold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>NUOVO BADGE SBLOCCATO!</span>
        </div>

        <h3 className="text-xl font-black text-slate-900 dark:text-white">
          {badge.name}
        </h3>

        <div className="text-xs font-bold text-orange-600 dark:text-orange-400 mt-0.5">
          Livello {badge.level} • {badge.threshold} Articoli in Archivio
        </div>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
          {badge.description}
        </p>

        <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
          Più navighi tra le categorie e più cerchi argomenti, più collezioni articoli e sblocchi i livelli successivi!
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => {
              onClose();
              onViewAllBadges();
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition active:scale-95 cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <Award className="w-4 h-4" />
            <span>Vedi tutti i Badge</span>
          </button>

          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer inline-flex items-center justify-center"
          >
            Continua a leggere
          </button>
        </div>
      </div>
    </div>
  );
};
