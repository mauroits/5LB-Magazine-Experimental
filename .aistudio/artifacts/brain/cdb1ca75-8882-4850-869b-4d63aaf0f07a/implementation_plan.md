# Rimozione Controllo Manuale Versioni & Aggiornamento PWA Silenzioso in Background

Eliminazione completa del banner e del tasto manuale "Nuova versione disponibile" / "Aggiorna", riconfigurando il ciclo di vita del Service Worker per aggiornamenti automatici e trasparenti in background applicati alla successiva riapertura naturale dell'app, eliminando salti di schermata e crash a schermo bianco.

## User Review & Critical Decisions

> [!IMPORTANT]
> In base alle preferenze confermate:
> 1. **Nessun avviso o banner manuale a video**: Il popup "Nuova versione disponibile" e il relativo pulsante "Aggiorna" vengono eliminati dall'interfaccia utente.
> 2. **Attivazione alla successiva riapertura**: Il browser e il Service Worker scaricano gli aggiornamenti del codice in background e subentrano in modo pulito alla riapertura naturale della pagina o della PWA, senza reload forzati simultanei.
> 3. **Distinzione chiara**: Il tasto "Aggiorna contenuti" (icona a forma di freccia circolare presente nell'Header e nella pagina Info) rimane regolarmente attivo, poiché serve a scaricare gli ultimi articoli da Blogger e dal feed Telegram di *Accade Oggi*, non a reinstallare il codice dell'app.

- **Decisione Confermata 1**: Rimozione totale del banner UI per l'aggiornamento software dell'app in `App.tsx`.
- **Decisione Confermata 2**: Aggiornamento automatico e trasparente gestito dal Service Worker in background senza richiedere azioni manuali dell'utente.

---

## 1. Overview & Core Concept

- **Cosa fa**: Riconfigura la gestione delle versioni dell'applicazione PWA. Quando viene rilasciata una nuova release del codice sul server o su GitHub Pages, il Service Worker la scarica silenziosamente in background. La nuova versione diventa attiva alla successiva apertura o riavvio dell'applicazione.
- **Benefici per l'utente**:
  - Nessun popup invadente che compare durante la lettura o la navigazione.
  - Risoluzione definitiva del loop con "salto" grafico causato dai reload multipli.
  - Eliminazione totale della schermata bianca provocata dalla race condition tra `updateSWFunction` e `window.location.reload()`.

---

## 2. User Experience & Visual Design

- **Esperienza Utente Semplificata**: L'utente naviga e consulta gli articoli del Magazine e la rubrica *Accade Oggi* senza alcuna interruzione.
- **Risoluzione Anomalie Grafiche**:
  - Eliminato il banner scuro in basso con pulsante arancione "Aggiorna".
  - Nessun refresh improvviso né perdita di contesto durante la sessione di lettura.
- **Stato Offline & Installazione PWA Preservati**: L'indicatore "OFFLINE" e il pulsante per installare l'app su Android, iOS e Desktop continuano a funzionare regolarmente con tutte le garanzie di conformità PWA.

---

## 3. Key Product Decisions & Trade-Offs

- **Approccio Scelto (Auto-Update Silenzioso)**:
  - In `vite.config.ts`, configurazione di `registerType: 'autoUpdate'`.
  - In `src/services/pwaUpdateService.ts`, rimozione dei trigger manuali `SKIP_WAITING` multipli e del `window.location.reload()` aggressivo in `finally`.
  - In `src/App.tsx`, rimozione dello stato `isPwaUpdateAvailable`, del banner JSX in basso e del relativo listener manuale.
- **Perché**: Elimina alla radice la causa della schermata bianca (interruzione simultanea del ciclo di vita dei worker e crash della cache dei bundle) e rispetta fedelmente la scelta dell'utente di non dover gestire manualmente versioni e aggiornamenti.
- **Alternative Scartate**:
  - *Mantenere il banner con prompt manuale*: Scartata perché l'utente ha confermato esplicitamente di voler rimuovere del tutto il controllo manuale delle versioni.
  - *Ricaricamento automatico forzato della pagina a caldo*: Scartata per evitare che la pagina si ricarichi all'improvviso mentre l'utente sta leggendo un articolo o consultando il taccuino.

---

## 4. Technical Architecture & Data Strategy

### Schema Ciclo di Vita Aggiornamenti

```
┌─────────────────────────────────────────────────────────────┐
│                    Navigazione Utente                       │
│    (Lettura articoli, consultazione feed, taccuino 5LB)     │
└──────────────────────────────┬──────────────────────────────┘
                               │
            Verifica periodica in background (SW)
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               Download Silenzioso Nuovi File                │
│    Il Service Worker memorizza i nuovi bundle nella cache   │
│             SENZA interrompere la sessione attiva           │
└──────────────────────────────┬──────────────────────────────┘
                               │
          Chiusura/Nuova apertura naturale della scheda/app
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Attivazione Nuova Versione a Freddo             │
│        Avvio istantaneo con il nuovo codice aggiornato       │
│           Nessun salto grafico, nessuna schermata bianca    │
└─────────────────────────────────────────────────────────────┘
```

### Componenti Interessati

1. **`vite.config.ts`**:
   - Impostazione di `registerType: 'autoUpdate'` nel plugin `VitePWA`.
   - Pulizia delle opzioni del Service Worker per consentire la transizione trasparente tra versioni.

2. **`src/services/pwaUpdateService.ts`**:
   - Eliminazione del doppio reload concorrente e della gestione manuale dei bottoni.
   - Semplificazione della registrazione PWA affinché registri il Service Worker in modalità sicura e senza avvisi bloccanti.

3. **`src/App.tsx`**:
   - Rimozione dello state `isPwaUpdateAvailable`.
   - Rimozione del componente banner galleggiante JSX in fondo al render.
   - Mantenimento inalterato del pulsante per la sincronizzazione dei contenuti RSS/Atom nell'Header.

---

## Verification Plan

### Test Automatici & Compilazione
- Esecuzione di `npm run build` / `compile_applet` per verificare che non vi siano errori di tipo TypeScript o dipendenze orfane.

### Test Manuali
- Verifica dell'interfaccia: il banner "Nuova versione disponibile" e il tasto "Aggiorna" non compaiono più a video.
- Verifica del tasto "Aggiorna contenuti" nell'Header (icona `RotateCw`): continua a riscaricare i post da Blogger e dal feed Telegram di *Accade Oggi* senza interferire con il software.
- Verifica offline: l'applicazione continua a memorizzare gli articoli in IndexedDB e ad avviarsi istantaneamente anche senza connessione internet.
