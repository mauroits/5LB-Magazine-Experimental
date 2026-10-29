# Widget Nativi Android Home Screen (TWA / PWABuilder) per 5LB Magazine

Architettura e piano di implementazione dettagliato per i due widget nativi Android da integrare nel wrapper TWA (Trusted Web Activity) / PWABuilder, con supporto deep-linking nell'app web, endpoint JSON leggeri e simulatore/generatore di codice Kotlin & XML.

---

## Decisioni Confermate e Sintesi Requisiti

> [!IMPORTANT]
> **Scelte definitive concordate con l'utente:**
> 1. **Nessun Marquee instabile**: Il Ticker orizzontale non userà `android:ellipsize="marquee"` (che si blocca nei launcher per mancanza di focus), bensì un **`ViewFlipper`** / `AdapterViewFlipper` nativo con transizione orizzontale/fade ogni 4-5 secondi, affidabile al 100% su tutti i launcher (Pixel, Samsung OneUI, Nova, MIUI).
> 2. **Feed Notizie di Default**: Dati i limiti della sandbox browser (IndexedDB non accessibile al processo nativo del widget), il widget mostrerà di default le **"Ultime notizie"** ordinate per data di pubblicazione, con intervallo di aggiornamento background ogni **2 ore** (120 minuti, coerente con il ritardo di pubblicazione del magazine).
> 3. **Eziologia con BottomSheet Nativo**: Abbandonato lo scorrimento riga per riga sul widget 1x4 (per evitare conflitti con le gesture del launcher di sistema). Il widget 1x4 funge da punto di accesso rapido elegante: al tocco apre un **`BottomSheetDialogFragment` nativo trasparente** con l'elenco verticale a scorrimento delle 14 categorie di Eziologia. Al tocco su una categoria, il BottomSheet si chiude all'istante e avvia la TWA con il deep-link specifico.
> 4. **Piena Integrazione PWA**: Deep-link parser in `src/App.tsx` per gestire atterraggi diretti (`?category=...`, `?filter=...`, `?articleId=...`), endpoint dedicati ultraleggeri sul server, e guida interattiva in-app con generatore del codice sorgente nativo.

---

## 1. Panoramica & Concetto Operativo

### Cosa fa la soluzione
- Fornisce due widget nativi Android pronti per essere inseriti in un progetto **TWA (Trusted Web Activity)** generato con **PWABuilder** o **Bubblewrap**:
  1. **Ticker Notizie 5LB (1x4)**: Mostra le ultime notizie pubblicate sulla rivista con cambio automatico ogni 4-5 secondi tramite `ViewFlipper`. Toccando la notizia si apre l'app direttamente sull'articolo.
  2. **Barra Eziologia 5LB (1x4)**: Barra dal design compatto blu notte con logo ed etichetta *"Eziologia · 14 Apparati biologici"*. Al tocco, fa comparire un foglio inferiore nativo (`BottomSheetDialogFragment`) con le 14 categorie; selezionandone una, la TWA si apre direttamente su quella sezione scaricando gli articoli corrispondenti.

---

## 2. Esperienza Utente & Design

### A. Widget 1: Ticker Ultime Notizie (1x4)
- **Aspetto**: Altezza 1 unità, larghezza adattabile a tutto schermo. Sfondo `#000836` con angoli arrotondati nativi (16dp).
- **Contenuto**: Logo 5LB sulla sinistra, badge testuale pulito *"Novità"* (o nome del feed), titolo dell'articolo in bianco ad alta leggibilità, data/categoria in azzurro chiaro.
- **Transizione**: `ViewFlipper` con `flipInterval="4500"`, `inAnimation="@android:anim/slide_in_left"` e `outAnimation="@android:anim/slide_out_right"`. Funziona autonomamente in background senza richiedere focus.
- **Interazione al Tocco**:
  - Tocco sulla card notizia: Lancia `PendingIntent` con `https://magazine.5lb.eu/?articleId=<id>`. L'app PWA riconosce l'ID e apre immediatamente l'`ArticleModal`.
  - Icona opzioni (ingranaggio): Apre `NewsWidgetConfigureActivity` per scegliere il feed (*Ultime notizie*, *Accade oggi*, *Archivio*) o forzare l'aggiornamento.

### B. Widget 2: Barra di Accesso Rapido Eziologia (1x4) & BottomSheet Nativo
- **Aspetto Widget**: 1 unità di altezza, logo 5LB + icona cartelle biologiche, testo principale *"Eziologia 5LB"*, sottotitolo discreto *"Tocca per esplorare gli apparati"*.
- **Interazione al Tocco**:
  - Il tocco sul widget lancia con `PendingIntent` la `EtiologyBottomSheetActivity` (stile `Theme.MaterialComponents.BottomSheetDialog` o `Theme.Translucent.NoTitleBar`).
  - Viene mostrato dal basso un `BottomSheet` fluido con l'elenco delle 14 categorie biologiche:
    1. Vie respiratorie
    2. Cavità orale
    3. Seno
    4. Apparato gastro-intestinale
    5. Apparato cardio-circolatorio
    6. Apparato urinario
    7. Apparato genitale
    8. Apparato muscolo-scheletrico
    9. La pelle
    10. Sistema nervoso
    11. Vista, udito, olfatto
    12. Intolleranze e allergie
    13. Psicosi
    14. La lateralità
  - Toccando una voce, l'activity invia un Intent esplicito alla `LauncherActivity` della TWA con URL `https://magazine.5lb.eu/?category=ezio-respiratorie` e chiude il BottomSheet con `finish()`.

