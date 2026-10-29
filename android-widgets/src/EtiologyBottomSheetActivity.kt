package eu.five_lb.magazine.widget

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageButton
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.bottomsheet.BottomSheetDialog
import eu.five_lb.magazine.R

/**
 * Activity trasparente che mostra il BottomSheet nativo con l'elenco
 * delle 14 categorie biologiche di Eziologia al tocco sul widget 1x4.
 *
 * Al tocco su una voce, lancia la TWA sul deep-link corrispondente e si chiude istantaneamente.
 */
class EtiologyBottomSheetActivity : AppCompatActivity() {

    data class EtiologyCategory(
        val id: String,
        val label: String,
        val emoji: String,
        val description: String,
        val deepLink: String
    )

    private val categories = listOf(
        EtiologyCategory("ezio-respiratorie", "Vie respiratorie", "🫁", "Laringe, bronchi, polmoni", "https://magazine.5lb.eu/?category=ezio-respiratorie"),
        EtiologyCategory("ezio-bocca", "Cavità orale", "👄", "Denti, lingua, gengive", "https://magazine.5lb.eu/?category=ezio-bocca"),
        EtiologyCategory("ezio-seno", "Seno", "🩺", "Ghiandole mammarie, dotti galattofori", "https://magazine.5lb.eu/?category=ezio-seno"),
        EtiologyCategory("ezio-gastro", "App. gastro-intestinale", "🍽️", "Stomaco, fegato, intestino", "https://magazine.5lb.eu/?category=ezio-gastro"),
        EtiologyCategory("ezio-cardio", "App. cardio-circolatorio", "🫀", "Cuore, vasi, coronarie", "https://magazine.5lb.eu/?category=ezio-cardio"),
        EtiologyCategory("ezio-urinario", "Apparato urinario", "💧", "Reni, vescica, dotti escretori", "https://magazine.5lb.eu/?category=ezio-urinario"),
        EtiologyCategory("ezio-genitale", "Apparato genitale", "🧬", "Utero, ovaie, prostata, testicoli", "https://magazine.5lb.eu/?category=ezio-genitale"),
        EtiologyCategory("ezio-muscolo", "App. muscolo-scheletrico", "🦴", "Ossa, muscoli, articolazioni", "https://magazine.5lb.eu/?category=ezio-muscolo"),
        EtiologyCategory("ezio-pelle", "La pelle", "🖐️", "Epidermide, corion, derma", "https://magazine.5lb.eu/?category=ezio-pelle"),
        EtiologyCategory("ezio-nervoso", "Sistema nervoso", "🧠", "Cervello, motricità, sensibilità", "https://magazine.5lb.eu/?category=ezio-nervoso"),
        EtiologyCategory("ezio-sensi", "Vista, udito, olfatto", "👁️", "Occhi, orecchie, naso", "https://magazine.5lb.eu/?category=ezio-sensi"),
        EtiologyCategory("ezio-allergie", "Intolleranze e allergie", "🌿", "Reazioni e binari biologici", "https://magazine.5lb.eu/?category=ezio-allergie"),
        EtiologyCategory("ezio-psicosi", "Psicosi", "⚡", "Costellazioni schizofreniche", "https://magazine.5lb.eu/?category=ezio-psicosi"),
        EtiologyCategory("ezio-lateralita", "La lateralità", "⚖️", "Mancino o destrimane", "https://magazine.5lb.eu/?category=ezio-lateralita")
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Mostra immediatamente il BottomSheetDialog
        showBottomSheet()
    }

    private fun showBottomSheet() {
        val dialog = BottomSheetDialog(this, R.style.Theme_Design_BottomSheetDialog)
        val view = layoutInflater.inflate(R.layout.activity_etiology_bottom_sheet, null)

        val recyclerView = view.findViewById<RecyclerView>(R.id.recycler_etiology_categories)
        val btnClose = view.findViewById<ImageButton>(R.id.btn_close_bottom_sheet)

        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = CategoryAdapter(categories) { selectedCategory ->
            dialog.dismiss()
            openCategoryInTwa(selectedCategory.deepLink)
        }

        btnClose.setOnClickListener {
            dialog.dismiss()
        }

        dialog.setOnDismissListener {
            finish()
        }

        dialog.setContentView(view)
        dialog.show()
    }

    private fun openCategoryInTwa(deepLink: String) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLink)).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        startActivity(intent)
        finish()
    }

    private class CategoryAdapter(
        private val items: List<EtiologyCategory>,
        private val onItemClick: (EtiologyCategory) -> Unit
    ) : RecyclerView.Adapter<CategoryAdapter.ViewHolder>() {

        class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val txtEmoji: TextView = view.findViewById(R.id.txt_category_emoji)
            val txtName: TextView = view.findViewById(R.id.txt_category_name)
            val txtLabel: TextView = view.findViewById(R.id.txt_category_label)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_etiology_category, parent, false)
            return ViewHolder(view)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val item = items[position]
            holder.txtEmoji.text = item.emoji
            holder.txtName.text = item.label
            holder.txtLabel.text = item.description

            holder.itemView.setOnClickListener {
                onItemClick(item)
            }
        }

        override fun getItemCount(): Int = items.size
    }
}
