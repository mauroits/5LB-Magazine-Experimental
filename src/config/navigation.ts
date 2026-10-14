import { NavItem, NavSection } from '../types';

/**
 * ============================================================================
 * CONFIGURAZIONE MENU & LINK (5LB MAGAZINE)
 * ============================================================================
 * 
 * Puoi modificare facilmente sia gli indirizzi (targetUrl) sia l'ORDINE delle voci:
 * - Per riordinare gli elementi del menu: sposta semplicemente le righe verso l'alto o il basso.
 * - Per cambiare un link: modifica il valore di 'targetUrl'.
 * - Per i feed RSS (INFORMAZIONE ed EZIOLOGIA): il campo 'rssCategory' corrisponde
 *   all'etichetta presente su Blogger (es. 'NEWS', 'D: covid19', 'C: vie respiratorie').
 */

// Link al Google Notebook pubblico sulle 5 Leggi Biologiche
export const GOOGLE_NOTEBOOK_URL =
  'https://notebook.google.com/notebook/47913756-695d-4076-b64a-be74986cfdf8';

// Canale Telegram ufficiale di 5LB Magazine (aperto dentro l'app nella sezione Accade oggi)
export const TELEGRAM_CHANNEL_URL = 'https://t.me/s/magazine5LB';

// Endpoint del feed pubblico Blogger di 5LB Magazine
export const BLOGGER_FEED_URL =
  'https://magazine.5lb.eu/feeds/posts/default?alt=json';

/**
 * RITARDO DI PUBBLICAZIONE (in ore)
 * Ritarda lo scarico e la notifica dei nuovi articoli di 2 ore rispetto alla data
 * di pubblicazione iniziale su Blogger, permettendoti di modificare l'URL o il testo
 * senza generare link non funzionanti nell'app.
 */
export const PUBLICATION_DELAY_HOURS = 2;

// Filtri rapidi superiori
export const QUICK_FILTERS: NavItem[] = [
  {
    id: 'filter-accade-oggi',
    label: 'Accade oggi',
    type: 'filter',
    iconName: 'users',
    description: 'Feed in tempo reale dai canali social',
  },
  {
    id: 'filter-ultime',
    label: 'Il mio archivio',
    type: 'filter',
    iconName: 'archive',
    description: 'Tutti gli articoli pubblicati su 5LB Magazine',
  },
  {
    id: 'filter-non-letto',
    label: 'Non letto',
    type: 'filter',
    iconName: 'mail',
  },
  {
    id: 'filter-ti-piace',
    label: 'Salvati per dopo',
    type: 'filter',
    iconName: 'heart',
  },
];

/**
 * Macro-sezioni del menu laterale (con relative voci, icone e link).
 * Puoi aggiungere, rimuovere, rinominare o riordinare le sezioni e i rispettivi elementi.
 */
