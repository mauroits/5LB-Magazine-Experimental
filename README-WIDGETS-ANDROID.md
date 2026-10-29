# Guida Completa all'Integrazione dei Widget Nativi Android per 5LB Magazine (TWA / PWABuilder)

Questa guida illustra come integrare i due widget nativi Android (`AppWidgetProvider` con `ViewFlipper` e `BottomSheetDialogFragment`) all'interno del progetto Android generato tramite **PWABuilder** o **Bubblewrap** (Trusted Web Activity).

---

## 📱 I Due Widget Inclusi

### 1. Widget Ticker Ultime Notizie (1x4)
- **Design**: Altezza 1 unità, larghezza adattabile a tutto schermo. Sfondo blu notte (`#000836`), logo ufficiale 5LB Magazine, badge "ULTIME".
- **Tecnologia**: `AppWidgetProvider` con `ViewFlipper` nativo Android (`flipInterval="4500"`). Ruota automaticamente ogni 4.5 secondi senza dipendere da focus o selezioni (evita i blocchi noti del `marquee_forever` sui launcher Android moderni come Pixel Launcher, Samsung OneUI e Nova).
- **Aggiornamento**: In background ogni 2 ore (`updatePeriodMillis="7200000"`) interrogando l'endpoint ultraleggero `https://magazine.5lb.eu/api/widget/news`.
- **Interazione**: Toccando una notizia, lancia la TWA sul deep-link `https://magazine.5lb.eu/?articleId=<id>`, aprendo all'istante l'articolo desiderato a schermo intero. Toccando l'icona ingranaggio apre la schermata per scegliere il feed (*Ultime notizie*, *Accade oggi*, *Il mio archivio*).

### 2. Widget Barra Eziologia 1x4 con BottomSheet Nativo
- **Design**: Barra compatta 1x4 con icona apparato, etichetta *"EZIOLOGIA · 5LB"* e sottotitolo *"Tocca per scegliere tra 14 apparati biologici"*.
- **Tecnologia**: Evita qualsiasi conflitto con le gesture di scorrimento verticale del launcher Android (gesture di sistema / apertura app drawer). Al tocco sulla barra, lancia con `PendingIntent` l'activity `EtiologyBottomSheetActivity` con tema trasparente / dialog.
- **BottomSheet Nativo**: Fa scorrere fluidamente dal basso l'elenco delle 14 categorie biologiche con le rispettive icone/emoji (Vie respiratorie, Cavità orale, Seno, App. gastro-intestinale, ecc.).
- **Interazione**: Toccando un apparato, il BottomSheet si chiude all'istante e avvia la TWA sul deep-link `https://magazine.5lb.eu/?category=ezio-...`, caricando e filtrando immediatamente gli articoli della categoria.

---

## 📂 Struttura File da Inserire nel Progetto Android

Tutti i file sorgente sono salvati nella cartella `/android-widgets/` di questo repository e vanno posizionati nel tuo progetto Android come segue:

```text
app/
└── src/
    └── main/
        ├── AndroidManifest.xml                        <-- Aggiungere receiver e activity
        ├── java/
        │   └── eu/five_lb/magazine/widget/
        │       ├── NewsTickerWidgetProvider.kt        <-- Provider Ticker con ViewFlipper
        │       ├── EtiologyBarWidgetProvider.kt       <-- Provider Barra Eziologia
        │       ├── EtiologyBottomSheetActivity.kt     <-- BottomSheet con le 14 categorie
        │       └── NewsWidgetConfigureActivity.kt     <-- Configurazione feed del widget
        └── res/
            ├── layout/
            │   ├── widget_news_ticker.xml             <-- Layout Ticker (ViewFlipper)
            │   ├── widget_etiology_bar.xml            <-- Layout Barra 1x4
            │   ├── activity_etiology_bottom_sheet.xml <-- Layout BottomSheet
            │   └── item_etiology_category.xml         <-- Righina categoria nel BottomSheet
            └── xml/
                ├── widget_news_ticker_info.xml        <-- Metadati Provider Ticker (2 ore)
                └── widget_etiology_bar_info.xml       <-- Metadati Provider Eziologia
```

