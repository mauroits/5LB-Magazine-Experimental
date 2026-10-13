import React from 'react';
import {
  Sprout,
  Compass,
  Award,
  Trophy,
  Crown,
  Medal,
  Sparkles
} from 'lucide-react';
import { BadgeTier, getCurrentBadge, BADGE_TIERS } from '../services/badgeService';

interface BadgeTierIconProps {
  iconName: 'sprout' | 'compass' | 'award' | 'trophy' | 'crown' | string;
  className?: string;
}

export const BadgeTierIcon: React.FC<BadgeTierIconProps> = ({ iconName, className = 'w-4 h-4' }) => {
  switch (iconName) {
    case 'sprout':
      return <Sprout className={className} />;
    case 'compass':
      return <Compass className={className} />;
    case 'award':
      return <Award className={className} />;
    case 'trophy':
      return <Trophy className={className} />;
    case 'crown':
      return <Crown className={className} />;
    default:
      return <Medal className={className} />;
  }
};

interface ArchiveBadgeButtonProps {
  totalArticles: number;
  onClick: () => void;
}

/**
 * Pulsante con Icona Badge che sostituisce l'icona "filtro" nella pagina "Il mio archivio"
 */
export const ArchiveBadgeButton: React.FC<ArchiveBadgeButtonProps> = ({
  totalArticles,
  onClick,
}) => {
  const currentBadge = getCurrentBadge(totalArticles);

  if (currentBadge) {
    return (
      <button
        onClick={onClick}
        type="button"
        title={`Badge Sbloccato: Livello ${currentBadge.level} (${currentBadge.name}). Clicca per vedere tutti i badge.`}
        className={`relative group p-2 rounded-xl transition-all duration-200 cursor-pointer border flex items-center justify-center shadow-xs active:scale-95 ${currentBadge.badgeBg} ${currentBadge.badgeBorder} ${currentBadge.badgeText}`}
      >
        <BadgeTierIcon iconName={currentBadge.iconName} className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
        {/* Indicatore numerico di livello sovrapposto */}
        <span
          className={`absolute -top-1.5 -right-1.5 text-[9px] font-black rounded-full px-1 py-0.5 leading-none shadow-xs ring-1 ring-white dark:ring-slate-900 ${currentBadge.badgeTag}`}
        >
          L.{currentBadge.level}
        </span>
      </button>
    );
  }

  // Se l'utente ha meno di 20 articoli, mostra icona obiettivo verso il primo badge
  return (
    <button
      onClick={onClick}
      type="button"
      title={`Collezione articoli: ${totalArticles}/20 per sbloccare il Livello 1. Clicca per vedere i dettagli.`}
      className="relative group p-2 rounded-xl transition-all duration-200 cursor-pointer border border-orange-200 dark:border-orange-800/80 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shadow-xs active:scale-95"
    >
      <Medal className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
    </button>
  );
};

interface BadgeNavPillProps {
  totalArticles: number;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * Icona badge mostrata nella barra di navigazione laterale a fianco al numero di articoli in "Il mio archivio"
 */
export const BadgeNavPill: React.FC<BadgeNavPillProps> = ({ totalArticles, onClick }) => {
  const currentBadge = getCurrentBadge(totalArticles);

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick(e);
    }
  };

  if (currentBadge) {
    return (
      <button
        onClick={handleClick}
        type="button"
        title={`L. ${currentBadge.level}: ${currentBadge.name} (${totalArticles} articoli). Clicca per visualizzare i dettagli.`}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-xs font-bold border transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer shadow-2xs ${currentBadge.badgeBg} ${currentBadge.badgeBorder} ${currentBadge.badgeText}`}
      >
        <BadgeTierIcon iconName={currentBadge.iconName} className="w-3.5 h-3.5" />
        <span className="text-[10px] uppercase tracking-wider font-extrabold">L.{currentBadge.level}</span>
      </button>
    );
  }

  // Meno di 20 articoli: icona target discreta per indicare che il sistema di badge è attivo
  return (
    <button
      onClick={handleClick}
      type="button"
      title={`${totalArticles}/20 articoli per sbloccare il Livello 1. Clicca per visualizzare i dettagli.`}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-xs font-medium border border-orange-200 dark:border-orange-800/80 bg-orange-50/80 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 hover:scale-105 active:scale-95 transition-all cursor-pointer"
    >
      <Medal className="w-3.5 h-3.5" />
      <span className="text-[10px] font-semibold tabular-nums">{totalArticles}/20</span>
    </button>
  );
};
