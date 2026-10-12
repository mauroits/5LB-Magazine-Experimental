# 5LB Magazine — Progressive Web App (PWA)

Aggregatore di feed RSS ufficiale per [magazine.5lb.eu](https://magazine.5lb.eu), con integrazione delle risorse formative sulle 5 Leggi Biologiche, assistente IA con Gemini e notifiche push in tempo reale.

---

## 🌟 Caratteristiche Principali

- 📱 **Progressive Web App (PWA) completa**:
  - Installabile su qualsiasi smartphone (Android, iOS con guida guidata) e tablet/desktop.
  - Funzionamento offline con cache automatica dei post consultati.
  - Conforme agli standard PWA (Service Worker, Web App Manifest, icone ad alta risoluzione).
- 📰 **Aggregatore Feed RSS da Blogger**:
  - Collegato in tempo reale ai feed pubblici di `https://magazine.5lb.eu/feeds/posts/default?alt=json`.
  - Conteggio articoli automatico e aggiornamento live dei badge di categoria.
  - Visualizzazione a schede o elenco compatto.
  - **Modalità Lettore (Clean Reader)**: lettura immersiva degli articoli, formattazione fluida, regolazione della dimensione dei caratteri (A- / A+) e **lettura vocale con sintesi vocale (TTS)** in lingua italiana.
- 📂 **Menu Laterale a Fisarmonica (Accordion Drawer)**:
  - Header in stile nativo 5LB Magazine (blu scuro `#0b1226`, logo 5LB arancione).
  - Filtri rapidi: *Ultime*, *Non letto*, *Ti piace (Preferiti)*, *Accade oggi (Canale Telegram @magazine5LB aperto direttamente in-app)*.
  - Macro-sezioni comprimibili e compatte:
    - **INFORMAZIONE** *(Feed RSS)*: Premessa, Notizie revisionate, Sovradiagnosi, Sintomi cronici, Esperienza con le 5LB, Fa bene o fa male?, Terapia?, COVID19, Libri e monografie.
    - **FORMAZIONE** *(Link Diretti)*: Il percorso 5LB DEX, Conferenze introduttive, Corsi Base, Lezioni applicative avanzate, Scuole per professionisti.
    - **LABORATORIO DI PRESENZA** *(Link Diretti)*: Laboratorio, Crea un HUB.
    - **CONSULENZA INDIVIDUALE** *(Link Diretti)*: Consulenza - per chi?, Chiedi una consulenza.
    - **5LB FRAMEWORK** *(Link Diretti)*: 7 passi per cominciare, Eco-sistema 5LB, Una vita da Hameriano, AndroGyne.
    - **EZIOLOGIA** *(Feed RSS)*: Vie respiratorie, Cavità orale, Seno, App. gastro-intestinale, App. cardio-circolatorio, Apparato urinario, Apparato genitale, App. muscolo-scheletrico, La pelle.
  - Icone vettoriali ad alta fedeltà che riproducono fedelmente le icone originali (DEX, 5LB Neofiti, Cognitivo, Applicativo, Operatori, PresenzaLab, PresencingCircle, LogoConsulenza, Framework, Hameriano M, AndroGyne, Covid19).
- ℹ️ **Pagina Informazioni, Changelog, Contatti & Privacy**:
  - Accessibile tramite l'icona Informazioni (ℹ️) in testata e nel menu laterale.
  - Documentazione delle funzioni dell'app, storico degli aggiornamenti, riferimenti editoriali e informativa privacy (con link a `https://5lb.eu/privacy`).
- 🤖 **Assistente IA — Google NotebookLM Integrato**:
  - Pulsante dedicato in testata e nel drawer per aprire il notebook pubblico delle 5LB (`https://notebook.google.com/notebook/47913756-695d-4076-b64a-be74986cfdf8`).
  - Accesso consentito direttamente con il proprio account Google per porre domande, cercare correlazioni biologiche ed esplorare le fonti.
- 🔔 **Notifiche Push in Tempo Reale**:
  - Monitoraggio in background dei nuovi post pubblicati su Blogger.
  - Avviso con Web Notifications API (suoni sintetizzati tramite Web Audio API, badge e toast interattivo).
  - Centro notifiche con cronologia, badge non letti e pulsante *"Invia notifica di prova"*.

---

## 🛠️ Come Modificare Link e Ordine del Menu nel Backend/File

Tutti i collegamenti web, i filtri RSS e l'ordine delle voci sono centralizzati nel file sorgente:
👉 **`src/config/navigation.ts`**

### 1. Per cambiare un link o un URL:
Basta modificare la proprietà `targetUrl`:
```typescript
{
  id: 'form-dex',
  label: 'Il percorso 5LB DEX',
  type: 'link',
  iconName: 'custom-dex',
  targetUrl: 'https://5lb.eu/dex', // <-- Modifica l'indirizzo qui
  description: 'Il percorso completo di apprendimento esperienziale',
}
```

### 2. Per riordinare le voci o le sezioni:
Basta spostare su o giù i blocchi all'interno dell'array `items` (o dell'array `NAV_SECTIONS`). L'interfaccia rifletterà immediatamente l'ordine esatto specificato nel file.

### 3. Per i feed RSS (INFORMAZIONE ed EZIOLOGIA):
Il campo `rssCategory` corrisponde all'etichetta di Blogger:
```typescript
{
  id: 'ezio-respiratorie',
  label: 'Vie respiratorie',
  type: 'rss',
  iconName: 'bookmark',
  rssCategory: 'C: vie respiratorie', // <-- Etichetta presente su Blogger
}
```

### 4. Per cambiare il Google NotebookLM:
La costante si trova in cima a `src/config/navigation.ts`:
```typescript
export const GOOGLE_NOTEBOOK_URL =
  'https://notebook.google.com/notebook/47913756-695d-4076-b64a-be74986cfdf8';
```

---

## 🚀 Installazione ed Esecuzione Locale

1. **Clona il repository**:
   ```bash
   git clone https://github.com/tuo-username/5lb-magazine-pwa.git
   cd 5lb-magazine-pwa
   ```

2. **Installa le dipendenze**:
   ```bash
   npm install
   ```

3. **Avvia il server di sviluppo**:
   ```bash
   npm run dev
   ```
   L'app sarà disponibile all'indirizzo `http://localhost:3000`.

4. **Compilazione per la produzione**:
   ```bash
   npm run build
   ```

---

## 📦 Distribuzione (Deployment) su GitHub Pages o Server

### Opzione 1: GitHub Pages (Deploy Statico)
L'applicazione è progettata per funzionare al 100% lato client anche senza un server Node.js attivo. I feed Blogger supportano nativamente `alt=json`.
1. Imposta in `vite.config.ts` il `base: './'` o `/nome-repo/`.
2. Esegui `npm run build`.
3. Carica il contenuto della cartella `dist/` sul branch `gh-pages` o configura una GitHub Action per il deploy automatico.

### Opzione 2: Full-Stack / Cloud Run / Vercel
In ambiente full-stack, `server.ts` fornisce endpoint proxy `/api/feed` e `/api/check-updates` con caching integrato.

---

## 📄 Licenza & Privacy
Realizzato per **5LB Magazine** (magazine.5lb.eu). Tutti i diritti sui contenuti appartengono ai rispettivi autori.
Informativa sulla privacy: https://framework.5lb.eu/it/privacy-policy
