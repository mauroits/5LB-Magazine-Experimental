import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  CheckCheck,
  Send,
  ShieldCheck,
  Users,
  CheckCircle2,
  Circle,
  Lock,
  Info,
  Smartphone,
  Loader2,
  Monitor
} from 'lucide-react';
import { NotificationItem } from '../types';
import { decodeHtmlEntities } from '../utils/textUtils';
import {
  getStoredNotifications,
  markNotificationAsRead,
  toggleNotificationRead,
  markAllNotificationsAsRead,
  requestPushPermission,
  triggerPushNotification,
  isAccadeOggiNotificationEnabled,
  setAccadeOggiNotificationEnabled,
  getLiveNotificationPermission,
  getDetectedPlatform
} from '../services/notificationService';
import { formatItalianDate } from '../services/bloggerFeed';

interface PermissionGuideInfo {
  type: 'how-to-block' | 'denied' | 'unsupported';
  title: string;
  text: string;
}

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPostId?: (postId: string) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  onSelectPostId,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [permissionGuide, setPermissionGuide] = useState<PermissionGuideInfo | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const detectedPlatform = getDetectedPlatform();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [accadeOggiNotifEnabled, setAccadeOggiNotifEnabled] = useState(true);

  const refreshList = async () => {
    setNotifications(getStoredNotifications());
    const livePerm = await getLiveNotificationPermission();
    setPermission(livePerm);
    setSoundEnabled(localStorage.getItem('5lb_magazine_sound_enabled_v1') !== 'false');
    setAccadeOggiNotifEnabled(isAccadeOggiNotificationEnabled());
    return livePerm;
  };

  useEffect(() => {
    if (isOpen) {
      refreshList();
      setPermissionGuide(null);
    }
  }, [isOpen]);

  // Rileva in tempo reale se l'utente cambia i permessi nel sistema e rientra nell'app
  useEffect(() => {
    if (!isOpen) return;

    const handleVisibilityOrFocus = async () => {
      const livePerm = await getLiveNotificationPermission();
      setPermission(livePerm);
      if (livePerm === 'granted') {
        setPermissionGuide(null);
        refreshList();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
      setPermission('unsupported');
      setPermissionGuide({
        type: 'unsupported',
        title: 'Browser non supportato',
        text: 'Il tuo browser attuale non supporta le notifiche push web.'
      });
      return;
    }

    setIsRequesting(true);

    try {
      // Invia la richiesta diretta al sistema operativo per sbloccare/autorizzare le notifiche
      const result = await requestPushPermission();
      setPermission(result);

      if (result === 'granted') {
        setPermissionGuide(null);
        triggerPushNotification(
          'Notifiche push 5LB Magazine attivate!',
          'Riceverai un avviso ogni volta che viene pubblicato un nuovo articolo.'
        );
        refreshList();
      } else if (result === 'denied') {
        setPermissionGuide({
          type: 'denied',
          title: 'Richiesta inviata al sistema',
          text: 'La chiamata al sistema operativo è stata inviata. Su dispositivi mobili (Android, iOS e altri), quando le notifiche vengono disattivate nelle impostazioni, il sistema sopprime la riapertura automatica del popup per privacy. Puoi attivarle facilmente seguendo i passaggi qui sotto:'
        });
      }
    } catch (err) {
      console.error('Errore richiesta autorizzazione:', err);
    } finally {
      setIsRequesting(false);
    }
  };

  const handlePermissionButtonClick = () => {
    if (permission === 'granted') {
      // Quando sono già attive: il clic per ribloccarle istruisce l'utente su come fare
      // visto che una PWA non può revocare l'autorizzazione di sistema concessa al browser
      setPermissionGuide((prev) =>
        prev?.type === 'how-to-block'
          ? null
          : {
              type: 'how-to-block',
              title: 'Come bloccare o disattivare le notifiche',
              text: 'Una PWA/sito web non può revocare autonomamente l\'autorizzazione concessa dal browser (norma di sicurezza del sistema operativo). Per bloccarle:'
            }
      );
    } else {
      // Quando sono bloccate (o da autorizzare), invia richiesta diretta al sistema
      handleRequestPermission();
    }
  };

  const handleTestNotification = () => {
    triggerPushNotification(
      '5LB Magazine: Nuovo articolo in prima pagina',
      'Verifica biologica di un sintomo acuto: interpretazione secondo la Seconda Legge Biologica.',
      'https://magazine.5lb.eu'
    );
    refreshList();
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('5lb_magazine_sound_enabled_v1', next ? 'true' : 'false');
  };

  const handleToggleAccadeOggiNotif = () => {
    const next = !accadeOggiNotifEnabled;
    setAccadeOggiNotifEnabled(next);
    setAccadeOggiNotificationEnabled(next);
  };

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead();
    refreshList();
  };

  const handleNotificationClick = (item: NotificationItem) => {
    markNotificationAsRead(item.id);
    refreshList();
    if (item.postId && onSelectPostId) {
      onSelectPostId(item.postId);
      onClose();
    } else if (item.url) {
      window.open(item.url, '_blank');
    }
  };

  const handleToggleSingleRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNotificationRead(id);
    refreshList();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full h-full sm:h-auto sm:max-h-[88vh] sm:max-w-xl bg-white dark:bg-slate-900 shadow-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-[#0e1838] px-5 py-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] text-white flex items-center justify-between gap-3 shadow-md shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                Centro Notifiche Push
              </h2>
              <p className="text-xs text-slate-300">
                Avvisi in tempo reale per le nuove uscite di 5LB Magazine
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings cards */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 shrink-0 space-y-2.5">
          {/* Rettangolo 1: Stato autorizzazione browser (graficamente coerente con gli altri rettangoli) */}
          <div
            onClick={permission !== 'unsupported' ? handlePermissionButtonClick : undefined}
            className={`flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xs transition ${
              permission !== 'unsupported'
                ? 'cursor-pointer hover:border-orange-300 dark:hover:border-slate-600'
                : ''
            }`}
            title={
              permission === 'granted'
                ? 'Notifiche autorizzate nel browser'
                : 'Fai clic per autorizzare le notifiche del browser'
            }
          >
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div
                className={`p-1.5 rounded-lg shrink-0 ${
                  permission === 'granted'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                    : permission === 'denied'
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  Stato autorizzazione browser
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {permission === 'granted'
                    ? 'Ricezione attiva • Clicca per come bloccarle'
                    : permission === 'denied'
                    ? 'Bloccate nel browser • Clicca per sbloccare'
                    : permission === 'unsupported'
                    ? 'Non supportate da questo browser'
                    : 'Fai clic per consentire le notifiche sul dispositivo'}
                </p>
              </div>
            </div>

            {permission === 'granted' ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePermissionButtonClick();
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer active:scale-95 transition"
                title="Notifiche autorizzate. Fai clic per scoprire come bloccarle nel browser"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>Attive</span>
              </button>
            ) : permission === 'denied' ? (
              <button
                type="button"
                disabled={isRequesting}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePermissionButtonClick();
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-75 text-white flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer active:scale-95 transition"
                title="Invia richiesta diretta al sistema per sbloccare le notifiche"
              >
                {isRequesting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Richiesta...</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    <span>Sblocca</span>
                  </>
                )}
              </button>
            ) : permission === 'unsupported' ? (
              <button
                type="button"
                disabled
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 shrink-0 cursor-not-allowed"
              >
                <span>Non supportate</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isRequesting}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePermissionButtonClick();
                }}
                className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-75 text-white font-bold text-xs shadow-xs transition active:scale-95 shrink-0 cursor-pointer flex items-center gap-1.5"
                title="Fai clic per autorizzare le notifiche del browser"
              >
                {isRequesting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Richiesta...</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-3.5 h-3.5" />
                    <span>Autorizza</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Istruzioni / Guida contestuale al click */}
          {permissionGuide && (
            <div
              className={`p-3 rounded-xl border text-xs shadow-2xs animate-in fade-in space-y-2 ${
                permissionGuide.type === 'how-to-block'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-slate-800 dark:text-slate-200'
                  : permissionGuide.type === 'denied'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-slate-800 dark:text-slate-200'
                  : 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/60 text-slate-800 dark:text-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 font-bold">
                  {permissionGuide.type === 'how-to-block' ? (
                    <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  ) : (
                    <Info className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                  <span>{permissionGuide.title}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPermissionGuide(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shrink-0"
                  aria-label="Chiudi guida"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="leading-relaxed text-[11px] text-slate-600 dark:text-slate-300">
                {permissionGuide.text}
              </p>

              {/* Contenuto istruzioni mirate al sistema operativo rilevato */}
              <div className="bg-white/95 dark:bg-slate-900/95 rounded-xl p-3 border border-slate-200/80 dark:border-slate-800 space-y-2.5 text-[11px] text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 pb-1 border-b border-slate-100 dark:border-slate-800">
                  {detectedPlatform === 'desktop' ? (
                    <Monitor className="w-4 h-4 text-orange-500 shrink-0" />
                  ) : (
                    <Smartphone className="w-4 h-4 text-orange-500 shrink-0" />
                  )}
                  <span>
                    {detectedPlatform === 'android'
                      ? 'Istruzioni per dispositivo Android'
                      : detectedPlatform === 'ios'
                      ? 'Istruzioni per iPhone / iPad (iOS)'
                      : 'Istruzioni per il browser (Computer)'}
                  </span>
                </div>

                {detectedPlatform === 'android' && (
                  <div className="space-y-2.5">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        <span>Se usi l'app installata (schermata Home):</span>
                      </p>
                      <ol className="space-y-1.5 pl-1 text-slate-700 dark:text-slate-300">
                        <li className="flex items-start gap-2">
                          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold shrink-0 text-[10px] mt-0.5">1</span>
                          <span>Tieni premuta l'icona di <strong>5LB Magazine</strong> sulla schermata Home per 1 secondo.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold shrink-0 text-[10px] mt-0.5">2</span>
                          <span>Tocca l'icona <strong>Info app (ℹ️)</strong> nel menu a comparsa.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold shrink-0 text-[10px] mt-0.5">3</span>
                          <span>Tocca <strong>Notifiche</strong> e {permissionGuide.type === 'denied' ? 'attiva' : 'disattiva'} l'opzione <strong>Consenti notifiche</strong>.</span>
                        </li>
                      </ol>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                      <p className="font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        <span>Se usi l'app nel browser Chrome:</span>
                      </p>
                      <p className="pl-3.5 text-slate-600 dark:text-slate-300">
                        Tocca l'icona del lucchetto 🔒 accanto all'indirizzo web in alto e imposta <strong>Notifiche</strong> su <strong>{permissionGuide.type === 'denied' ? 'Consenti' : 'Blocca'}</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {detectedPlatform === 'ios' && (
                  <div className="space-y-2.5">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        <span>Se usi l'app installata su iPhone / iPad:</span>
                      </p>
                      <ol className="space-y-1.5 pl-1 text-slate-700 dark:text-slate-300">
                        <li className="flex items-start gap-2">
                          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold shrink-0 text-[10px] mt-0.5">1</span>
                          <span>Apri le <strong>Impostazioni</strong> del tuo iPhone o iPad.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold shrink-0 text-[10px] mt-0.5">2</span>
                          <span>Scorri l'elenco e tocca <strong>5LB Magazine</strong> (oppure vai in <strong>Notifiche &gt; 5LB Magazine</strong>).</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold shrink-0 text-[10px] mt-0.5">3</span>
                          <span>{permissionGuide.type === 'denied' ? 'Attiva' : 'Disattiva'} l'interruttore <strong>Consenti notifiche</strong>.</span>
                        </li>
                      </ol>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                      <p className="font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        <span>Se usi l'app in Safari:</span>
                      </p>
                      <p className="pl-3.5 text-slate-600 dark:text-slate-300">
                        Apri <strong>Impostazioni &gt; Safari &gt; Notifiche</strong> e consenti le notifiche per questo sito.
                      </p>
                    </div>
                  </div>
                )}

                {detectedPlatform === 'desktop' && (
                  <div className="space-y-2">
                    <p className="font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                      <span>Nel browser (Chrome, Edge, Firefox, Safari):</span>
                    </p>
                    <ol className="space-y-1.5 pl-1 text-slate-700 dark:text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold shrink-0 text-[10px] mt-0.5">1</span>
                        <span>Clicca sull'icona delle impostazioni del sito o del lucchetto 🔒 a sinistra dell'indirizzo web in alto.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold shrink-0 text-[10px] mt-0.5">2</span>
                        <span>Accanto alla voce <strong>Notifiche</strong>, seleziona <strong>{permissionGuide.type === 'denied' ? 'Consenti' : 'Blocca'}</strong>.</span>
                      </li>
                    </ol>
                  </div>
                )}

                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/50 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Nota:</strong> una volta modificate le autorizzazioni nelle impostazioni del dispositivo, lo stato si aggiornerà automaticamente al <strong>prossimo avvio dell'applicazione</strong> (chiudi e riapri l'app).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Rettangolo 2: Notifiche feed "Accade Oggi" */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  Notifiche feed "Accade Oggi"
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Notizie flash e post dai canali social
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleAccadeOggiNotif}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 ${
                accadeOggiNotifEnabled
                  ? 'bg-sky-600 text-white hover:bg-sky-700 shadow-xs'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
              }`}
              title="Attiva o disattiva le notifiche per il feed Accade Oggi"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${accadeOggiNotifEnabled ? 'bg-white' : 'bg-slate-400'}`} />
              <span>{accadeOggiNotifEnabled ? 'Attive' : 'Disattivate'}</span>
            </button>
          </div>

          {/* Rettangolo 3: Segnale acustico e invio notifica di prova */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 shrink-0">
                <Volume2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  Segnale acustico e test
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Avviso sonoro e verifica ricezione
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleSound}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer active:scale-95 border ${
                  soundEnabled
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title={soundEnabled ? 'Disattiva segnale acustico' : 'Attiva segnale acustico'}
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Attivo</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                    <span>Muto</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleTestNotification}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 border border-slate-200 dark:border-slate-700 hover:border-sky-200 dark:hover:border-sky-800/60 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Verifica subito l'invio della notifica sul dispositivo"
              >
                <Send className="w-3.5 h-3.5 text-sky-500" />
                <span>Invia prova</span>
              </button>
            </div>
          </div>
        </div>

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Avvisi recenti ({notifications.length})
            </span>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/40 text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 border border-slate-200 dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-800 transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                title="Segna tutti gli avvisi come già letti"
              >
                <CheckCheck className="w-3 h-3 text-orange-500" />
                <span>Segna tutte come lette</span>
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500">
              <BellRing className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">Nessuna notifica al momento</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Quando verranno pubblicati nuovi post su magazine.5lb.eu, appariranno qui automaticamente.
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`group p-3.5 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                  item.read
                    ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-80 hover:opacity-100 hover:border-slate-300 dark:hover:border-slate-700'
                    : 'bg-orange-50/60 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/60 shadow-xs hover:border-orange-300 dark:hover:border-orange-800'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full mt-1.5 shrink-0 transition-colors ${
                    item.read
                      ? 'bg-slate-300 dark:bg-slate-600'
                      : 'bg-orange-500 ring-2 ring-orange-200 dark:ring-orange-950'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {decodeHtmlEntities(item.title)}
                    </h5>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {formatItalianDate(item.date)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                    {decodeHtmlEntities(item.body)}
                  </p>
                </div>

                {/* Pulsante dedicato per cambiare lo stato letto / non letto */}
                <button
                  type="button"
                  onClick={(e) => handleToggleSingleRead(item.id, e)}
                  className={`px-2 py-1.5 rounded-xl border transition-all shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                    item.read
                      ? 'border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50/50'
                      : 'border-orange-300 dark:border-orange-800 bg-orange-100/90 dark:bg-orange-950 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900 font-semibold shadow-2xs'
                  }`}
                  title={item.read ? 'Contrassegna come non letta' : 'Contrassegna come letta'}
                  aria-label={item.read ? 'Contrassegna come non letta' : 'Contrassegna come letta'}
                >
                  {item.read ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[11px] hidden sm:inline">Letta</span>
                    </>
                  ) : (
                    <>
                      <Circle className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 fill-orange-500/20" />
                      <span className="text-[11px] hidden sm:inline">Da leggere</span>
                    </>
                  )}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
