# Gestione Sblocco Notifiche su Android PWA

Questo piano definisce l'architettura e l'esperienza utente per gestire lo sblocco delle notifiche su Android quando l'app è installata sulla schermata Home (PWA), garantendo l'invio della chiamata diretta al sistema operativo e la corretta gestione del blocco imposto dai browser Chromium.

## Decisioni Utente & Vincoli di Sistema

> [!IMPORTANT]
> **Vincolo tecnico del sistema operativo Android e dei browser Chromium**:
> Nelle specifiche W3C Push API e in Android/Chrome, una volta che l'utente revoca o disattiva le notifiche per un'origine o un'app installata, il browser imposta permanentemente `Notification.permission = 'denied'`. Da quel momento in poi, qualsiasi chiamata a `Notification.requestPermission()` viene **automaticamente rifiutata dal motore Chromium in pochi millisecondi senza mostrare la finestra di dialogo nativa**.

- **Chiamata diretta al sistema**: Al click sul pulsante "Sblocca", l'app esegue sempre e comunque la chiamata diretta al sistema (`Notification.requestPermission()` e tentativo di riallineamento push manager).
- **Riconoscimento immediato del blocco Chromium**: Se la chiamata al sistema viene silenziata automaticamente dal sistema Android (risoluzione immediata a `'denied'`), l'app spiega con trasparenza che Android richiede un singolo tocco nelle impostazioni dell'app.
- **Rilevamento automatico al rientro in app (`visibilitychange` / `window.focus`)**: Appena l'utente riattiva le notifiche nelle impostazioni di Android e torna all'app, la PWA rileva automaticamente il cambiamento senza bisogno di riavviare l'app, aggiorna lo stato su "Attive" e mostra la notifica di conferma.

---

### 1. Panoramica & Funzionamento

1. **Tentativo di chiamata al sistema**:
   - L'utente tocca "Sblocca".
   - L'app invoca la chiamata nativa al sistema operativo.
   - Se il sistema apre la finestra di autorizzazione e l'utente conferma, lo stato diventa istantaneamente **"Attive"** (verde).
2. **Gestione del rifiuto automatico di Android**:
   - Se il sistema Android non mostra la finestra (perché Chrome/Android vieta alle web app di richiedere permessi già revocati), l'interfaccia evidenzia chiaramente:
     *"Il sistema operativo Android impedisce alle app web di mostrare nuovamente il popup dopo una revoca. Per ripristinare le notifiche, tieni premuta l'icona dell'app sulla Home > Info app (ℹ️) > Notifiche > Consenti."*
3. **Ascolto dinamico in tempo reale**:
   - Aggiunta di listener per `visibilitychange` e `window.addEventListener('focus')`.
   - Non appena l'utente torna nell'app dopo aver attivato la spunta in Android, la PWA si aggiorna all'istante senza ricaricare la pagina.

---

### 2. Esperienza Utente & Design

- **Pulsante "Sblocca"**:
  - Mostra uno stato visivo di caricamento/attesa durante la chiamata al sistema (`Richiesta al sistema in corso...`).
  - Esegue la chiamata nativa.
- **Pannello di supporto specifico per Android PWA**:
  - Compare solo se la chiamata al sistema viene soppressa da Android.
  - Presenta i passaggi dedicati per app installata su Android (icona Home > Info app > Notifiche).
  - Include un pulsante rapido per riprovare la chiamata al sistema.
- **Transizione automatica di successo**:
  - Appena la permission passa a `granted` (anche in background mentre l'utente era nelle impostazioni del telefono), il badge passa automaticamente a verde "Attive" con animazione a impulsi e invia una notifica di conferma.

---

### 3. Architettura Tecnica

```
┌─────────────────────────────────────────────────────────┐
│               NotificationCenterModal                   │
│                                                         │
│  [Pulsante "Sblocca"] ───► requestPushPermission()       │
│                                     │                   │
│                                     ▼                   │
│                           Notification.requestPermission│
│                                     │                   │
│                  ┌──────────────────┴─────────────────┐ │
│                  ▼                                    ▼ │
│              granted                               denied
│         (Mostra "Attive")             (Rileva soppressione)
│                                               │         │
│                                               ▼         │
│                                       Pannello Android  │
│                                       Schermata Home    │
│                                                         │
│  [window.focus / visibilitychange] ──► refreshList()    │
│                                               │         │
│                                               ▼         │
│                                     Aggiornamento auto  │
└─────────────────────────────────────────────────────────┘
```

1. **`src/services/notificationService.ts`**:
   - Rafforzare `requestPushPermission()` per gestire sia `Notification.requestPermission()` promise-based che callback-based per compatibilità massima Android.
   - Esportare una funzione per controllare il supporto nativo e l'ambiente standalone/PWA.

2. **`src/components/NotificationCenterModal.tsx`**:
   - Integrare listener `visibilitychange` e `focus` per sincronizzazione immediata non appena l'utente torna all'app.
   - Visualizzare l'indicatore di chiamata al sistema in corso.
   - Fornire la spiegazione precisa del vincolo Android per app installata su Home screen.