export const NAV_SECTIONS: NavSection[] = [
  // 1. INFORMAZIONE (Feed RSS)
  {
    id: 'informazione',
    title: 'INFORMAZIONE',
    collapsible: true,
    defaultOpen: true,
    items: [
      {
        id: 'info-premessa',
        label: 'PREMESSA',
        type: 'rss',
        iconName: 'arrow-right-circle',
        rssCategory: 'PREMESSA',
        description: 'Premessa e orientamento alle notizie del magazine',
      },
      {
        id: 'info-notizie',
        label: 'Notizie revisionate',
        type: 'rss',
        iconName: 'newspaper',
        rssCategory: 'NEWS',
        description: 'Notizie scientifiche e attualità rilette con le 5LB',
      },
      {
        id: 'info-sovradiagnosi',
        label: 'Sovradiagnosi',
        type: 'rss',
        iconName: 'search-plus',
        rssCategory: 'OVERDIAGNOSI',
        description: 'Articoli su diagnosi precoce, screening e sovradiagnosi',
      },
      {
        id: 'info-sintomi-cronici',
        label: 'Sintomi cronici',
        type: 'rss',
        iconName: 'repeat',
        rssCategory: 'ROUTINE',
        description: 'Comprendere le recidive e i sintomi cronici',
      },
      {
        id: 'info-esperienza',
        label: 'Esperienza con le 5LB',
        type: 'rss',
        iconName: 'message-square-check',
        rssCategory: 'Esperienza 5LB',
        description: 'Esperienze dirette e testimonianze applicative',
      },
      {
        id: 'info-bene-male',
        label: 'Fa bene o fa male?',
        type: 'rss',
        iconName: 'alert-triangle',
        rssCategory: 'BENE-MALE',
        description: 'Analisi biologica al di là del dualismo bene/male',
      },
      {
        id: 'info-terapia',
        label: 'Terapia?',
        type: 'rss',
        iconName: 'git-fork',
        rssCategory: 'TERAPIA',
        description: 'Riflessioni sulla terapia e l’autonomia del processo biologico',
      },
      {
        id: 'info-covid19',
        label: 'COVID19',
        type: 'rss',
        iconName: 'custom-covid19',
        rssCategory: 'D: covid19',
        description: 'Articoli e approfondimenti biologici sul tema Covid-19',
      },
      {
        id: 'info-libri',
        label: 'Libri e monografie',
        type: 'link',
        iconName: 'book-open',
        targetUrl: 'https://magazine.5lb.eu/p/libri-dispense.html',
        description: 'Recensioni bibliografiche e monografie',
      },
    ],
  },

  // 2. FORMAZIONE (Link diretti a pagine web esterne)
  {
    id: 'formazione',
    title: 'FORMAZIONE',
    collapsible: true,
    defaultOpen: false,
    items: [
      {
        id: 'form-dex',
        label: 'Il percorso 5LB DEX',
        type: 'link',
        iconName: 'custom-dex',
        targetUrl: 'https://dex.5lb.eu/corsi-meloni-sartorio',
        description: 'Il percorso completo di apprendimento esperienziale',
      },
      {
        id: 'form-neofiti',
        label: 'Conferenze introduttiv...',
        type: 'link',
        iconName: 'custom-neofiti',
        targetUrl: 'https://dex.5lb.eu/categoria-corsi/neofiti',
        description: 'Conferenze per chi si avvicina per la prima volta alle 5LB',
      },
      {
        id: 'form-cognitivo',
        label: 'Corsi Base',
        type: 'link',
        iconName: 'custom-cognitivo',
        targetUrl: 'https://dex.5lb.eu/categoria-corsi/cognitivo',
        description: 'Apprendimento teorico e basi delle 5 Leggi Biologiche',
      },
      {
        id: 'form-applicativo',
        label: 'Lezioni applicative ava...',
        type: 'link',
        iconName: 'custom-applicativo',
        targetUrl: 'https://dex.5lb.eu/categoria-corsi/applicativo',
        description: 'Approfondimenti pratici e verifica clinica/personale',
      },
      {
        id: 'form-operatori',
        label: 'Scuole per professionisti',
        type: 'link',
        iconName: 'custom-operatori',
        targetUrl: 'https://framework.5lb.eu/it/for-professionals',
        description: 'Formazione specialistica per operatori della salute',
      },
    ],
  },

  // 3. LABORATORIO DI PRESENZA (Link diretti a pagine web esterne)
  {
    id: 'laboratorio-presenza',
    title: 'LABORATORIO DI PRESENZA',
    collapsible: true,
    defaultOpen: false,
    items: [
      {
        id: 'lab-presenza',
        label: 'Laboratorio',
        type: 'link',
        iconName: 'custom-presenzalab',
        targetUrl: 'https://dex.5lb.eu/corsi/laboratorio-di-presenza',
        description: 'Incontri ed esercizi di presenza biologica',
      },
      {
        id: 'lab-hub',
        label: 'Crea un HUB',
        type: 'link',
        iconName: 'custom-presencing-circle',
        targetUrl: 'https://plus.magazine.5lb.eu/hub-del-laboratorio-di-presenza',
        description: 'Crea un gruppo locale per la pratica condivisa',
      },
    ],
  },

  // 4. CONSULENZA INDIVIDUALE (Link diretti a pagine web esterne)
  {
    id: 'consulenza-individuale',
    title: 'CONSULENZA INDIVIDUALE',
    collapsible: true,
    defaultOpen: false,
    items: [
      {
        id: 'cons-chi',
        label: 'Consulenza - per chi?',
        type: 'link',
        iconName: 'message-circle',
        targetUrl: 'https://framework.5lb.eu/it/consultancy-who-is-for',
        description: 'Per chi è adatta una consulenza individuale con le 5LB',
      },
      {
        id: 'cons-chiedi',
        label: 'Chiedi una consulenza',
        type: 'link',
        iconName: 'custom-consulenza',
        targetUrl: 'https://framework.5lb.eu/it/path-health-personal-choice',
        description: 'Contatta il team per fissare una sessione',
      },
    ],
  },

  // 5. 5LB FRAMEWORK (Link diretti a pagine web esterne)
  {
    id: 'framework',
    title: '5LB FRAMEWORK',
    collapsible: true,
    defaultOpen: false,
    items: [
      {
        id: 'frame-7passi',
        label: '7 passi per cominciare',
        type: 'link',
        iconName: 'hash-7',
        targetUrl: 'https://magazine.5lb.eu/2015/08/principianti-studiare-5-leggi-biologiche-hamernuovamedicinagermanica.html',
        description: 'La guida introduttiva in 7 passaggi chiari',
      },
      {
        id: 'frame-ecosistema',
        label: 'Eco-sistema 5LB',
        type: 'link',
        iconName: 'custom-framework',
        targetUrl: 'https://framework.5lb.eu/it/eco-system',
        description: 'L’architettura integrata del mondo 5LB',
      },
      {
        id: 'frame-vita-hameriano',
        label: 'Una vita da Hameriano',
        type: 'link',
        iconName: 'custom-hameriano',
        targetUrl: 'https://vitadahameriano.5lb.eu/',
        description: 'Riflessioni e stile di vita secondo il paradigma biologico',
      },
      {
        id: 'frame-androgyne',
        label: 'AndroGyne',
        type: 'link',
        iconName: 'custom-androgyne',
        targetUrl: 'https://androgyne.5lb.eu/',
        description: 'La polarità biologica e l’approccio integrato',
      },
      {
        id: 'frame-storia',
        label: 'Raccontaci la tua storia',
        type: 'link',
        iconName: 'message-circle',
        targetUrl: 'https://framework.5lb.eu/it/vostre-storie-5-leggi-biologiche',
        description: 'Condividi la tua esperienza con le 5 Leggi Biologiche',
      },
    ],
  },

  // 6. EZIOLOGIA (Feed RSS per apparati biologici)
  {
    id: 'eziologia',
    title: 'EZIOLOGIA',
    collapsible: true,
    defaultOpen: false,
    items: [
      {
        id: 'guida-studio',
        label: 'Guida allo studio',
        type: 'link',
        iconName: 'book-open',
        targetUrl: 'https://magazine.5lb.eu/p/eziologia.html',
        description: 'Guida allo studio',
      },
      {
        id: 'ezio-respiratorie',
        label: 'Vie respiratorie',
        type: 'rss',
        iconName: 'bookmark',
        rssCategory: 'C: vie respiratorie',
      },
      {
        id: 'ezio-bocca',
        label: 'Cavità orale',
        type: 'rss',
        iconName: 'bookmark',
        rssCategory: 'C: bocca',
      },
      {
        id: 'ezio-seno',
        label: 'Seno',
        type: 'rss',
        iconName: 'bookmark',
        rssCategory: 'C: seno',
      },
      {
        id: 'ezio-gastro',
        label: 'App. gastro-intestinale',
        type: 'rss',
        iconName: 'bookmark',
        rssCategory: 'C: intestino',
      },
      {
        id: 'ezio-cardio',
        label: 'App. cardio-circolatorio',
        type: 'rss',
        iconName: 'bookmark',
        rssCategory: 'C: sistema circolatorio',
      },
      {
        id: 'ezio-urinario',
        label: 'Apparato urinario',
        type: 'rss',
        iconName: 'bookmark',
        rssCategory: 'C: apparato urinario',
      },
      {
        id: 'ezio-genitale',
        label: 'Apparato genitale',
        type: 'rss',
        iconName: 'bookmark',
        rssCategory: 'C: apparato genitale',
      },
      {
        id: 'ezio-muscolo',
        label: 'App. muscolo-schelet...',
        type: 'rss',
        iconName: 'bookmark',
        rssCategory: 'C: apparato muscolo-scheletrico',
      },
      {
        id: 'ezio-pelle',
        label: 'La pelle',
        type: 'rss',
        iconName: 'bookmark',
        rssCategory: 'C: pelle',
      },
       {
        id: 'ezio-nervoso',
        label: 'Sistema nervoso',
        type: 'rss',
        iconName: 'bookmark',
        rssCategory: 'C: sistema nervoso',
      },
      {
        id: 'ezio-sensi',
        label: 'Vista, udito, olfatto',
        type: 'rss',
        iconName: 'bookmark',
        rssCategory: 'C: sistema vis olf uditivo',
      },
       {
        id: 'ezio-allergie',
        label: 'Intolleranze e allergie',
        type: 'rss',
        iconName: 'bookmark',
        rssCategory: 'D: intolleranze',
      },
       {
        id: 'ezio-psicosi',
        label: 'Psicosi',
        type: 'rss',
        iconName: 'bookmark',
        rssCategory: 'COSTELLAZIONI',
      },
      {
        id: 'ezio-lateralita',
        label: 'La lateralità',
        type: 'rss',
        iconName: 'bookmark',
        rssCategory: 'MANCINO',
      },
    ],
  },
];
