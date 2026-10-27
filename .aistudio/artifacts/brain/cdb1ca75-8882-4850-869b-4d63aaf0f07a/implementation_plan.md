# Risoluzione Scadenza Immagini Feed Telegram Accade Oggi

Piano architetturale per garantire la persistenza a lungo termine di anteprime e immagini interne agli articoli del canale Telegram (@magazine5LB), risolvendo l'errore di scadenza dei token CDN Telegram (`telesco.pe`) mediante proxying, pre-caching all'Edge di Cloudflare e memorizzazione offline nel Service Worker.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Tutte le decisioni architetturali chiave sono state confermate nella fase di chiarimento:

- **Confirmed Decision 1 (Proxy e Hosting Cache)**: Cloudflare Worker (`worker/index.js`) dedicato con endpoint di serving immagini (`/img/:id` o `/image?url=...`), supportato da Cloudflare Edge Cache con intestazioni immutabili a lungo termine (`max-age=31536000, immutable`).
- **Confirmed Decision 2 (Strategia di Pre-salvataggio)**: Pre-scaricamento automatico delle immagini nel Cloudflare Worker durante il ciclo di aggiornamento del feed (cron scheduled o primo scaricamento). Il Worker salva i binari delle immagini nel KV store prima che i token temporanei di Telegram scadano.
- **Confirmed Decision 3 (Persistenza Client Offline)**: Memorizzazione proattiva delle immagini nella cache del Service Worker (`5lb-article-images` via Workbox e CacheStorage), garantendo che articoli e anteprime restino visibili anche in modalità aereo o senza connessione.

---

### 1. Overview & Core Concept

- **What It Does**: 
  I link alle immagini generati da Telegram (`cdn*.telesco.pe/file/...`) contengono token temporanei che scadono dopo poche ore, causando errori 404/403 e la sparizione di miniature e illustrazioni negli articoli di *Accade Oggi*. Questa soluzione intercetta il feed Atom all'origine nel Cloudflare Worker, pre-scarica i file binari delle immagini nel KV store di Cloudflare, riscrive gli attributi `src` del file `telegram.xml` verso l'endpoint persistente del Worker, ed espone intestazioni HTTP con cache a 1 anno all'Edge di Cloudflare. La PWA inoltre pre-carica tali risorse nel Service Worker locale per la fruizione offline completa.
- **Target Audience / Persona**:
  Lettori di 5LB Magazine e dell'app PWA che consultano quotidianamente gli aggiornamenti di *Accade Oggi*, anche a distanza di giorni o settimane dalla pubblicazione, online o offline.
