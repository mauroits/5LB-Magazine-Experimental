# Piano Architetturale: Ottimizzazione Feed "Accade Oggi" & Notifiche

Questo piano risponde all'analisi dei log di Cloudflare, risolve le inefficienze di rete (chiamate triple e polling frequente), previene il fenomeno del **Thundering Herd** paventato dall'utente e garantisce il corretto funzionamento delle **notifiche push dell'app**.

---

## 1. Analisi del Problema & Considerazioni dell'Utente

### Perché Cloudflare ha registrato 21 chiamate in 40 minuti?
1. **Triple Fetch all'avvio / focus**: all'avvio dell'app venivano invocati contemporaneamente `initAccadeOggiStorage()` e l'evento `window.addEventListener('focus')`. Senza un blocco sulle richieste concorrenti (*in-flight promise deduplication*), il browser inviava fino a 3 richieste GET identiche a distanza di 100 millisecondi l'una dall'altra (come confermato dai timestamp del log: `20:28:43.850`, `20:28:43.996`, `20:28:44.135`).
2. **Bypass forzato della cache (`cache: 'no-cache'`)**: nel file `src/services/accadeOggiFeed.ts`, la chiamata `fetch(feedUrl, { cache: 'no-cache' })` ordinava al browser di ignorare l'intestazione HTTP `Cache-Control: public, max-age=3600` inviata dal Cloudflare Worker, contattando ogni volta i server di Cloudflare.
3. **Polling ogni 60 secondi in primo piano**: in `src/App.tsx` era attivo un `setInterval` a 60 secondi che ricontrollava il feed ad ogni minuto e ad ogni cambio scheda.

### Il rischio "Thundering Herd" (Tempesta di richieste a orari fissi)
L'osservazione dell'utente è **estremamente acuta e corretta**:
> Se si imposta una regola rigida tipo *"scarica esattamente alle 09:05:00"*, quando centinaia o migliaia di utenti hanno l'app aperta o la aprono nello stesso momento, tutti i dispositivi invierebbero una richiesta al server nello stesso identico secondo (*Thundering Herd*).

---

## 2. La Soluzione Ottimale: CDN Edge Cache + Client Jitter + Cooldown

Per garantire le notifiche tempestive senza sovraccaricare il Worker né rischiare il Thundering Herd, si adotta l'architettura standard per feed asincroni:

```
┌────────────────────────────────────────────────────────┐
│                      Client PWA                        │
│                                                        │
│  [Avvio / Focus / Timer 30 min]                        │
│                 │                                      │
│                 ▼                                      │
│  Cooldown check: Sono passati >= 30 min?               │
│  ├── NO  ──► Usa dati locali IndexedDB (0 chiamate)   │
│  └── SÌ  ──► Deduplicazione Promise (max 1 chiamata)   │
│                 │                                      │
│                 ▼ fetch(url, { cache: 'default' })     │
└─────────────────┬──────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────────┐
│                Cloudflare Edge Cache                   │
│                                                        │
│  Il primo utente risveglia la CDN.                     │
│  Cloudflare tiene in memoria edge per 30-60 min.       │
│  Tutti i successivi 999 utenti ricevono la risposta   │
│  istantanea dalla cache edge (0 esecuzioni Worker KV). │
└────────────────────────────────────────────────────────┘
```

### I tre pilastri della soluzione:
1. **Riuso della Cache HTTP del Browser (`cache: 'default'`)**:
   - Rimuovere `cache: 'no-cache'`.
   - Il browser dell'utente rispetta l'header `Cache-Control: public, max-age=1800` (o `3600`), riutilizzando la copia locale senza toccare la rete se la risposta è ancora valida.
2. **Deduplicazione in-flight delle richieste concorrenti**:
   - Se `fetchAccadeOggiPosts()` viene chiamata contemporaneamente (es. all'avvio da `init` e da `focus`), la seconda chiamata riutilizza la stessa Promise già in volo invece di aprire una seconda connessione di rete.
3. **Controllo a intervallo cadenzato (30 minuti) con Jitter**:
   - Sostituire il polling ogni 60 secondi con un controllo ogni **30 minuti** (o al ritorno in primo piano se sono passati almeno 30 minuti).
   - Inserire una variazione casuale (*jitter*) di ±2 minuti per evitare che più client sincronizzati interroghino il server nello stesso istante.
   - Forzare l'aggiornamento immediato di rete solo se l'utente compie un'azione esplicita (click sul pulsante "Riprova" o pull-to-refresh).

---

## 3. Gestione Notifiche dell'App

- **Rilevamento nuovi post (`checkForNewAccadeOggiAndNotify`)**:
  - Quando una fetch (periodica o alla riapertura) rileva un post con data successiva a `ACCADE_OGGI_LAST_SEEN_KEY`, attiva:
    1. Notifica Push nativa di sistema del browser/sistema operativo (Android, Windows, macOS, iOS).
    2. Segnale acustico armonico (*chime* Web Audio API).
    3. Notifica Toast in-app con collegamento diretto per aprire il post.
- **Service Worker & Periodic Background Sync**:
  - Mantenere attivo il listener del Service Worker per la gestione dei click e della sincronizzazione in background su Android.

---

## 4. Modifiche ai File

1. **`src/services/accadeOggiFeed.ts`**:
   - Aggiungere `inFlightFetchPromise: Promise<BloggerPost[]> | null` per deduplicare chiamate parallele.
   - Sostituire `cache: 'no-cache'` con `cache: 'default'`.
   - Riformulare `shouldRefreshTelegramFeed` impostando una finestra minima di rispetto della cache (30 minuti) e jitter per prevenire il Thundering Herd.
2. **`src/config/telegramConfig.ts`**:
   - Definire `MIN_CHECK_INTERVAL_MS = 30 * 60 * 1000` (30 minuti).
   - Configurare il jitter massimo (es. 2-5 minuti).
3. **`src/App.tsx`**:
   - Rimuovere il `setInterval` a 60 secondi in favore di un timer a 30 minuti.
   - Prevenire chiamate ridondanti all'avvio tra `initAccadeOggiStorage` e `handleForeground`.
4. **`worker/index.js`**:
   - Mantenere l'ottima intestazione `Cache-Control: public, max-age=1800` (30 minuti di edge cache su Cloudflare), che azzera il carico verso i bridge RSS e protegge da qualsiasi picco di traffico.

---

## 5. Verifica e Collaudo

- **Verifica TypeScript & Build**: Esecuzione di `compile_applet` per verificare che non vi siano regressioni.
- **Test di deduplicazione**: Verificare che chiamate multiple a `fetchAccadeOggiPosts()` generino una sola richiesta HTTP.
- **Test di ricezione e notifica**: Verificare che l'arrivo di un nuovo post generi la notifica di sistema e il suono.
