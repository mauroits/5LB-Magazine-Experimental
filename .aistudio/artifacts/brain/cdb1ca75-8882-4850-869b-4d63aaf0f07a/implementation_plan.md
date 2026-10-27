# Restyling Grafico Anteprime Immagini RSS: Cornice Staccata e Separazione Visiva

Ridisegno della presentazione grafica delle immagini di anteprima nei post RSS per eliminare la confusione visiva tra il testo incorporato nelle immagini grafiche/social e il testo nativo dell'articolo.

### User Review & Critical Decisions

> [!IMPORTANT] Scelte confermate nella fase di chiarimento:
> - **Stile grafico di separazione**: Cornice staccata con bordo perimetrale e sfondo neutro (passe-partout), che isola l'immagine dai testi della scheda impedendo la fusione visiva dei contenuti con sfondo chiaro.
> - **Controllo visualizzazione**: Nessun toggle aggiuntivo necessario; si fa affidamento sulla vista compatta già disponibile per gli utenti che desiderano una lettura puramente testuale.

- **Confermato**: Inset frame con raggio di curvatura proporzionato (`rounded-xl` all'interno di scheda `rounded-2xl`), sfondo neutro passe-partout (`bg-slate-100/90 dark:bg-slate-800/80`), bordo sottile perimetrale e sottile divisore tra cornice e corpo dell'articolo.
- **Miglioramento accessorio consigliato**: Aggiunta di un discreto indicatore visivo di media (icona immagine o badge opaco minimale) e rifinitura dello stile per le immagini interne al modale di lettura.

---

### 1. Panoramica & Obiettivo

Nelle schede degli articoli RSS (in particolare post provenienti da social o aggregatori con grafiche e banner di testo), l'immagine di anteprima include spesso titoli, sottotitoli e pulsanti grafici su sfondo bianco. Quando l'immagine viene visualizzata a pieno formato a filo ("full bleed") sopra il testo della scheda, i caratteri dell'immagine si fondono direttamente con il titolo e l'anteprima dell'articolo, creando un effetto sgradevole di "doppio titolo" e disorientamento per il lettore.

La soluzione introduce una **cornice staccata a passe-partout**:
1. L'immagine non tocca più i bordi esterni della card ma è inserita con un padding dedicato (`p-3 sm:p-3.5 pb-0`).
2. Viene racchiusa in un contenitore sagomato con bordo ben definito (`border border-slate-200/90 dark:border-slate-800`), raggio arrotondato coerente e sfondo opaco/neutro (`bg-slate-100 dark:bg-slate-800/80`).
3. Una linea di stacco o spaziatura bilanciata separa nettamente la cornice dal corpo del testo (data, stato lettura, titolo e sommario).
4. La transizione hover si applica in modo controllato all'interno della cornice senza strabordare.

---

### 2. User Experience & Visual Design

#### Struttura della Scheda con Cornice Staccata

```
┌────────────────────────────────────────────────────────┐
│  Card (bg-white / dark:bg-slate-900, rounded-2xl)       │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │ <- Inset container (padding 12px/14px)
│  │ Framed Media Preview (rounded-xl, border, matte) │  │
│  │                                                  │  │
│  │        [ Immagine / Banner con testo ]           │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│  ────────────────────────────────────────────────────  │ <- Separatore o margine di stacco
│                                                        │
│   🟠 31 Ott 2025                             [○] [♡]   │ <- Meta bar articolo
│   Titolo dell'Articolo (Ben distinto e leggibile)      │ <- Titolo nativo
│   Sommario del post...                                 │
│                                                        │
│   [CATEGORIA 1] [CATEGORIA 2]                          │
└────────────────────────────────────────────────────────┘
```

#### Palette e Token Visivi
- **Sfondo cornice (Passe-partout)**: `bg-slate-100/90 dark:bg-slate-800/80` (crea contrasto immediato anche con grafiche a sfondo bianco puro o trasparente).
- **Bordo cornice**: `border border-slate-200/90 dark:border-slate-700/80` con sottile anello `ring-1 ring-black/5 dark:ring-white/5`.
- **Raggio di curvatura (Spatial math)**: Card esterna `rounded-2xl` (16px), Frame interno `rounded-xl` (12px) per un'armonia geometrica impeccabile ($r_{\text{inner}} = r_{\text{outer}} - \text{padding}$).
- **Trattamento Hover**: Zoom delicato e controllato dell'immagine (`group-hover:scale-[1.03]`) contenuto rigidamente all'interno della cornice (`overflow-hidden`).

---

### 3. Decisioni Chiave di Prodotto & Dettagli Tecnici

#### Decisione 1: Inset Frame vs Full-Bleed
- **Scelta**: Inserimento dell'immagine all'interno di una cornice staccata con padding e sfondo neutro.
- **Motivazione**: Risolve alla radice il problema mostrato nello screenshot dell'utente, dove un'infografica bianca si confonde con lo sfondo bianco della card e sembra far parte del testo nativo.
- **Alternativa scartata**: Layout orizzontale forzato (scartato dall'utente per preservare la densità e il formato a griglia).

#### Decisione 2: Nessun Toggle Aggiuntivo nel Toolbar
- **Scelta**: Mantenimento dell'attuale commutatore Griglia/Compatto (`viewMode === 'card' ? ... : ...`).
- **Motivazione**: Conforme alla risposta dell'utente ("Solo tramite la vista elenco compatta gia esistente"). Evita di appesantire la barra degli strumenti con interruttori superflui.

#### Decisione 3: Armonizzazione nel Modale Articolo
- **Scelta**: Applicazione di un trattamento coerente (bordo sottile, sfondo neutro e raggio sagomato) anche per le immagini e figure contenute nel corpo degli articoli dentro `ArticleModal.tsx`.

---

### 4. Piano di Esecuzione delle Modifiche

1. **Aggiornamento di `src/components/ArticleList.tsx`**:
   - Modificare il rendering del thumbnail della vista scheda (`viewMode === 'card'`):
     - Aggiungere il wrapper esterno con padding (`p-3 sm:p-3.5 pb-0`).
     - Applicare il contenitore cornice con `rounded-xl`, bordo neutro (`border border-slate-200/90 dark:border-slate-800`), sfondo matte (`bg-slate-100/90 dark:bg-slate-800/80`) e `shadow-2xs`.
     - Regolare la spaziatura superiore del corpo card (`p-4 sm:p-5 pt-3 sm:pt-4`) per un bilanciamento armonioso dello spazio verticale.
2. **Aggiornamento di `src/components/ArticleModal.tsx`**:
   - Assicurare che le immagini incorporate nell'HTML abbiano un bordo leggero e uno sfondo neutro di sicurezza per evitare fusioni di testo identiche nel corpo di lettura (`[&_img]:border [&_img]:border-slate-200 dark:[&_img]:border-slate-800 [&_img]:bg-slate-50 dark:[&_img]:bg-slate-900/40`).
3. **Verifica & Compilazione**:
   - Eseguire `compile_applet` e validare l'integrità del build.
