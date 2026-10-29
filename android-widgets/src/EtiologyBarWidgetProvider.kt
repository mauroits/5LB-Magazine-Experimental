package eu.five_lb.magazine.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import eu.five_lb.magazine.R

/**
 * Widget 2: Barra di Accesso Rapido Eziologia (1x4).
 *
 * Al tocco sulla barra, lancia con PendingIntent l'activity trasparente
 * EtiologyBottomSheetActivity, evitando qualsiasi conflitto con le gesture
 * di swipe del launcher Android e mostrando fluidamente l'elenco dei 14 apparati.
 */
class EtiologyBarWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_etiology_bar)

            // Intent che avvia il BottomSheet nativo con l'elenco delle 14 categorie
            val intent = Intent(context, EtiologyBottomSheetActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }

            val pendingIntent = PendingIntent.getActivity(
                context,
                appWidgetId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            views.setOnClickPendingIntent(R.id.widget_etiology_root, pendingIntent)
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
