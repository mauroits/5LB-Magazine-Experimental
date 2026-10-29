package eu.five_lb.magazine.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import android.widget.RemoteViews
import eu.five_lb.magazine.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Widget 1: Ticker Ultime Notizie 1x4 per la home screen Android.
 *
 * Utilizza un ViewFlipper nativo (flipInterval 4500ms) per ruotare fluidamente
 * le ultime notizie scaricate ogni 2 ore, evitando l'instabilità del marquee_forever.
 * Toccando ogni singola notizia, viene lanciata la TWA direttamente sull'articolo.
 */
class NewsTickerWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "NewsTickerWidget"
        const val ACTION_REFRESH_NEWS = "eu.five_lb.magazine.ACTION_REFRESH_NEWS"
        const val PREFS_NAME = "eu.five_lb.magazine.widget.NewsWidgetPrefs"
        const val PREF_FEED_KEY = "feed_type_"
        const val BASE_ENDPOINT = "https://magazine.5lb.eu/api/widget/news"

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val feedType = prefs.getString("$PREF_FEED_KEY$appWidgetId", "latest") ?: "latest"

            CoroutineScope(Dispatchers.IO).launch {
                val newsItems = fetchNewsFeed(feedType)
                withContext(Dispatchers.Main) {
                    val views = RemoteViews(context.packageName, R.layout.widget_news_ticker)

                    // Aggiorna badge del feed
                    val badgeLabel = when (feedType) {
                        "today" -> "ACCADE OGGI"
                        "archive" -> "ARCHIVIO"
                        else -> "ULTIME"
                    }
                    views.setTextViewText(R.id.txt_feed_badge, badgeLabel)

                    // Click sul logo apre l'app nella home
                    val homeIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://magazine.5lb.eu/")).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    }
                    val homePending = PendingIntent.getActivity(
                        context, 0, homeIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    views.setOnClickPendingIntent(R.id.btn_open_home, homePending)

                    // Click sull'ingranaggio apre la configurazione
                    val configIntent = Intent(context, NewsWidgetConfigureActivity::class.java).apply {
                        putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    val configPending = PendingIntent.getActivity(
                        context, appWidgetId, configIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    views.setOnClickPendingIntent(R.id.btn_widget_settings, configPending)

                    // Popola i 3 slot del ViewFlipper con le notizie
                    val itemIds = listOf(
                        Pair(R.id.item_news_1, R.id.txt_news_title_1),
                        Pair(R.id.item_news_2, R.id.txt_news_title_2),
                        Pair(R.id.item_news_3, R.id.txt_news_title_3)
                    )

                    for (i in itemIds.indices) {
                        val (containerId, textId) = itemIds[i]
                        val item = newsItems.getOrNull(i)

                        if (item != null) {
                            views.setTextViewText(textId, item.title)
                            val articleIntent = Intent(Intent.ACTION_VIEW, Uri.parse(item.deepLink)).apply {
                                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                            }
                            val articlePending = PendingIntent.getActivity(
                                context, appWidgetId * 10 + i, articleIntent,
                                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                            )
                            views.setOnClickPendingIntent(containerId, articlePending)
                        } else {
                            views.setTextViewText(textId, "5LB Magazine — Notizie e risorse biologiche")
                            views.setOnClickPendingIntent(containerId, homePending)
                        }
                    }

                    appWidgetManager.updateAppWidget(appWidgetId, views)
                }
            }
        }

        private fun fetchNewsFeed(feedType: String): List<WidgetItem> {
            val result = mutableListOf<WidgetItem>()
            try {
                val url = URL("$BASE_ENDPOINT?feed=$feedType&limit=5")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    connectTimeout = 6000
                    readTimeout = 8000
                    requestMethod = "GET"
                    setRequestProperty("User-Agent", "5LB-Magazine-AndroidWidget/1.0")
                    setRequestProperty("Accept", "application/json")
                }

                if (conn.responseCode == 200) {
                    val jsonStr = conn.inputStream.bufferedReader().use { it.readText() }
                    val json = JSONObject(jsonStr)
                    val items = json.optJSONArray("items")
                    if (items != null) {
                        for (i in 0 until items.length()) {
                            val obj = items.getJSONObject(i)
                            result.add(
                                WidgetItem(
                                    id = obj.optString("id"),
                                    title = obj.optString("title"),
                                    deepLink = obj.optString("deepLink", "https://magazine.5lb.eu/"),
                                    category = obj.optString("category", "Notizie")
                                )
                            )
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Impossibile scaricare feed widget: ${e.message}")
            }
            return result
        }
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH_NEWS) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val thisWidget = ComponentName(context, NewsTickerWidgetProvider::class.java)
            val allWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
            for (id in allWidgetIds) {
                updateAppWidget(context, appWidgetManager, id)
            }
        }
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
        for (appWidgetId in appWidgetIds) {
            prefs.remove("$PREF_FEED_KEY$appWidgetId")
        }
        prefs.apply()
    }

    data class WidgetItem(
        val id: String,
        val title: String,
        val deepLink: String,
        val category: String
    )
}
