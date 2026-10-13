/**
 * Utility per risolvere i percorsi delle risorse statiche (icone, immagini del logo, asset)
 * tenendo conto dinamicamente del percorso di base di Vite (import.meta.env.BASE_URL).
 * Funziona sia con deployment su root ('/') sia su sottopercorsi GitHub Pages ('/<repo-name>/').
 */
export function getAssetUrl(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${cleanBase}${cleanPath}`;
}
