# Banner di Comunicazione Remoto con GitHub Gist

Piano di implementazione per sostituire l'attuale banner PWA con un banner di comunicazione gestibile da remoto dal programmatore tramite un file JSON su GitHub Gist, con apertura dei link nel browser interno dell'app, persistenza della chiusura per ID messaggio e styling coerente con l'interfaccia 5LB Magazine.

## User Review & Critical Decisions

> [!IMPORTANT]
> Decisioni confermate nella fase di chiarimento:
> - **Sorgente remota**: GitHub Gist pubblico con URL `raw` per aggiornamenti istantanei senza ridistribuzione del codice.
> - **Comportamento di chiusura**: Quando l'utente preme la "X", il banner viene nascosto in modo permanente per quello specifico messaggio; ricompare solo se viene impostato un nuovo `id` messaggio nel Gist.
> - **Rapporto col banner PWA**: Il nuovo banner sostituisce il banner PWA esistente, adottandone lo stesso ingombro, posizionamento ed estetica, offrendo piena configurabilità remota (incluso un tipo di azione opzionale per l'installazione PWA se desiderato).

- **Gestione Link**: I link impostati nel banner supporteranno sia articoli interni del Magazine (aperti istantaneamente nella modale articolo nativa) sia URL web esterni (aperti nel browser/modalità interna protetta con fallback esterno).
- **Resilienza e Cache**: Interrogazione HTTP non bloccante con timestamp di cache-busting a 2 minuti e fallback in `localStorage` per garantire la lettura anche offline o in assenza di rete.

---

## 1. Overview & Core Concept

Il banner di comunicazione remoto consente al programmatore di comunicare in tempo reale con tutti gli utenti dell'applicazione (notizie, avvisi di manutenzione, eventi, nuovi corsi, aggiornamenti dell'app o suggerimenti di installazione) semplicemente modificando un piccolo file JSON ospitato su un proprio GitHub Gist.

### Funzionalità Chiave:
1. **Attivazione / Disattivazione da remoto**: Un booleano `enabled` nel JSON accende o spegne il banner per tutti i client.
2. **Personalizzazione Completa del Messaggio**:
   - Titolo, testo descrittivo e icona tematica selezionabile (`bell`, `info`, `alert`, `sparkles`, `download`, `book`, `heart`, `compass`, `star`).
   - Tema cromatico discreto (`blue`, `amber`, `emerald`, `purple`, `orange`).
3. **Pulsante di Azione Interattivo**:
   - Etichetta personalizzata (es. *"Scopri di più"*, *"Leggi articolo"*, *"Installa App"*).
   - Destinazione link con apertura nel browser interno / lettore dell'applicazione.
   - Azione speciale `"pwa_install"` nel caso in cui il programmatore desideri usare il banner come invito all'installazione dell'app.
4. **Chiusura Intelligente per ID**:
   - L'utente può chiudere il banner con la "X".
   - La scelta viene memorizzata associata all'ID del messaggio (`id: "avviso-2026-10-27"`). Finché l'ID non cambia, il banner non disturba l'utente. Quando il programmatore pubblica una nuova comunicazione con un nuovo ID, il banner si riattiva automaticamente.

---

## 2. User Experience & Visual Design

Il banner si adatta perfettamente alle linee guida ergonomiche mobile e al design dark navy `#0e1838` dell'app 5LB Magazine:

- **Posizionamento Ergonomico**:
  - Ancorato in basso a destra su desktop (`bottom-4 right-4 max-w-md`), o a tutta larghezza con margini su mobile (`bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-3 right-3`).
  - Rispetta il limite del 15% di occupazione verticale dello schermo per non ostacolare la lettura degli articoli.
- **Micro-interazioni & Animazioni**:
  - Comparsa morbida dal basso (`slide-in-from-bottom-4 fade-in duration-200`).
  - Feedback tattile sui pulsanti (`active:scale-95`).
- **Anatomia del Componente**:
  - **Sinistra**: Icona in contenitore `rounded-2xl` con sfondo semitrasparente e bordo coordinato.
  - **Centro**: Titolo leggibile a singolo rigo (`text-xs sm:text-sm font-bold text-white truncate`) e messaggio sintetico a 1-2 righe (`text-[11px] text-slate-300`).
  - **Destra**: Pulsante CTA con gradiente a contrasto + icona "X" con hitbox accessibile (minimo 44px).