---

## 3. Decisioni Tecniche e di Prodotto

### 1. ViewFlipper vs Marquee nelle RemoteViews
- **Problema**: `android:ellipsize="marquee"` richiede focus e `setSelected(true)`. Nei launcher moderni Android (Pixel Launcher, Samsung OneUI, Nova), il launcher ruba il focus e il testo rimane statico.
- **Soluzione adottata**: `ViewFlipper` nativo di Android con animazione di scorrimento orizzontale o dissolvenza. È supportato fin dalle prime versioni di Android nelle `RemoteViews`, non richiede focus e ruota gli articoli a intervalli regolari.

### 2. Sandbox di Sicurezza PWA (IndexedDB) e Dati Offline
- **Problema**: I dati "Non letto" e "Salvati" dell'utente risiedono nell'IndexedDB della sandbox del browser (Chrome o Android System WebView), non leggibili dall'esterno dal codice Kotlin/Java nativo del widget.
- **Soluzione adottata**: Il widget visualizza di default le **"Ultime notizie"** ordinate per pubblicazione, aggiornate ogni 2 ore (`updatePeriodMillis = 7200000`) tramite endpoint JSON dedicato. Il feed "Accade oggi" è disponibile come alternativa configurabile.

### 3. BottomSheet Nativo per le Categorie
- **Problema**: Lo scorrimento verticale riga per riga su un widget 1x4 collide inevitabilmente con lo swipe di sistema della home screen (apertura app drawer o scroll tra le pagine della home).
- **Soluzione adottata**: Il widget 1x4 funziona come trigger tattile istantaneo che apre un `BottomSheetDialogFragment` nativo con sfondo oscurato trasparente. L'utente scorre l'elenco completo a tutta altezza senza conflitti gestuali e seleziona l'apparato con precisione.

---

## 4. Architettura Tecnica & Flusso Dati