---

## 🛠️ Procedura Passo-Passo per PWABuilder / Android Studio

### Passo 1: Genera il pacchetto Android con PWABuilder
1. Visita [pwabuilder.com](https://www.pwabuilder.com/) e inserisci l'URL dell'applicazione PWA.
2. Scarica il file ZIP del progetto Android nativo (Trusted Web Activity).
3. Estrai l'archivio e apri la cartella del progetto in **Android Studio**.

### Passo 2: Aggiungi le Dipendenze in `app/build.gradle`
Nel file `app/build.gradle` (o `app/build.gradle.kts`), assicurati che siano presenti:
```groovy
dependencies {
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
}
```

### Passo 3: Incolla i File XML delle Risorse
Copia i file dalla cartella `/android-widgets/res/` del repository nella cartella `app/src/main/res/` del tuo progetto Android Studio.

### Passo 4: Incolla i File Kotlin
Copia i 4 file Kotlin da `/android-widgets/src/` nella cartella sorgente corrispondente al tuo package:
`app/src/main/java/eu/five_lb/magazine/widget/`

*(Se il tuo package name o applicationId è diverso, modifica semplicemente la prima riga `package ...` nei file Kotlin).*

### Passo 5: Aggiorna `AndroidManifest.xml`
All'interno del tag `<application>` in `app/src/main/AndroidManifest.xml`, incolla le dichiarazioni:

```xml
<!-- WIDGET 1: Ticker Ultime Notizie 1x4 -->
<receiver
    android:name=".widget.NewsTickerWidgetProvider"
    android:label="5LB Magazine - Ticker Notizie"
    android:exported="true">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
        <action android:name="eu.five_lb.magazine.ACTION_REFRESH_NEWS" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/widget_news_ticker_info" />
</receiver>

<activity
    android:name=".widget.NewsWidgetConfigureActivity"
    android:exported="true"
    android:theme="@style/Theme.MaterialComponents.DayNight.Dialog">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_CONFIGURE" />
    </intent-filter>
</activity>

<!-- WIDGET 2: Barra Eziologia 1x4 -->
<receiver
    android:name=".widget.EtiologyBarWidgetProvider"
    android:label="5LB Magazine - Eziologia"
    android:exported="true">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/widget_etiology_bar_info" />
</receiver>

<!-- Activity trasparente che apre il BottomSheet nativo -->
<activity
    android:name=".widget.EtiologyBottomSheetActivity"
    android:exported="false"
    android:theme="@style/Theme.Design.BottomSheetDialog"
    android:windowSoftInputMode="stateAlwaysHidden" />
```

### Passo 6: Compila e Testa sul Telefono
1. Collega il tuo smartphone Android con Debug USB attivo (oppure usa un emulatore).
2. Esegui il comando `./gradlew assembleDebug` o clicca su **Run** in Android Studio.
3. Sulla schermata Home dello smartphone, tieni premuto su un'area vuota, tocca **Widget**, cerca **5LB Magazine** e aggiungi i due widget:
   - **5LB Magazine - Ticker Notizie (1x4)**
   - **5LB Magazine - Eziologia (1x4)**

---

## 🌐 Endpoint API Disponibili

L'applicazione espone endpoint JSON ottimizzati per il consumo dai widget:

1. **`GET /api/widget/news?feed=latest|today|archive&limit=5`**
   - Risposta JSON compatta: `{ status: "ok", feed: "latest", count: 5, items: [{ id, title, summary, date, category, deepLink, url }] }`
   - Cache: 2 ore (`max-age=7200, stale-while-revalidate=1800`), CORS abilitato.
2. **`GET /api/widget/categories`**
   - Risposta JSON con le 14 categorie biologiche di Eziologia e i rispettivi deep-link.

---

## 🔗 Parametri Deep-Link Gestiti dall'App

- `?category=ezio-respiratorie` (o `ezio-seno`, `ezio-gastro`, ecc.): apre la sezione Eziologia e scarica gli articoli.
- `?filter=non-letto` | `?filter=today` | `?filter=salvati` | `?filter=all`
- `?articleId=<id>`: apre direttamente il modale di lettura dell'articolo.
