package eu.five_lb.magazine.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.RadioButton
import android.widget.RadioGroup
import eu.five_lb.magazine.R

/**
 * Activity di configurazione del widget Ticker Notizie.
 * Permette all'utente di scegliere il feed mostrato:
 * - Ultime notizie (default)
 * - Accade oggi (Telegram)
 * - Il mio archivio
 */
class NewsWidgetConfigureActivity : Activity() {

    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)

        appWidgetId = intent?.extras?.getInt(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID
        ) ?: AppWidgetManager.INVALID_APPWIDGET_ID

        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish()
            return
        }

        // Layout semplice programmatico o da risorsa
        val radioGroup = RadioGroup(this).apply {
            orientation = RadioGroup.VERTICAL
            setPadding(32, 32, 32, 16)
        }

        val rbLatest = RadioButton(this).apply {
            id = 1
            text = "Ultime notizie (Predefinito)"
            isChecked = true
        }
        val rbToday = RadioButton(this).apply {
            id = 2
            text = "Accade oggi (Telegram social)"
        }
        val rbArchive = RadioButton(this).apply {
            id = 3
            text = "Il mio archivio"
        }

        radioGroup.addView(rbLatest)
        radioGroup.addView(rbToday)
        radioGroup.addView(rbArchive)

        val btnSave = Button(this).apply {
            text = "Salva e Aggiorna Widget"
            setOnClickListener {
                val feedType = when (radioGroup.checkedRadioButtonId) {
                    2 -> "today"
                    3 -> "archive"
                    else -> "latest"
                }

                // Salva nelle preferenze per questo widget ID
                val prefs = getSharedPreferences(
                    NewsTickerWidgetProvider.PREFS_NAME,
                    Context.MODE_PRIVATE
                ).edit()
                prefs.putString("${NewsTickerWidgetProvider.PREF_FEED_KEY}$appWidgetId", feedType)
                prefs.apply()

                // Aggiorna il widget
                val appWidgetManager = AppWidgetManager.getInstance(this@NewsWidgetConfigureActivity)
                NewsTickerWidgetProvider.updateAppWidget(this@NewsWidgetConfigureActivity, appWidgetManager, appWidgetId)

                val resultValue = Intent().apply {
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                }
                setResult(RESULT_OK, resultValue)
                finish()
            }
        }

        val container = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            addView(radioGroup)
            addView(btnSave)
        }

        setContentView(container)
    }
}
