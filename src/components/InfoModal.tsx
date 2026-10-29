import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Mail,
  Globe,
  Shield,
  ExternalLink,
  History,
  Layers,
  Sparkles,
  Bell,
  WifiOff,
  RefreshCw,
  Check,
  Cookie,
  Award,
  Smartphone,
  Settings
} from 'lucide-react';
import { Logo5LB } from './Logo5LB';
import { INFO_PAGE_CONTENT } from '../config/infoContent';
import { BADGE_TIERS } from '../services/badgeService';
import { BadgeTierIcon } from './BadgeIcon';
import { BloggerPost } from '../types';

const ETIOLOGY_CATEGORIES = [
  { id: 'ezio-respiratorie', label: 'Vie respiratorie', emoji: '🫁', desc: 'Laringe, bronchi, polmoni', rss: 'C: vie respiratorie' },
  { id: 'ezio-bocca', label: 'Cavità orale', emoji: '👄', desc: 'Denti, lingua, gengive', rss: 'C: bocca' },
  { id: 'ezio-seno', label: 'Seno', emoji: '🩺', desc: 'Ghiandole mammarie, dotti galattofori', rss: 'C: seno' },
  { id: 'ezio-gastro', label: 'App. gastro-intestinale', emoji: '🍽️', desc: 'Stomaco, fegato, intestino', rss: 'C: intestino' },
  { id: 'ezio-cardio', label: 'App. cardio-circolatorio', emoji: '🫀', desc: 'Cuore, vasi, coronarie', rss: 'C: sistema circolatorio' },
  { id: 'ezio-urinario', label: 'Apparato urinario', emoji: '💧', desc: 'Reni, vescica, dotti escretori', rss: 'C: apparato urinario' },
  { id: 'ezio-genitale', label: 'Apparato genitale', emoji: '🧬', desc: 'Utero, prostata, ovaie, testicoli', rss: 'C: apparato genitale' },
  { id: 'ezio-muscolo', label: 'App. muscolo-scheletrico', emoji: '🦴', desc: 'Ossa, muscoli, articolazioni', rss: 'C: apparato muscolo-scheletrico' },
  { id: 'ezio-pelle', label: 'La pelle', emoji: '🖐️', desc: 'Epidermide, corion, derma', rss: 'C: pelle' },
  { id: 'ezio-nervoso', label: 'Sistema nervoso', emoji: '🧠', desc: 'Cervello, motricità, sensibilità', rss: 'C: sistema nervoso' },
  { id: 'ezio-sensi', label: 'Vista, udito, olfatto', emoji: '👁️', desc: 'Occhi, orecchie, naso', rss: 'C: sistema vis olf uditivo' },
  { id: 'ezio-allergie', label: 'Intolleranze e allergie', emoji: '🌿', desc: 'Reazioni e binari biologici', rss: 'D: intolleranze' },
  { id: 'ezio-psicosi', label: 'Psicosi', emoji: '⚡', desc: 'Costellazioni biologiche', rss: 'COSTELLAZIONI' },
  { id: 'ezio-lateralita', label: 'La lateralità', emoji: '⚖️', desc: 'Mancino o destrimane', rss: 'MANCINO' },
];

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshFeed?: () => void;
  isRefreshing?: boolean;
  onOpenCookieSettings?: () => void;
  posts?: BloggerPost[];
  onSelectPost?: (post: BloggerPost) => void;
  onSelectCategory?: (categoryId: string) => void;
  defaultTab?: 'funzioni' | 'aggiornamenti' | 'contatti' | 'privacy' | 'widget';
}