- **Key Value**:
  Zero immagini rotte nel feed *Accade Oggi*, caricamenti istantanei dall'Edge globale di Cloudflare senza dipendenza dalla disponibilità dei bridge Telegram, e piena leggibilità multimediale offline.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. *Apertura del Feed Accade Oggi*: L'utente accede alla sezione "Accade Oggi". Le schede mostrano le anteprime istantaneamente (dalla cache del Service Worker o dall'Edge Cloudflare più vicino).
  2. *Lettura Articolo Completo*: Cliccando su una notizia, il modale apre l'articolo con testo formattato e l'immagine principale ad alta risoluzione sempre visibile, priva di icone di errore o blocchi vuoti.
  3. *Consultazione Post Vecchi / Archivio Locale*: I post salvati in IndexedDB settimane fa continuano a mostrare le loro immagini perché gli URL puntano all'Edge CDN e non al link effimero di Telegram.
  4. *Modalità Offline*: Se il dispositivo si disconnette, tutte le immagini dei post già sincronizzati vengono servite dal CacheStorage locale della PWA.
- **Visual Identity & Theme**:
  - Mantenimento integrale dei token di design esistenti: tonalità deep blue (`#000836`), accenti arancio (`orange-500` / `orange-600`), supporto completo alla Dark Mode.
  - Immagini con transizione fluida (`transition-transform duration-300`, `object-cover`, angoli arrotondati `rounded-2xl`).
  - Skeleton loading ed elegante placeholder nel caso in cui un'immagine sia in caricamento su reti lente.
- **Interactive Feedback & Motion**:
  - Nessun effetto layout-shift (CLS): i contenitori mantengono il rapporto `aspect-video` con sfondo neutro (`bg-slate-100 dark:bg-slate-800`) durante il caricamento dell'immagine.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Riscrittura degli URL a Monte nel Cloudflare Worker**
  - *Chosen Approach*: Quando il Worker elabora il feed Atom dai bridge RSS, sostituisce gli URL `https://cdn*.telesco.pe/file/<id>.jpg` con `https://telegram-feed.5lb-framework.workers.dev/img/<id>`.
  - *Why*: In questo modo l'XML distribuito ai client è già "pulito" e contiene solo URL permanenti. Né il client né IndexedDB salvano mai URL effimeri che scadrebbero.
  - *Alternatives Considered*: Riscrivere gli URL solo a livello client (runtime). Scartato perché avrebbe richiesto parsing continuo nel browser e non avrebbe garantito il pre-salvataggio all'Edge prima della scadenza.
- **Decision 2: Archiviazione Binaria in Cloudflare KV con TTL Esteso**
  - *Chosen Approach*: Il Worker memorizza ogni immagine pre-scaricata nel KV binding (`TELEGRAM_KV`) con prefisso `img_<id>` e Content-Type corretto, rispondendo alle richieste con `Cache-Control: public, max-age=31536000, immutable`.
  - *Why*: Cloudflare Edge Cache assorbe oltre il 99% delle richieste successive. Nel caso in cui una edge cache sia svuotata o cold, il Worker recupera immediatamente i byte da KV senza dover mai più contattare Telegram.
  - *Alternatives Considered*: Fare affidamento esclusivamente sulla cache HTTP del Worker senza KV. Scartato perché la cache HTTP edge di Cloudflare può essere invalidata o riavviata nei diversi datacenter geografici; KV garantisce persistenza globale a tempo indeterminato.
- **Decision 3: Sostituzione Trasparente e Retrocompatibilità Client**
  - *Chosen Approach*: Nel frontend (`src/services/accadeOggiFeed.ts`), se dovessero comparire URL storici `telesco.pe` ancora presenti in vecchi record IndexedDB o file statici, una funzione di normalizzazione li indirizza automaticamente al proxy Cloudflare Worker.
  - *Why*: I dispositivi degli utenti che hanno già salvato post nel loro IndexedDB locale vedranno le loro immagini ripristinate senza dover cancellare i dati dell'app.

---

### 4. Technical Architecture & Data Strategy (Technical Reference)

- **Architecture & Component Diagram**:

```
 ┌───────────────────────────────────────────────────────────────┐
 │               RSS Bridges (@magazine5LB Atom)                 │
 └──────────────────────────────┬────────────────────────────────┘
                                │ (1) Cron/Trigger ogni ~3 ore
                                ▼
 ┌───────────────────────────────────────────────────────────────┐
 │             Cloudflare Worker (worker/index.js)               │
 │                                                               │
 │  ┌─────────────────────────────────────────────────────────┐  │
 │  │ 1. Download Atom XML con link freschi telesco.pe        │  │
 │  │ 2. Estrazione ID e pre-fetch delle immagini fresche     │  │
 │  │ 3. Salvataggio binari in TELEGRAM_KV (chiave img_<id>)   │  │
 │  │ 4. Riscrittura XML: telesco.pe -> worker /img/<id>      │  │
 │  │ 5. Salvataggio XML pulito in TELEGRAM_KV                │  │
 │  └─────────────────────────────────────────────────────────┘  │
 │                                                               │
 │  Endpoints HTTP:                                              │
 │  • GET /telegram.xml    -> XML con link permanenti            │
 │  • GET /img/:id         -> Immagine con Cache-Control a 1 anno│
 └──────────────────────────────┬────────────────────────────────┘
                                │ (2) Risposta HTTP + Edge Cache
                                ▼
 ┌───────────────────────────────────────────────────────────────┐
 │               Cloudflare Global Edge Cache                    │
 │               (Cashing permanente delle immagini)             │
 └──────────────────────────────┬────────────────────────────────┘
                                │ (3) Download feed & asset
                                ▼
 ┌───────────────────────────────────────────────────────────────┐
 │                     PWA Client (Browser)                      │
 │                                                               │
 │  ┌─────────────────────────┐   ┌───────────────────────────┐  │
 │  │      sw-sync.js         │   │   Workbox RuntimeCache    │  │
 │  │ (Precache in background)│   │  (CacheFirst / 30 giorni) │  │
 │  └────────────┬────────────┘   └─────────────┬─────────────┘  │
 │               │                              │                │
 │               ▼                              ▼                │
 │  ┌─────────────────────────────────────────────────────────┐  │
 │  │          CacheStorage ('5lb-article-images')            │  │
 │  └─────────────────────────────────────────────────────────┘  │
 │                                │                              │
 │                                ▼                              │
 │  ┌─────────────────────────────────────────────────────────┐  │
 │  │   ArticleList.tsx & ArticleModal.tsx (Rendering sicuro) │  │
 │  └─────────────────────────────────────────────────────────┘  │
 └───────────────────────────────────────────────────────────────┘
```

- **Data Model & File Changes**:
  1. `worker/index.js`:
     - Implementazione logica di estrazione URL immagini da `<entry>` e pre-fetch asincrono con `Promise.allSettled`.
     - Memorizzazione binaria in `env.TELEGRAM_KV.put(imgKey, arrayBuffer, { metadata: { contentType } })`.
     - Riscrittura regex degli URL `telesco.pe` nel corpo XML verso `/img/<id>`.
     - Aggiunta routing GET `/img/:id` con supporto CORS, lettura da KV e header `Cache-Control: public, max-age=31536000, immutable`.
  2. `server.ts` (Sviluppo Locale & Proxy di Emergenza):
     - Aggiunta endpoint `/api/telegram-image/:id` che fa da proxy verso il Worker o Telegram per test in ambiente di sviluppo locale.
  3. `src/services/accadeOggiFeed.ts`:
     - Helper di normalizzazione URL per convertire al volo eventuali link `telesco.pe` ereditati in URL del worker persistente.
  4. `vite.config.ts`:
     - Aggiornamento della configurazione Workbox per intercettare sia i domini Telegram sia il percorso `/img/` del Worker con pattern `CacheFirst` per massima velocità e supporto offline.
  5. `public/sw-sync.js`:
     - Durante la routine di background sync, pre-scarica e memorizza le anteprime del feed in `CacheStorage`.

---

### Step-by-Step Implementation Sequence

1. **Step 1: Aggiornamento Cloudflare Worker (`worker/index.js`)**
   - Implementare `preFetchAndStoreImages(env, xmlText)`: rileva le immagini, scarica i blob binari dai bridge prima che scadano e li archivia in KV.
   - Implementare `rewriteTelegramImageUrls(xmlText, workerBaseUrl)`: sostituisce i link effimeri con link permanenti del worker.
   - Aggiungere il route handler `/img/:id` per servire le immagini da KV con header di caching immutabile a 1 anno e CORS completo.
2. **Step 2: Estensione Proxy Locale (`server.ts`)**
   - Implementare il mirror `/api/telegram-image` per consentire lo sviluppo locale e la riproduzione esatta senza dipendere dall'accesso diretto a Cloudflare.
3. **Step 3: Normalizzazione Client (`src/services/accadeOggiFeed.ts`)**
   - Inserire `ensurePersistentTelegramImageUrl(url)` che sanifica e trasforma retroattivamente ogni URL di anteprima o contenuto.
4. **Step 4: Configurazione Caching PWA e Service Worker (`vite.config.ts` & `public/sw-sync.js`)**
   - Estendere le regole di runtimeCaching di Workbox in `vite.config.ts` per includere `/img/` e le origini del worker con policy `CacheFirst`.
   - Aggiungere il caching proattivo delle miniature in `sw-sync.js`.
5. **Step 5: Verifica e Collaudo**
   - Verificare la corretta compilazione TypeScript (`compile_applet`).
   - Simulare richieste a `/img/:id` e il parsing di `telegram.xml` con immagini riscritte.
