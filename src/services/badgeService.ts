import { triggerPushNotification } from './notificationService';

export interface BadgeTier {
  id: string;
  level: number;
  threshold: number;
  name: string;
  subtitle: string;
  description: string;
  iconName: 'sprout' | 'compass' | 'award' | 'trophy' | 'crown';
  colorTheme: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  badgeTag: string;
}

export const BADGE_TIERS: BadgeTier[] = [
  {
    id: 'badge-l.1',
    level: 1,
    threshold: 20,
    name: 'Curioso',
    subtitle: '20 articoli collezionati',
    description: 'Hai collezionato i tuoi primi 20 articoli. Il tuo viaggio nella comprensione delle 5 Leggi Biologiche è iniziato!',
    iconName: 'sprout',
    colorTheme: 'emerald',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60',
    badgeBorder: 'border-emerald-300 dark:border-emerald-700/80',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    badgeTag: 'bg-emerald-600 text-white',
  },
  {
    id: 'badge-l.2',
    level: 2,
    threshold: 80,
    name: 'Esploratore',
    subtitle: '80 articoli collezionati',
    description: '80 articoli raccolti navigando tra le varie eziologie e categorie. La varietà della tua biblioteca si allarga!',
    iconName: 'compass',
    colorTheme: 'sky',
    badgeBg: 'bg-sky-50 dark:bg-sky-950/60',
    badgeBorder: 'border-sky-300 dark:border-sky-700/80',
    badgeText: 'text-sky-700 dark:text-sky-300',
    badgeTag: 'bg-sky-600 text-white',
  },
  {
    id: 'badge-l.3',
    level: 3,
    threshold: 150,
    name: 'Studioso',
    subtitle: '150 articoli collezionati',
    description: 'Traguardo di 150 articoli raggiunto. La tua conoscenza dei programmi speciali biologici e dei sintomi è solida e approfondita.',
    iconName: 'award',
    colorTheme: 'amber',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/60',
    badgeBorder: 'border-amber-300 dark:border-amber-700/80',
    badgeText: 'text-amber-700 dark:text-amber-300',
    badgeTag: 'bg-amber-500 text-white',
  },
  {
    id: 'badge-l.4',
    level: 4,
    threshold: 250,
    name: 'Esperto',
    subtitle: '250 articoli collezionati',
    description: 'Con 250 articoli nel tuo archivio possiedi una raccolta enciclopedica di casi, apparati e approfondimenti di 5LB Magazine.',
    iconName: 'trophy',
    colorTheme: 'purple',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/60',
    badgeBorder: 'border-purple-300 dark:border-purple-700/80',
    badgeText: 'text-purple-700 dark:text-purple-300',
    badgeTag: 'bg-purple-600 text-white',
  },
  {
    id: 'badge-l.5',
    level: 5,
    threshold: 350,
    name: 'Maestro 5LB',
    subtitle: '350 articoli collezionati',
    description: 'Massimo livello sbloccato! Con 350 articoli collezionati sei un autentico custode della conoscenza delle Leggi Biologiche.',
    iconName: 'crown',
    colorTheme: 'yellow',
    badgeBg: 'bg-amber-50/90 dark:bg-yellow-950/70',
    badgeBorder: 'border-amber-400 dark:border-yellow-600/80',
    badgeText: 'text-amber-700 dark:text-yellow-300',
    badgeTag: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 font-bold',
  },
];

import { getAppStateItem, setAppStateItem } from '../utils/idbStorage';

let inMemoryUnlockedBadgeIds = new Set<string>();
let isBadgesInitialized = false;

/**
 * Inizializza i badge da IndexedDB (o fallback in-memory).
 */