export const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  onClose,
  onRefreshFeed,
  isRefreshing = false,
  onOpenCookieSettings,
  posts = [],
  onSelectPost,
  onSelectCategory,
  defaultTab = 'funzioni',
}) => {
  const [activeTab, setActiveTab] = useState<'funzioni' | 'aggiornamenti' | 'contatti' | 'privacy' | 'widget'>(defaultTab);
  const [refreshDone, setRefreshDone] = useState(false);

  // State for live widget simulator
  const [newsFeedType, setNewsFeedType] = useState<'latest' | 'archive'>('latest');
  const [currentArticleIndex, setCurrentArticleIndex] = useState(0);
  const [isSimulatorBottomSheetOpen, setIsSimulatorBottomSheetOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  React.useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, isOpen]);

  // Rotate simulator news every 4.5 seconds
  const activePosts = posts.slice(0, 6);
  React.useEffect(() => {
    if (activePosts.length === 0 || isPaused || activeTab !== 'widget') return;
    const timer = setInterval(() => {
      setCurrentArticleIndex((prev) => (prev + 1) % activePosts.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [activePosts.length, isPaused, activeTab]);

  if (!isOpen) return null;

  const content = INFO_PAGE_CONTENT;

  // Icons for feature cards
  const featureIcons = [Award, Layers, Sparkles, Bell, WifiOff];

  const handleManualRefresh = () => {
    if (onRefreshFeed) {
      onRefreshFeed();
      setRefreshDone(true);
      setTimeout(() => setRefreshDone(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full h-full sm:h-[90vh] sm:max-w-3xl bg-white dark:bg-slate-900 shadow-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header with Dark Navy Brand Style */}
        <div className="bg-[#0e1838] px-5 py-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] text-white flex items-center justify-between gap-3 shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <Logo5LB className="h-7 sm:h-8" />
            <div className="h-6 w-px bg-white/20 hidden sm:block" />
            <span className="text-xs sm:text-sm font-medium text-slate-300 hidden sm:inline">
              {content.headerSubtitle}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
            title="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 dark:bg-slate-800/80 px-4 py-2 border-b border-slate-200 dark:border-slate-700/80 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          {[
            { id: 'funzioni', label: 'Funzioni App', icon: BookOpen },
            { id: 'widget', label: 'Widget Home Android', icon: Smartphone },
            { id: 'aggiornamenti', label: 'Ultimi Aggiornamenti', icon: History },
            { id: 'contatti', label: 'Contatti', icon: Mail },
            { id: 'privacy', label: 'Privacy & Note Legali', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 text-slate-800 dark:text-slate-200">
          {activeTab === 'funzioni' && (
            <div className="space-y-5 animate-in fade-in-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-orange-500" />
                  {content.funzioni.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                  {content.funzioni.intro}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {content.funzioni.cards.map((card, idx) => {
                  const Icon = featureIcons[idx % featureIcons.length] || Layers;
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400 flex items-center justify-center mb-2.5">
                          <Icon className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {card.title}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                          {card.description}
                        </p>
                      </div>

                      {/* Tasto dedicato nel tab aggregatore di notizie per riavviare il download degli RSS */}
                      {card.title.includes('Aggregatore') && onRefreshFeed && (
                        <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-700/80">
                          <button
                            onClick={handleManualRefresh}
                            disabled={isRefreshing}
                            className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
                            title="Riscarica tutti i feed RSS e aggiorna la memoria locale"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                            <span>
                              {isRefreshing
                                ? 'Download in corso...'
                                : refreshDone
                                ? 'Feed aggiornati!'
                                : 'Riavvia download feed RSS'}
                            </span>
                            {refreshDone && <Check className="w-3.5 h-3.5 text-emerald-200" />}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Sezione esplicativa visiva dei 5 livelli di badge */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/70 to-amber-50/50 dark:from-slate-800/80 dark:to-orange-950/20 border border-orange-200/80 dark:border-orange-800/50 space-y-3">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <Award className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  <h4 className="text-sm font-bold">
                    Traguardi & Livelli dei Badge (Collezione in "Il mio archivio")
                  </h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  I badge si sbloccano automaticamente collezionando articoli tramite la navigazione e le ricerche:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  {BADGE_TIERS.map((tier) => (
                    <div
                      key={tier.id}
                      className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-between shadow-2xs ${tier.badgeBg} ${tier.badgeBorder}`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center mb-1.5 shadow-2xs">
                        <BadgeTierIcon iconName={tier.iconName} className={`w-4 h-4 ${tier.badgeText}`} />
                      </div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wide text-orange-600 dark:text-orange-400">
                        {tier.threshold} Articoli
                      </span>
                      <span className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight mt-0.5 line-clamp-1">
                        {tier.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'aggiornamenti' && (
            <div className="space-y-4 animate-in fade-in-50">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-orange-500" />
                {content.aggiornamenti.title}
              </h3>

              <div className="space-y-4">
                {content.aggiornamenti.releases.map((rel, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            rel.isCurrent
                              ? 'bg-orange-600 text-white'
                              : 'bg-slate-600 text-white'
                          }`}
                        >
                          {rel.version}
                        </span>
                      </span>
                      <span className="text-xs text-slate-400">{rel.date}</span>
                    </div>
                    <ul className="mt-2 text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-5">
                      {rel.notes.map((note, nIdx) => (
                        <li key={nIdx}>{note}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'contatti' && (
            <div className="space-y-4 animate-in fade-in-50">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-orange-500" />
                {content.contatti.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                {content.contatti.intro}
              </p>

              <div className="space-y-3 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400 flex items-center justify-center shrink-0">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Portale Ufficiale 5LB Framework</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-[220px] sm:max-w-md">
                        {content.contatti.mainWebsiteUrl}
                      </p>
                    </div>
                  </div>
                  <a
                    href={content.contatti.mainWebsiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shrink-0 shadow-xs active:scale-95 cursor-pointer"
                  >
                    <span>Vai ai Contatti</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4 animate-in fade-in-50">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-500" />
                {content.privacy.title}
              </h3>

              <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>{content.privacy.intro}</p>

                {content.privacy.points.map((pt, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1.5"
                  >
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                      {pt.title}
                    </h4>
                    <p className="text-xs leading-relaxed">{pt.text}</p>
                  </div>
                ))}

                <div className="p-4 rounded-2xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Cookie className="w-4 h-4 text-orange-500" />
                      <span>Preferenze Cookie & Consenso</span>
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      Puoi rivedere o modificare la tua scelta relativa ai cookie analitici (Google Analytics) in qualsiasi momento.
                    </p>
                  </div>
                  {onOpenCookieSettings && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenCookieSettings();
                      }}
                      className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shrink-0 transition active:scale-95 cursor-pointer shadow-xs"
                    >
                      Gestisci Cookie
                    </button>
                  )}
                </div>

                <div className="pt-2">
                  <a
                    href={content.privacy.fullPrivacyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    <span>Leggi la Privacy Policy completa sul portale 5lb.eu</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'widget' && (
            <div className="space-y-5 animate-in fade-in-50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-sky-500" />
                    Simulatore Widget Home Screen Android
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Anteprima interattiva dei due widget nativi (1x4) per il launcher Android. Toccali per provarli.
                  </p>
                </div>
              </div>

              {/* Launcher Mockup */}
              <div className="relative mx-auto max-w-sm rounded-[32px] border-[5px] border-slate-700 dark:border-slate-800 bg-[#090d16] p-4 text-white shadow-2xl overflow-hidden min-h-[480px] flex flex-col justify-between select-none">
                {/* Android Status Bar */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pb-2 border-b border-white/5">
                  <span>12:00</span>
                  <div className="flex items-center gap-1.5">
                    <span>5G</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Google Search Bar Mock */}
                <div className="mt-2 bg-white/10 rounded-full py-1.5 px-3 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">G</span>
                    <span className="text-[11px]">Cerca sul web...</span>
                  </div>
                  <span className="text-xs">🎙️</span>
                </div>

                {/* --- WIDGET 1: NEWS TICKER --- */}
                <div className="mt-3">
                  <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-between font-mono">
                    <span>WIDGET 1: TICKER NOTIZIE (1x4)</span>
                    <button
                      onClick={() => setIsPaused(!isPaused)}
                      className="text-sky-400 hover:underline cursor-pointer"
                    >
                      {isPaused ? '▶ Riprendi' : '⏸ Pausa'}
                    </button>
                  </div>

                  <div
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                    className="w-full bg-[#000836] border border-blue-900/60 rounded-2xl p-2.5 shadow-lg flex items-center gap-2 hover:border-sky-500 transition cursor-pointer"
                  >
                    {/* Logo originale 5LB + Badge */}
                    <div className="flex items-center gap-1.5 shrink-0 pl-0.5">
                      <Logo5LB className="h-4.5 sm:h-5" />
                      <div className="w-[1px] h-3.5 bg-slate-700" />
                      <span className="text-[9px] font-bold text-slate-400 uppercase">
                        {newsFeedType === 'archive' ? 'Archivio' : 'Ultime'}
                      </span>
                    </div>

                    {/* ViewFlipper Container */}
                    <div
                      onClick={() => {
                        const post = activePosts[currentArticleIndex];
                        if (post && onSelectPost) {
                          onSelectPost(post);
                          onClose();
                        }
                      }}
                      className="flex-1 min-w-0 pr-1 group"
                      title="Tocca per aprire l'articolo"
                    >
                      {activePosts[currentArticleIndex] ? (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                          <p className="text-xs font-semibold text-white truncate group-hover:text-sky-300 transition-colors">
                            {activePosts[currentArticleIndex].title}
                          </p>
                          <p className="text-[10px] text-sky-300/80 truncate">
                            {activePosts[currentArticleIndex].categories?.[0] || 'Notizie'} · Tocca per leggere
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 truncate">
                          Caricamento ultime notizie 5LB...
                        </p>
                      )}
                    </div>

                    {/* Feed switch button */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewsFeedType(newsFeedType === 'latest' ? 'archive' : 'latest');
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                        title="Cambia feed (Ultime / Archivio)"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Launcher Icons Mock */}
                <div className="grid grid-cols-4 gap-3 my-3 py-2">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-900 flex items-center justify-center p-1 shadow-md">
                      <Logo5LB className="h-5" />
                    </div>
                    <span className="text-[10px] text-slate-300">Magazine</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-sm shadow-md">
                      📞
                    </div>
                    <span className="text-[10px] text-slate-300">Telefono</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-2xl bg-sky-500 flex items-center justify-center text-sm shadow-md">
                      ✈️
                    </div>
                    <span className="text-[10px] text-slate-300">Telegram</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-2xl bg-amber-600 flex items-center justify-center text-sm shadow-md">
                      🧭
                    </div>
                    <span className="text-[10px] text-slate-300">Chrome</span>
                  </div>
                </div>

                {/* --- WIDGET 2: EZIOLOGIA BAR --- */}
                <div className="mt-1 mb-3">
                  <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-between font-mono">
                    <span>WIDGET 2: BARRA EZIOLOGIA (1x4)</span>
                    <span className="text-[9px] text-emerald-400">● 14 Apparati</span>
                  </div>

                  <div
                    onClick={() => setIsSimulatorBottomSheetOpen(true)}
                    className="w-full bg-[#000836] border border-blue-900/60 rounded-2xl p-2.5 shadow-lg flex items-center gap-2.5 hover:border-sky-400 hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer"
                  >
                    <span className="text-xl shrink-0">🫁</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-sky-400 tracking-wide">
                        EZIOLOGIA · 5LB
                      </p>
                      <p className="text-[10px] text-slate-300 truncate">
                        Tocca per aprire i 14 apparati biologici
                      </p>
                    </div>
                    <span className="text-slate-400 text-xs shrink-0">▲</span>
                  </div>
                </div>

                {/* Bottom App Dock */}
                <div className="bg-white/5 rounded-2xl py-2 px-3 flex items-center justify-around">
                  <span>📱</span>
                  <span>💬</span>
                  <span>📷</span>
                  <span>⚙️</span>
                </div>

                {/* Interactive BottomSheet Simulation */}
                {isSimulatorBottomSheetOpen && (
                  <div className="absolute inset-0 z-20 bg-black/75 backdrop-blur-[2px] flex flex-col justify-end animate-in fade-in duration-200">
                    <div className="bg-slate-900 border-t border-slate-700 rounded-t-2xl p-3 shadow-2xl max-h-[82%] flex flex-col animate-in slide-in-from-bottom duration-300">
                      <div className="w-9 h-1 bg-slate-600 rounded-full mx-auto mb-2" />
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div>
                          <p className="text-[10px] font-bold text-sky-400 tracking-wider">
                            EZIOLOGIA BIOLOGICA
                          </p>
                          <p className="text-xs font-bold text-white">
                            Seleziona un apparato
                          </p>
                        </div>
                        <button
                          onClick={() => setIsSimulatorBottomSheetOpen(false)}
                          className="p-1 text-slate-400 hover:text-white cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="overflow-y-auto divide-y divide-slate-800/60 py-1">
                        {ETIOLOGY_CATEGORIES.map((cat) => (
                          <div
                            key={cat.id}
                            onClick={() => {
                              setIsSimulatorBottomSheetOpen(false);
                              if (onSelectCategory) {
                                onSelectCategory(cat.id);
                              }
                              onClose();
                            }}
                            className="py-2 px-1.5 flex items-center justify-between hover:bg-white/5 rounded-lg transition cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base">{cat.emoji}</span>
                              <div>
                                <p className="text-xs font-semibold text-white">
                                  {cat.label}
                                </p>
                                <p className="text-[9px] text-slate-400">{cat.desc}</p>
                              </div>
                            </div>
                            <span className="text-[10px] text-sky-400 font-semibold">
                              Apri →
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Developer Note */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
                    Istruzioni e sorgenti per PWABuilder / Android Studio
                  </p>
                  <p>
                    I codici sorgente nativi in Kotlin e i file XML per aggiungere questi widget nel tuo APK Android sono documentati nel file{' '}
                    <code className="text-sky-600 dark:text-sky-400 font-semibold">README-WIDGETS-ANDROID.md</code>{' '}
                    e disponibili nella cartella <code className="text-sky-600 dark:text-sky-400 font-semibold">/android-widgets/</code>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>5LB Magazine — Tutti i diritti riservati</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
