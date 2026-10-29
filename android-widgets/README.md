# Widget Nativi Android Home Screen per 5LB Magazine (TWA / PWABuilder)

Questa cartella contiene tutti i file sorgente Android (Kotlin e layout XML) pronti per essere inseriti nel wrapper nativo Android (generato con **PWABuilder** o **Bubblewrap**).

---

## 📱 I Due Widget Inclusi

1. **Ticker Ultime Notizie (1x4)**
   - **Tecnologia**: `AppWidgetProvider` con `ViewFlipper` nativo (transizione automatica orizzontale ogni 4.5s).
   - **Nessun blocco da focus**: evita l'instabilità del `marquee_forever` sui launcher moderni (Pixel Launcher, OneUI, Nova).
   - **Contenuto**: Ultime notizie da 5LB Magazine con data, categoria e titolo ad alta leggibilità.
   - **Aggiornamento**: Background ogni 2 ore (`updatePeriodMillis = 7200000`) tramite `/api/widget/news`.
   - **Interazione**: Toccando una notizia si apre direttamente l'app con l'articolo corrispondente (`?articleId=...`).

2. **Barra Eziologia con BottomSheet Nativo (1x4)**
   - **Tecnologia**: `AppWidgetProvider` 1x4 con avvio di `EtiologyBottomSheetActivity`.
   - **Nessun conflitto con le gesture**: abbandonato lo scorrimento riga per riga sul launcher; al tocco compare un `BottomSheetDialogFragment` nativo fluido e trasparente con l'elenco delle 14 categorie biologiche.
   - **Interazione**: Toccando una categoria, il BottomSheet si chiude all'istante e apre la TWA navigando su `?category=ezio-...`.

---

## 🛠️ Come Integrare i File nel Progetto Android PWABuilder

### 1. Copia i File Layout e Risorse XML
Copia i file nella cartella `app/src/main/res/` del tuo progetto Android:
- `res/xml/widget_news_ticker_info.xml` ➔ `app/src/main/res/xml/`
- `res/xml/widget_etiology_bar_info.xml` ➔ `app/src/main/res/xml/`
- `res/layout/widget_news_ticker.xml` ➔ `app/src/main/res/layout/`
- `res/layout/widget_etiology_bar.xml` ➔ `app/src/main/res/layout/`
- `res/layout/activity_etiology_bottom_sheet.xml` ➔ `app/src/main/res/layout/`
- `res/layout/item_etiology_category.xml` ➔ `app/src/main/res/layout/`

### 2. Copia i File Sorgente Kotlin
Copia i file `.kt` nella cartella sorgente del tuo package (es. `app/src/main/java/eu/five_lb/magazine/widget/`):
- `src/NewsTickerWidgetProvider.kt`
- `src/EtiologyBarWidgetProvider.kt`
- `src/EtiologyBottomSheetActivity.kt`
- `src/NewsWidgetConfigureActivity.kt`

*(Ricorda di aggiornare la prima riga `package ...` con il tuo package reale dichiarato in `applicationId`)*

### 3. Aggiorna `AndroidManifest.xml`
Incolla le dichiarazioni dei `<receiver>` e delle `<activity>` contenute in `AndroidManifest.xml` dentro il tag `<application>` del tuo manifest.

### 4. Dipendenze Gradle (`app/build.gradle`)
Assicurati di includere le librerie standard di Material Components e Coroutine:
```groovy
dependencies {
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
}
```