```
┌────────────────────────────────────────────────────────────────────────┐
│                        HOME SCREEN ANDROID                             │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ WIDGET 1: Ticker Ultime Notizie (1x4)                           │  │
│  │ [5LB] [Ultime] "Recidiva biologica e territorio..."     [⚙]     │  │
│  │          ◄── ViewFlipper automatico (ogni 4.5s) ──►              │  │
│  └─────────────────────────────────┬────────────────────────────────┘  │
│                                    │ Click Notizia                     │
│  ┌─────────────────────────────────┼────────────────────────────────┐  │
│  │ WIDGET 2: Barra Eziologia (1x4) │                                │  │
│  │ [5LB] EZIOLOGIA BIOLOGICA · Tocca per selezionare apparato       │  │
│  └─────────────────────────────────┼────────────────────────────────┘  │
│                                    │ Click Barra                       │
│                                    ▼                                   │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ BOTTOMSHEET NATIVO ANDROID (EtiologyBottomSheetActivity)         │  │
│  │ ┌──────────────────────────────────────────────────────────────┐ │  │
│  │ │ Seleziona Apparato Biologico                             [X] │ │  │
│  │ │ ------------------------------------------------------------ │ │  │
│  │ │ 🫁 Vie respiratorie                                         │ │  │
│  │ │ 👄 Cavità orale                                             │ │  │
│  │ │ 🫀 Apparato cardio-circolatorio                             │ │  │
│  │ │ 🦴 Apparato muscolo-scheletrico                             │ │  │
│  │ │ ... (14 apparati)                                           │ │  │
│  │ └───────────────────────────────┬──────────────────────────────┘ │  │
│  └─────────────────────────────────┼────────────────────────────────┘  │
│                                    │ Selezione Categoria               │
└────────────────────────────────────┼───────────────────────────────────┘
                                     │
                    PendingIntent Deep Link
                    (es. https://magazine.5lb.eu/?category=ezio-respiratorie)
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│             WRAPPER ANDROID TWA (Trusted Web Activity)                 │
│                                                                        │
│  LauncherActivity (Android Browser Helper / PWABuilder)                │
│  └── Riceve l'Intent, apre Chrome Custom Tab / PWA standalone          │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     APPLICAZIONE WEB / PWA 5LB                         │
│                                                                        │
│  App.tsx Router & Deep-Link Handler:                                   │
│  ├── ?category=ezio-... ──► Apre sezione Eziologia & scarica articoli │
│  ├── ?articleId=...     ──► Trova l'articolo e apre ArticleModal      │
│  └── ?filter=today      ──► Apre la sezione Accade Oggi               │
│                                                                        │
│  Backend server.ts (Proxy & Feed Cache):                               │
│  ├── /api/widget/news       ──► JSON sintetico leggero (ultimi 20 art)│
│  └── /api/widget/categories ──► JSON lista delle 14 categorie Eziologia│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Dettaglio Componenti e File da Implementare

### A. Modifiche Web App (`/src/App.tsx` e `/server.ts`)
1. **Supporto Deep-Link in `src/App.tsx`**:
   - Gestione `?category=<id>`: seleziona automaticamente la voce in `NAV_SECTIONS` (sotto `eziologia`), apre la sezione e carica il relativo feed RSS.
   - Gestione `?articleId=<id>`: trova l'articolo nei post scaricati o lo scarica tramite `fetchPostByUrl` / cache e apre il modale dell'articolo.
   - Gestione `?filter=non-letto | accade-oggi | archivio | salvati`.
2. **Endpoint JSON ultraleggeri in `server.ts`**:
   - `GET /api/widget/news?feed=latest|today`: restituisce array compatto `[{ id, title, url, date, category }]` con cache di 2 ore e header CORS abilitati.
   - `GET /api/widget/categories`: restituisce l'elenco statico delle 14 categorie con id, etichetta e icona.

### B. Pacchetto Sorgente Android Completo (per PWABuilder / Android Studio)
Forniremo una guida e un modulo dedicato con tutti i file nativi pronti per il copia-e-incolla:
1. **Manifest (`AndroidManifest.xml`)**:
   - Dichiarazione di `NewsTickerWidgetProvider` (`<receiver>`).
   - Dichiarazione di `EtiologyBarWidgetProvider` (`<receiver>`).
   - Dichiarazione di `EtiologyBottomSheetActivity` (`<activity android:theme="@style/Theme.Design.BottomSheetDialog">`).
   - Dichiarazione di `NewsWidgetConfigureActivity` per le preferenze.
2. **XML Metadata (`res/xml/`)**:
   - `widget_news_ticker_info.xml`: `minWidth="250dp"`, `minHeight="40dp"`, `updatePeriodMillis="7200000"`, `initialLayout="@layout/widget_news_ticker"`.
   - `widget_etiology_bar_info.xml`: `minWidth="250dp"`, `minHeight="40dp"`, `updatePeriodMillis="0"`, `initialLayout="@layout/widget_etiology_bar"`.
3. **XML Layout (`res/layout/`)**:
   - `widget_news_ticker.xml`: layout compatto con `ViewFlipper`, pulsante opzioni, e card notizie.
   - `widget_etiology_bar.xml`: barra 1x4 con logo e CTA a tocco.
   - `activity_etiology_bottom_sheet.xml` & `item_etiology_category.xml`: layout del BottomSheet con RecyclerView per le 14 categorie.
4. **Codice Kotlin (`app/src/main/java/.../widget/`)**:
   - `NewsTickerWidgetProvider.kt`: download asincrono delle notizie, popolamento delle viste del `ViewFlipper`, creazione dei `PendingIntent` per ogni notizia.
   - `EtiologyBarWidgetProvider.kt`: gestore del click sul widget 1x4 che apre `EtiologyBottomSheetActivity`.
   - `EtiologyBottomSheetActivity.kt`: implementa il `BottomSheetDialog`, carica l'elenco dei 14 apparati, e al tocco lancia `Intent(Intent.ACTION_VIEW, Uri.parse("https://magazine.5lb.eu/?category=" + catId))`.
   - `NewsWidgetConfigureActivity.kt`: activity di configurazione delle preferenze del widget.

### C. Modale / Pannello Informativo Interattivo nell'App Web
- Nuovo componente `AndroidWidgetsModal.tsx`:
  - **Simulatore Live interattivo**: anteprima a schermo dei due widget (il ticker con animazione automatica 4.5s e la barra di Eziologia che apre un'anteprima del BottomSheet).
  - **Download / Copia Codice**: schede per copiare i file Kotlin e XML direttamente nel progetto Android PWABuilder.
  - Accesso facile dal menu impostazioni / header dell'app.

---

## 6. Piano di Collaudo e Verifica

1. **Test Deep-Link nella PWA**:
   - Verifica navigazione con query `?category=ezio-respiratorie`: verifica apertura della sezione Eziologia e caricamento articoli.
   - Verifica navigazione con query `?filter=today`: apertura immediata di Accade Oggi.
   - Verifica navigazione con query `?articleId=...`: apertura corretta dell'ArticleModal.
2. **Test Endpoint Server**:
   - Verifica risposte JSON di `/api/widget/news` e `/api/widget/categories`.
3. **Verifica Compilazione**:
   - Esecuzione di `compile_applet` per verificare che non vi siano errori TypeScript o di build.
