import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  CheckCheck,
  Send,
  Calendar,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Users,
  Clock
} from 'lucide-react';
import { NotificationItem } from '../types';
import {
  getStoredNotifications,
  markAllNotificationsAsRead,
  requestPushPermission,
  triggerPushNotification,
  isAccadeOggiNotificationEnabled,
  setAccadeOggiNotificationEnabled
} from '../services/notificationService';
import { formatItalianDate } from '../services/bloggerFeed';

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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [accadeOggiNotifEnabled, setAccadeOggiNotifEnabled] = useState(true);

  const refreshList = () => {
    setNotifications(getStoredNotifications());
    if ('Notification' in window) {
      setPermission(Notification.permission);
    } else {
      setPermission('unsupported');
    }
    setSoundEnabled(localStorage.getItem('5lb_magazine_sound_enabled_v1') !== 'false');
    setAccadeOggiNotifEnabled(isAccadeOggiNotificationEnabled());
  };

  useEffect(() => {
    if (isOpen) {
      refreshList();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const result = await requestPushPermission();
    setPermission(result);
    if (result === 'granted') {
      triggerPushNotification(
        'Notifiche push 5LB Magazine attivate!',
        'Riceverai un avviso ogni volta che viene pubblicato un nuovo articolo.'
      );
      refreshList();
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

        {/* Settings row: Permission status & sound */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 shrink-0 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Stato autorizzazione browser:
                <span className="capitalize font-mono text-orange-600 dark:text-orange-400">
                  {permission === 'granted'
                    ? 'Attive'
                    : permission === 'denied'
                    ? 'Bloccate'
                    : 'Da abilitare'}
                </span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {permission === 'granted'
                  ? 'Il dispositivo riceverà avvisi sonori e visivi sui nuovi post.'
                  : 'Consenti le notifiche per non perdere gli aggiornamenti del magazine.'}
              </p>
            </div>

            {permission !== 'granted' && permission !== 'unsupported' && (
              <button
                onClick={handleRequestPermission}
                className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs shadow-xs transition active:scale-95 shrink-0 self-start sm:self-auto cursor-pointer"
              >
                Abilita Notifiche
              </button>
            )}
          </div>

          {/* Feed selective notifications toggles */}
          <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
            {/* Accade Oggi feed notification toggle (user-controllable) */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Notifiche feed "Accade Oggi"
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Notizie flash e post dal canale Telegram @magazine5LB
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

            {/* General magazine articles (always on) */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Notifiche articoli 5LB Magazine
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Nuove pubblicazioni della rivista sulle 5 Leggi Biologiche
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 rounded-lg shrink-0">
                Sempre attive
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={toggleSound}
              className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-orange-600 transition cursor-pointer"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-orange-500" />
                  <span>Segnale acustico: <strong>Attivo</strong></span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-slate-400" />
                  <span>Segnale acustico: <strong>Disattivato</strong></span>
                </>
              )}
            </button>

            <button
              onClick={handleTestNotification}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              title="Verifica subito l'invio della notifica sul dispositivo"
            >
              <Send className="w-3 h-3" />
              <span>Invia notifica di prova</span>
            </button>
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
                onClick={handleMarkAllRead}
                className="text-xs text-slate-500 hover:text-orange-600 flex items-center gap-1 transition"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Segna tutte come lette
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
                onClick={() => {
                  if (item.postId && onSelectPostId) {
                    onSelectPostId(item.postId);
                    onClose();
                  } else if (item.url) {
                    window.open(item.url, '_blank');
                  }
                }}
                className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                  item.read
                    ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-80'
                    : 'bg-orange-50/60 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/60 shadow-xs'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {item.title}
                    </h5>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {formatItalianDate(item.date)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                    {item.body}
                  </p>
                </div>
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