---

## 3. Key Product Decisions & Trade-Offs

- **GitHub Gist vs Cloudflare Worker / Backend**:
  - *Scelta*: GitHub Gist Raw.
  - *Motivazione*: Zero costi, zero server da mantenere, modificabile istantaneamente da qualsiasi dispositivo (anche smartphone) tramite web o app GitHub senza dover configurare token o chiavi di deployment.
- **Gestione Cache del CDN GitHub Raw**:
  - *Scelta*: Chiamata con parametro timestamp calcolato su finestra di 2 minuti (`?t=${Math.floor(Date.now() / 120000)}`) e header `cache: 'no-cache'`.
  - *Motivazione*: I link `gist.githubusercontent.com/.../raw` possono avere una cache CDN di alcuni minuti; il time-rounding assicura aggiornamenti rapidi senza sovraccaricare la rete a ogni ri-render.
- **Apertura Link Interni ed Esterni**:
  - *Scelta*: Riconoscimento intelligente dell'URL:
    1. Se l'URL punta a un articolo del Magazine (`magazine.5lb.eu` o percorso interno), viene aperto direttamente nella vista modale nativa dell'articolo (`ArticleModal`).
    2. Se è un link web generico, viene visualizzato nel visualizzatore in-app dedicato con barra strumenti e opzione di apertura esterna.

---

## 4. Technical Architecture & Data Strategy

### Component & Data Flow Diagram

```
┌────────────────────────────────────────────────────────┐
│                   GitHub Gist                          │
│  (https://gist.githubusercontent.com/.../raw/...)      │
│  { enabled, id, title, message, icon, action, theme }  │
└───────────────────────────┬────────────────────────────┘
                            │ (fetch con polling/swr & cache-busting)
                            ▼
┌────────────────────────────────────────────────────────┐
│             remoteBannerService.ts                     │
│  - fetchRemoteBannerConfig()                           │
│  - getDismissedBannerId() / dismissBanner(id)          │
│  - Fallback a configurazione locale di sicurezza       │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│              <RemoteAnnouncementBanner />              │
│  - Sostituisce <PWAInstallBanner />                    │
│  - Gestisce stato visibilità e chiusura utente         │
│  - Intercetta click su action/link                     │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
        (Link Articolo)             (Link Esterno / Altro)
               ▼                          ▼
    ┌────────────────────┐     ┌──────────────────────┐
    │   <ArticleModal>   │     │  Browser In-App      │
    │   (Viewer nativo)  │     │  o System Browser    │
    └────────────────────┘     └──────────────────────┘
```

### Struttura Schema JSON del Gist (`banner.json`)

```json
{
  "enabled": true,
  "id": "annuncio-2026-v1",
  "title": "Nuovo aggiornamento Magazine",
  "message": "Esplora i nuovi articoli e le funzioni offline aggiornate.",
  "icon": "bell",
  "theme": "blue",
  "action": {
    "label": "Scopri",
    "type": "link",
    "url": "https://magazine.5lb.eu/..."
  },
  "canDismiss": true
}
```

### File e Modifiche Previste:
1. `src/config/remoteBannerConfig.ts`:
   - Definizione dell'URL Gist predefinito (facilmente sostituibile dal programmatore).
   - Configurazione di fallback e opzioni di polling / cache.
2. `src/services/remoteBannerService.ts`:
   - Fetching asincrono con gestione errori, validazione JSON, gestione `localStorage` per l'ID chiuso.
3. `src/components/RemoteAnnouncementBanner.tsx`:
   - Componente UI che sostituisce `PWAInstallBanner`, renderizzando il banner con la medesima accuratezza estetica e supporto per tutte le icone e tipi di azione.
4. `src/components/InAppBrowserModal.tsx` (o integrazione con `browserLauncher`):
   - Visualizzatore sicuro in-app per link esterni con pulsanti di navigazione, chiusura e apertura esterna.
5. `src/App.tsx`:
   - Sostituzione di `PWAInstallBanner` con `RemoteAnnouncementBanner`.
