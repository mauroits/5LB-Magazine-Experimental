/**
 * ============================================================================
 * TESTI DELLA PAGINA INFORMAZIONI E DEL BANNER IA
 * ============================================================================
 * 
 * Puoi modificare facilmente tutti i testi di seguito.
 * Le modifiche avranno effetto immediato nella pagina Informazioni e nel banner.
 */

// 1. Configurazione del Banner (mostrato in cima alla lista degli articoli)
export const AI_BANNER_CONFIG = {
  badge: 'Ricerca semantica',
  title: 'Fai una domanda in linguaggio naturale',
  description:
    'Esplora il mondo osservato attraverso le 5LB, sintetizza le leggi biologiche e poni quesiti (account Google necessario).',
  buttonText: 'Chiedimi',
};

// 2. Testi della Pagina Informazioni (accessibile dall'icona ℹ️)
export const INFO_PAGE_CONTENT = {
  headerSubtitle: 'Guida & Informazioni',

  // Scheda: Funzioni
  funzioni: {
    title: 'Panoramica delle Funzionalità',
    intro:
      'Questa App è l’hub integrato di 5LB Magazine e 5LB Framework, progettata per la consultazione fluida su smartphone, tablet e desktop. Più navighi tra le sezioni e più cerchi all’interno dell’app, più collezioni articoli, conoscenza e varietà nel tuo archivio personale.',
    cards: [
      {
        title: 'Collezione Articoli & Badge di Conoscenza',
        description:
          'Più navighi tra le diverse categorie ed eziologie e più cerchi all’interno dell’app, più collezioni articoli, conoscenza e varietà in "Il mio archivio". Raggiungendo i traguardi di 20, 80, 150, 250 e 350 articoli collezionati sblocchi un riconoscimento di livello. Ogni sblocco è notificato e avrai un’icona speciale nella pagina "Il mio archivio" e nella barra di navigazione.',
      },
      {
        title: 'Aggregatore di notizie & Archivio',
        description:
          'Collegamento diretto alle pubblicazioni del 5LB Magazine, organizzate per sezioni informative e sulla Eziologia (sintomi e apparati). Inoltre sono visualizzabili le novità social quotidiane dai canali social.',
      },
      {
        title: 'Assistente per una ricerca in linguaggio naturale',
        description:
          'Puoi porre domande e ottenere risposte sintetizzate sulle fonti di 5LB Magazine. Necessario autenticarsi con account Google.',
      },
      {
        title: 'Notifiche Push in Tempo Reale',
        description:
          'Avviso immediato su smartphone e computer ad ogni nuova pubblicazione e al raggiungimento di nuovi traguardi e badge sbloccati.',
      },
      {
        title: 'Modalità Offline & Installazione',
        description:
          'Installabile sulla schermata Home come applicazione nativa. Tutti gli articoli consultati vengono salvati in cache per la lettura anche senza connessione.',
      },
    ],
  },

  // Scheda: Ultimi Aggiornamenti (Changelog)
  aggiornamenti: {
    title: 'Registro delle Versioni & Miglioramenti',
    releases: [
      {
        version: '2.2.1 (attuale)',
        date: 'Ottobre 2026',
        isCurrent: true,
        notes: [
          'Aggiunta pagina di notize quotidiane dal flusso social',
          'Aggiunto sistema di livelli di studio e partecipazione',
          'Varie sistemazioni grafiche',
        ],
      },
      {
        version: '2.0.0',
        date: 'Settembre 2026',
        isCurrent: false,
        notes: [
          'Nuova versione completamente riscritta dalle fondamenta, compatibile con qualunque dispositivo Android, iOS e altri che supportino le Progressive Web App',,
        ],
      },
      {
        version: '1.0.0',
        date: 'Febbraio 2016',
        isCurrent: false,
        notes: [
          'Prima versione Android pubblicata nel lontano 2016, giunta nel 2023 alla versione 1.7',
        ],
      },
    ],
  },

  // Scheda: Contatti
  contatti: {
    title: 'Contatti & Riferimenti Ufficiali',
    intro:
      'Per chiarimenti, consulenze o supporto sull’applicazione puoi fare riferimento ai canali ufficiali:',
    mainWebsiteUrl: 'https://framework.5lb.eu/it/contacts',
  },

  // Scheda: Privacy Policy
  privacy: {
    title: 'Informativa sulla Privacy & Gestione Dati',
    intro:
      'La presente webapp è progettata secondo i principi di Privacy by Design e minimizzazione dei dati:',
    points: [
      {
        title: 'Dati Memorizzati in Locale (Local Storage)',
        text: 'Lo stato degli articoli letti, gli articoli contrassegnati nei salvati ("Salva per dopo") e le preferenze delle notifiche sono memorizzati esclusivamente nella memoria locale del tuo browser. Nessun dato personale o cronologia di lettura viene trasmesso a server esterni o terze parti.',
      },
      {
        title: 'Accesso a Google Gemini',
        text: 'L’integrazione di Google Gemini si appoggia direttamente all’infrastruttura di Google. Quando utilizzi il tuo account Google all’interno del notebook, l’autenticazione e la gestione delle credenziali avvengono direttamente sui server sicuri di Google nel rispetto delle policy di Google.',
      },
      {
        title: 'Cookie & Analytics',
        text: "Utilizziamo cookie tecnici essenziali per far funzionare l'App e cookie analitici (Google Analytics) previa esplicita scelta dell'utente per comprendere come viene utilizzata l'applicazione al solo scopo di migliorarne le prestazioni. Non utilizziamo cookie di profilazione né pubblicitari. Puoi modificare le tue preferenze in qualsiasi momento.",
      },
      {
        title: 'Notifiche Push',
        text: 'Le notifiche push avvengono mediante le API standard del browser (Web Notifications API) previa esplicita autorizzazione dell’utente, senza richiedere la raccolta di numeri telefonici o indirizzi email.',
      },
    ],
    fullPrivacyUrl: 'https://framework.5lb.eu/it/privacy-policy',
  },
};