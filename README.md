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
  - Filtri rapidi: *Ultime*, *Non letto*, *Salva per dopo (Preferiti)*, *Accade oggi (Canale Telegram @magazine5LB aperto direttamente in-app)*.
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

