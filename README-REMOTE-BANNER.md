# Guida alla Gestione del Banner Remoto (GitHub Gist)

Questa funzionalità ti consente di comunicare con gli utenti del **Magazine 5LB** in tempo reale, modificando semplicemente un file JSON su un tuo **GitHub Gist pubblico** senza dover toccare il codice né ridistribuire l'applicazione.

---

## 1. Come creare e configurare il tuo Gist

1. Accedi al tuo account GitHub e vai su: **[https://gist.github.com](https://gist.github.com)**
2. Inserisci una breve descrizione (es. `5LB Magazine Banner Config`).
3. Nel campo **Filename including extension**, scrivi: `banner.json`
4. Incolla il contenuto JSON (vedi esempi sotto).
5. In basso a destra seleziona **"Create public gist"** (oppure salva modifiche se già esistente).
6. Nella pagina del tuo Gist, clicca sul pulsante **"Raw"** in alto a destra del riquadro del file.
7. Copia l'URL dalla barra degli indirizzi del browser. L'URL avrà una struttura di questo tipo:
   ```
   https://gist.githubusercontent.com/<tuo-utente>/<id-del-gist>/raw/banner.json
   ```
8. Inserisci questo URL nel file `src/config/remoteBannerConfig.ts` alla costante `REMOTE_BANNER_GIST_URL`, oppure nella variabile d'ambiente `VITE_REMOTE_BANNER_GIST_URL` nel file `.env`!

---

## 2. Struttura del file `banner.json`

Ecco un esempio completo con tutti i campi disponibili:

```json
{
  "enabled": true,
  "id": "annuncio-2026-10-27-01",
  "title": "Corso di Formazione 5LB",
  "message": "Aperte le iscrizioni al nuovo corso introduttivo. Posti limitati!",
  "icon": "bell",
  "theme": "blue",
  "action": {
    "label": "Scopri il corso",
    "type": "link",
    "url": "https://www.5lb.eu/formazione",
    "openIn": "internal"
  },
  "canDismiss": true
}
```

---

## 3. Spiegazione dei Parametri

| Campo | Tipo | Descrizione |
|---|---|---|
| `enabled` | `boolean` | `true` per mostrare il banner, `false` per spegnerlo per tutti gli utenti. |
| `id` | `string` | **Identificativo unico del messaggio**. Quando l'utente preme la "X", l'app memorizza che questo `id` è stato chiuso. **Se vuoi che il banner ricompaia a tutti gli utenti, basta cambiare l'id** (es. da `v1` a `v2`). |
| `title` | `string` | Titolo in grassetto (es. *"Novità"*, *"Manutenzione"*, *"Nuovo Articolo"*). |
| `message` | `string` | Testo del messaggio. Supporta sia testo semplice che link Markdown `[testo](https://...)` o link diretti `https://...` cliccabili inline. |
| `icon` | `string` | Icona mostrata a sinistra. Valori possibili: `bell`, `info`, `alert`, `sparkles`, `download`, `book`, `heart`, `compass`, `star`, `smartphone`, `newspaper`. |
| `theme` | `string` | Stile del colore. Valori: `blue` (predefinito), `amber` (avviso arancio), `emerald` (verde successo), `purple` (viola evento), `orange` (arancio vivace). |
| `action` | `object` | *(Opzionale)* Configurazione del pulsante d'azione a destra. |
| `action.label` | `string` | Testo del pulsante (es. *"Leggi subito"*, *"Installa App"*). |
| `action.type` | `string` | `"link"` (apre URL web), `"article"` (apre articolo nel visualizzatore nativo del Magazine), `"pwa_install"` (avvia l'installazione PWA). |
| `action.url` | `string` | Indirizzo web o URL dell'articolo. |
| `action.openIn`| `string` | `"internal"` (apre nel browser interno protetto dell'app) oppure `"external"` (apre in Chrome/Safari esterno). |
| `canDismiss` | `boolean` | `true` (predefinito) mostra la "X" per consentire all'utente di chiudere l'avviso. |

---

## 4. Esempi d'Uso Pratici

### Esempio A: Invito a Installare l'App (Sostituto del banner PWA originale)
```json
{
  "enabled": true,
  "id": "pwa-prompt-v1",
  "title": "Usa il Magazine a schermo intero",
  "message": "Installa l'App per accedere agli articoli anche offline e ricevere notifiche.",
  "icon": "smartphone",
  "theme": "blue",
  "action": {
    "label": "Installa App",
    "type": "pwa_install"
  },
  "canDismiss": true
}
```

### Esempio B: Segnalazione Nuovo Articolo o Approfondimento
```json
{
  "enabled": true,
  "id": "nuovo-articolo-relè-laringe",
  "title": "Nuovo Articolo Pubblicato",
  "message": "Leggi il nuovo approfondimento sul senso biologico delle 5 Leggi Biologiche.",
  "icon": "newspaper",
  "theme": "emerald",
  "action": {
    "label": "Leggi Articolo",
    "type": "link",
    "url": "https://magazine.5lb.eu/...",
    "openIn": "internal"
  },
  "canDismiss": true
}
```

### Esempio C: Avviso importante / Manutenzione
```json
{
  "enabled": true,
  "id": "avviso-server-2026",
  "title": "Aggiornamento in corso",
  "message": "Stiamo sincronizzando l'archivio storico, alcuni contenuti potrebbero richiedere qualche istante.",
  "icon": "alert",
  "theme": "amber",
  "canDismiss": true
}
```

### Esempio D: Disattivare completamente il banner
```json
{
  "enabled": false,
  "id": "nessun-annuncio",
  "title": "",
  "message": ""
}
```

---

## 5. Aggiornamento in Tempo Reale
L'applicazione verifica automaticamente la configurazione all'apertura e ogni volta che l'utente torna sull'applicazione (cambio scheda o risveglio dello schermo), applicando una finestra di cache-busting di 2 minuti. Le tue modifiche sul Gist saranno visibili agli utenti quasi istantaneamente.
