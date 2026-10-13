# Rilevamento e Download RSS Articoli da Link magazine.5lb.eu

Aggiunge un sistema intelligente di intercettazione e scaricamento per i link interni a `https://magazine.5lb.eu` aperti dall'utente: un popup di conferma permette di salvare o aggiornare l'articolo direttamente nell'archivio locale senza duplicazioni, conteggiando i download per lo sblocco dei relativi badge.

## User Review & Critical Decisions

> [!IMPORTANT]
> Sulla base delle risposte fornite nella fase di chiarimento, sono state definite le seguenti scelte operative:

- **Intercettazione con Popup Dedicato**: Al clic su qualsiasi link appartenente a `https://magazine.5lb.eu` (nel corpo degli articoli, sidebar o collegamenti), compare un popup modale chiaro e contestuale che chiede conferma prima di procedere, offrendo sia l'azione di salvataggio in archivio che l'apertura nel browser esterno.
- **Deduplicazione e Aggiornamento Intelligente**: Se l'articolo identificato dall'URL è già presente nell'archivio locale, l'applicazione ne aggiorna il contenuto mantenendo intatti lo stato di lettura e i preferiti, notificando all'utente che l'articolo era già salvato ed è stato aggiornato con successo.
- **Nessuna Interruzione della Lettura**: Al completamento del download/aggiornamento, l'app mostra un toast di notifica con stato visivo e fa rimanere l'utente nel contesto di lettura corrente, senza forzare cambi di schermata indesiderati.
- **Avanzamento Badge Automatico**: L'incremento del conteggio degli articoli archiviati attiva la valutazione dei traguardi (`Curioso`, `Esploratore`, `Studioso`, `Esperto`, `Maestro 5LB`) con relativo sblocco ed eventuale animazione celebrativa.

---

## 1. Overview & Core Concept

- **Cosa fa**: Quando un lettore consulta un articolo o esplora l'app e tocca un link che punta a un approfondimento su `magazine.5lb.eu`, l'app riconosce l'URL del magazine. Invece di limitarsi a spedire l'utente a un browser esterno anonimo, presenta un popup elegante ("Salva nell'archivio locale"). Se confermato, recupera i dati completi dell'articolo tramite il feed Blogger/RSS, lo memorizza in locale nella libreria offline e aggiorna la progressione dei badge.
- **Destinatari**: Studiosi e lettori delle 5 Leggi Biologiche che desiderano arricchire sistematicamente il proprio archivio offline mentre approfondiscono collegamenti ipertestuali tra casi studio, sintomi e apparati.
- **Valore chiave**: Elimina la frammentazione tra navigazione web e archivio locale, garantendo che ogni articolo letto rimanga disponibile offline e contribuisca al traguardo dei badge di collezione.

---

## 2. User Experience & Visual Design

### Flussi Utente Principali

1. **Rilevamento Link magazine.5lb.eu**:
   - L'utente tocca un link con prefisso `https://magazine.5lb.eu/...`.
   - Se il link è un articolo o pagina del blog, si apre il popup: **"Aggiungi al tuo archivio locale"**.
   - Il popup visualizza l'anteprima dell'URL (o del titolo se già deducibile), specificando chiaramente se l'articolo è nuovo o già archiviato.
2. **Scelta dell'Azione nel Popup**:
   - **Pulsante Primario ("Scarica e Archivia" / "Aggiorna nell'Archivio")**: avvia il fetch asincrono della voce RSS/Blogger per quell'URL o slug.
   - **Pulsante Secondario ("Apri nel Browser")**: consente all'utente di aprire la pagina web nel browser di sistema come in precedenza.
   - **Pulsante Annulla**: chiude il popup e rimane dove si trova.
3. **Download e Feedback Visivo**:
   - Spinner discreto di recupero nel pulsante con messaggio di stato.
   - A operazione completata: notifica toast in alto a destra ("Articolo salvato nell'archivio!" oppure "Articolo aggiornato nell'archivio!").
   - Il conteggio de "Il mio archivio" si incrementa; se viene raggiunto un traguardo di badge (es. 20, 80, 150, 250, 350 articoli), scatta l'avviso e la celebrazione.

### Direzione Visiva & Componenti

