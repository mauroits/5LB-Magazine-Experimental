import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Copy,
  Check,
  HelpCircle,
  Smartphone,
  Globe,
  Bot,
  ArrowRight
} from 'lucide-react';
import { IconNotebookLM } from './CustomIcons';
import { GOOGLE_NOTEBOOK_URL } from '../config/navigation';
import { openNotebookWithPriority } from '../utils/notebookLauncher';

interface NotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotebookModal: React.FC<NotebookModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleLaunch = () => {
    openNotebookWithPriority();
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(GOOGLE_NOTEBOOK_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const suggestedQuestions = [
    'Qual è il senso biologico del relè della laringe nelle 5LB?',
    'Spiegami la differenza tra fase simpaticotonica e vagotonica.',
    'Quali foglietti embrionali governano i bronchi e gli alveoli?',
    'Cosa accade durante la crisi epilettoide nei conflitti biologici?',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
        {/* Header */}
        <div className="bg-[#0e1838] px-5 py-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] text-white flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shrink-0">
              <IconNotebookLM className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold truncate">
                  Google NotebookLM
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  <ShieldCheck className="w-3 h-3" /> 5LB Magazine
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate">
                Assistente IA & Ricerca semantica sulle 5 Leggi Biologiche
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
            title="Chiudi finestra"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 overflow-y-auto max-h-[80vh] flex flex-col gap-5">
          {/* Hero Feature Box */}
          <div className="rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50/50 to-orange-50/30 dark:from-slate-800/80 dark:via-slate-800/50 dark:to-slate-800/20 p-5 border border-blue-200/60 dark:border-slate-700">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 mt-0.5 shadow-md">
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  Quaderno ufficiale 5LB Magazine con Gemini
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                  Interroga l’intero archivio di 5LB Magazine: eziologia, sintomi, foglietti embrionali e verifiche biologiche con risposte immediate e citazioni dirette alle fonti originali.
                </p>
              </div>
            </div>

            {/* Launch Buttons */}
            <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <button
                onClick={handleLaunch}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 active:scale-95 transition cursor-pointer"
              >
                <Smartphone className="w-4 h-4 shrink-0" />
                <span>Apri nell’app / Webview Google</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              <button
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-750 transition cursor-pointer"
                title="Copia link per condivisione o altri browser"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copiato!' : 'Copia link'}</span>
              </button>
            </div>
          </div>

          {/* How it works info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-start gap-2.5">
              <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800 dark:text-slate-200 block mb-0.5">
                  Priorità automatica all'App
                </strong>
                <span className="text-slate-500 dark:text-slate-400">
                  Se hai installato l’app o la PWA di NotebookLM sul dispositivo, si apre direttamente nell’applicazione nativa.
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-start gap-2.5">
              <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800 dark:text-slate-200 block mb-0.5">
                  Webview Google funzionante
                </strong>
                <span className="text-slate-500 dark:text-slate-400">
                  Se l'app non è installata, si apre la webview ufficiale di Google con il tuo account, senza blocchi o schermate grigie.
                </span>
              </div>
            </div>
          </div>

          {/* Suggested Prompts */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Domande d’esempio che puoi fare</span>
            </h4>
            <div className="flex flex-col gap-1.5">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={handleLaunch}
                  className="text-left p-2.5 rounded-xl bg-slate-50 hover:bg-orange-50 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 transition flex items-center justify-between gap-2 cursor-pointer group"
                >
                  <span className="truncate">{q}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/60 px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="truncate">
            Richiede un account Google per salvare conversazioni e note.
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium transition cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
