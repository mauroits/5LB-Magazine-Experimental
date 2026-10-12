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
  Cookie
} from 'lucide-react';
import { Logo5LB } from './Logo5LB';
import { INFO_PAGE_CONTENT } from '../config/infoContent';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshFeed?: () => void;
  isRefreshing?: boolean;
  onOpenCookieSettings?: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  onClose,
  onRefreshFeed,
  isRefreshing = false,
  onOpenCookieSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'funzioni' | 'aggiornamenti' | 'contatti' | 'privacy'>('funzioni');
  const [refreshDone, setRefreshDone] = useState(false);

  if (!isOpen) return null;

  const content = INFO_PAGE_CONTENT;

  // Icons for feature cards
  const featureIcons = [Layers, Sparkles, Bell, WifiOff];

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
                      {idx === 0 && onRefreshFeed && (
                        <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-700/80">
                          <button
                            onClick={handleManualRefresh}
                            disabled={isRefreshing}
                            className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
                            title="Riscarica tutti i feed RSS da Blogger e aggiorna la memoria locale"
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