- **Stile Archival & Curatorial**: Il popup adotta lo stile tipografico raffinato dell'app, con sfondi puliti in carta calda / ardesia scura (`bg-white dark:bg-slate-900`), bordi sottili e badge iconografici distintivi per l'archivio.
- **Gerarchia Tipografica**: Titolo netto (`text-lg font-bold`), indicazione dell'URL con troncatura curata e descrizione dell'impatto sul proprio archivio locale.
- **Feedback & Microinterazioni**: Transizioni fluide con `backdrop-blur`, indicatore di caricamento integrato e chiusura rapida al tocco dell'overlay o tasto Esc.

---

## 3. Key Product Decisions & Trade-Offs

- **Riconoscimento URL e Risoluzione Articolo da Feed**:
  - *Scelta*: Interrogare l'endpoint Blogger tramite query specifica per URL / path oppure ricerca mirata dello slug nel feed, estraendo la voce completa (`BloggerPost`) con testo HTML integrale, categorie, data e thumbnail HD.
  - *Motivazione*: Garantisce che l'articolo archiviato abbia la medesima struttura, formattazione e compatibilità di tutti gli altri post salvati nell'app, permettendo la lettura offline e la ricerca testuale interna.
- **Strategia di Deduplicazione**:
  - *Scelta*: Verifica sia per identificatore univoco Blogger che per pathname URL normalizzato (es. `/2023/05/titolo.html`).
  - *Motivazione*: Evita duplicati anche in presenza di variazioni di protocollo (`http` vs `https`) o parametri di query opzionali (`?m=1`).
- **Conservazione dei Metadati Utente**:
  - *Scelta*: Quando un articolo già presente viene aggiornato con la versione più recente dal web, preservare lo stato di lettura (`isRead`) e il contrassegno preferito (`isFavorite`) dell'utente.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                      Interfaccia Utente                      │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │   Lettore Articolo    │       │     Altre Sezioni     │  │
│  │  (Link interni a 5lb) │       │ (Link esterni/menu)   │  │
│  └───────────┬───────────┘       └───────────┬───────────┘  │
│              │                               │              │
│              ▼                               ▼              │
│    ┌──────────────────────────────────────────────────┐     │
│    │  Intercettazione URL: https://magazine.5lb.eu    │     │
│    └────────────────────────┬─────────────────────────┘     │
│                             │                               │
│                             ▼                               │
│    ┌──────────────────────────────────────────────────┐     │
│    │ Modal Popup Conferma: Scarica / Aggiorna / Apri  │     │
│    └────────────────────────┬─────────────────────────┘     │
└─────────────────────────────┼───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Servizio Feed & Archiviazione               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Risoluzione Articolo da URL (Blogger API / JSONP)      │  │
│  └──────────────────────────┬────────────────────────────┘  │
│                             │                               │
│                             ▼                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Deduplicazione e Merge in LocalStorage Cache          │  │
│  │ - Se nuovo: inserimento + conteggio +1               │  │
│  │ - Se esistente: aggiornamento contenuto senza copie   │  │
│  └──────────────────────────┬────────────────────────────┘  │
│                             │                               │
│                             ▼                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Servizio Badge: checkAndUnlockBadges(posts.length)    │  │
│  │ - Trigger notifica badge e celebrazione se traguardo  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Mappatura Componenti e Flussi di Stato

- **Hook / Gestore Intercettazione**:
  Funzione helper che valuta se una URL target appartiene a `magazine.5lb.eu`. Se sì, impedisce l'apertura immediata del browser e apre il dialog di conferma.
- **Componente Dialog `ArchiveArticlePromptModal`**:
  - Mostra il link rilevato e se l'articolo è già presente nell'archivio.
  - Azioni: "Salva/Aggiorna nell'Archivio" (con stato di download in corso) oppure "Apri nel Browser".
- **Funzione di Scaricamento per Singolo Articolo (`fetchPostByUrl`)**:
  - Ricerca per URL o slug nel feed Blogger.
  - Converte la entry Blogger nel formato unificato `BloggerPost`.
  - Aggiorna lo stato globale e la persistenza locale in sicurezza.
- **Notifica Toast e Controllo Badge**:
  - Emissione del toast di conferma.
  - Invio dell'evento per aggiornamento contatori e verifica immediata dello sblocco dei badge di download.