export async function initBadgesStorage(): Promise<string[]> {
  try {
    const stored = await getAppStateItem<string[]>('unlocked_badges');
    if (Array.isArray(stored)) {
      inMemoryUnlockedBadgeIds = new Set(stored);
    } else {
      inMemoryUnlockedBadgeIds = new Set();
    }
  } catch {
    inMemoryUnlockedBadgeIds = new Set();
  }
  isBadgesInitialized = true;
  return Array.from(inMemoryUnlockedBadgeIds);
}

/**
 * Legge i badge già sbloccati (da memoria cache rapida popolata da IndexedDB).
 */
export function getStoredUnlockedBadgeIds(): string[] {
  return Array.from(inMemoryUnlockedBadgeIds);
}

/**
 * Salva i badge sbloccati in IndexedDB.
 */
export function saveUnlockedBadgeIds(ids: string[]): void {
  inMemoryUnlockedBadgeIds = new Set(ids);
  setAppStateItem('unlocked_badges', ids).catch(() => {});
}

/**
 * Restituisce il badge più alto attualmente sbloccato in base al numero di articoli.
 */
export function getCurrentBadge(articleCount: number): BadgeTier | null {
  const eligible = BADGE_TIERS.filter((b) => articleCount >= b.threshold);
  if (eligible.length === 0) return null;
  return eligible[eligible.length - 1];
}

/**
 * Restituisce il prossimo badge da sbloccare in base al numero di articoli.
 */
export function getNextBadge(articleCount: number): BadgeTier | null {
  return BADGE_TIERS.find((b) => articleCount < b.threshold) || null;
}

/**
 * Calcola la percentuale di completamento verso il prossimo traguardo.
 */
export function getBadgeProgress(articleCount: number): {
  currentBadge: BadgeTier | null;
  nextBadge: BadgeTier | null;
  percentage: number;
  remaining: number;
} {
  const currentBadge = getCurrentBadge(articleCount);
  const nextBadge = getNextBadge(articleCount);

  if (!nextBadge) {
    return {
      currentBadge,
      nextBadge: null,
      percentage: 100,
      remaining: 0,
    };
  }

  const prevThreshold = currentBadge ? currentBadge.threshold : 0;
  const range = nextBadge.threshold - prevThreshold;
  const currentInTier = Math.max(0, articleCount - prevThreshold);
  const percentage = Math.min(100, Math.round((currentInTier / range) * 100));
  const remaining = Math.max(0, nextBadge.threshold - articleCount);

  return {
    currentBadge,
    nextBadge,
    percentage,
    remaining,
  };
}

/**
 * Controlla se sono stati sbloccati nuovi badge in base al conteggio articoli in "Il mio archivio".
 * Se trova nuovi badge:
 * 1. Li persiste in IndexedDB
 * 2. Invia la notifica (push + centro notifiche + suono)
 * 3. Notifica l'interfaccia via custom event
 * 4. Ritorna la lista dei nuovi badge sbloccati
 */
export function checkAndUnlockBadges(articleCount: number): BadgeTier[] {
  const currentlyUnlockedIds = new Set(getStoredUnlockedBadgeIds());
  const eligibleBadges = BADGE_TIERS.filter((b) => articleCount >= b.threshold);
  const newlyUnlocked: BadgeTier[] = [];

  for (const badge of eligibleBadges) {
    if (!currentlyUnlockedIds.has(badge.id)) {
      currentlyUnlockedIds.add(badge.id);
      newlyUnlocked.push(badge);

      // Invia notifica all'utente
      triggerPushNotification(
        `🎖️ Nuovo Badge Sbloccato: ${badge.name}!`,
        `Complimenti! Hai collezionato ${badge.threshold} articoli in "Il mio archivio" (Livello ${badge.level}).`,
        undefined,
        badge.id
      );
    }
  }

  if (newlyUnlocked.length > 0) {
    saveUnlockedBadgeIds(Array.from(currentlyUnlockedIds));
    window.dispatchEvent(
      new CustomEvent('5lb:badges-updated', { detail: { newlyUnlocked, articleCount } })
    );
  }

  return newlyUnlocked;
}
