import type { FeatureDefinition } from "./access.types";
import { DEFAULT_ACCESS } from "./access.defaults";

/**
 * Registre central de toutes les features de JeuTaime.
 *
 * - `routes`  : noms de routes Expo Router rattachées à cette feature
 * - `tab`     : défini seulement si la feature a un onglet dans la TabBar
 * - `access`  : état courant (piloté par access.defaults.ts)
 */
export const FEATURE_REGISTRY: FeatureDefinition[] = [
  {
    key:    "home",
    label:  "Accueil",
    routes: ["index"],
    tab:    { icon: "⭐", label: "Accueil" },
    access: DEFAULT_ACCESS.home,
  },
  {
    key:    "profiles",
    label:  "Profils",
    routes: ["profiles", "profile/[id]", "matching-preferences"],
    tab:    { icon: "🔍", label: "Profils" },
    access: DEFAULT_ACCESS.profiles,
  },
  {
    key:    "social",
    label:  "Social",
    routes: ["social"],
    tab:    { icon: "🌐", label: "Social" },
    access: DEFAULT_ACCESS.social,
  },
  {
    key:    "letters",
    label:  "Boîte aux lettres",
    routes: ["letters"],
    tab:    { icon: "💌", label: "Boîte aux lettres" },
    access: DEFAULT_ACCESS.letters,
  },
  {
    key:    "journal",
    label:  "Journal",
    routes: ["journal"],
    tab:    { icon: "📰", label: "Journal" },
    access: DEFAULT_ACCESS.journal,
  },
  {
    key:    "settings",
    label:  "Plus",
    routes: ["settings", "edit-profile", "password", "privacy", "notifications",
             "personal-data", "delete-account", "blocked-users", "help",
             "faq", "contact-support", "report-bug", "terms", "privacy-policy"],
    tab:    { icon: "⚙️", label: "Plus" },
    access: DEFAULT_ACCESS.settings,
  },
  // ── Features sans onglet (pas de `tab`) ────────────────────────────────
  {
    key:    "salons",
    label:  "Salons",
    routes: ["salons-list", "salon/[id]", "salon/cafe-paris"],
    access: DEFAULT_ACCESS.salons,
  },
  {
    key:    "refuge",
    label:  "Refuge",
    routes: ["pet"],
    access: DEFAULT_ACCESS.refuge,
  },
  {
    key:    "offrandes",
    label:  "Offrandes",
    routes: ["offerings", "shop", "coins", "daily-rewards"],
    access: DEFAULT_ACCESS.offrandes,
  },
  {
    key:    "magie",
    label:  "Magie",
    routes: ["avatar-builder", "sounds", "background-picker"],
    access: DEFAULT_ACCESS.magie,
  },
  {
    key:    "games",
    label:  "Jeux",
    routes: ["games", "duel/create", "duel/play"],
    access: DEFAULT_ACCESS.games,
  },
  {
    key:    "premium",
    label:  "Premium",
    routes: ["premium"],
    access: DEFAULT_ACCESS.premium,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Retourne les features ayant un onglet ET dont l'accès n'est pas "hidden".
 * Utilisé par CustomTabBar pour construire la barre dynamiquement.
 */
export function getVisibleTabs(): FeatureDefinition[] {
  return FEATURE_REGISTRY.filter((f) => f.tab && f.access !== "hidden");
}

/**
 * Construit un dictionnaire { routeName → TabConfig } à partir du registre.
 * Utilisé par CustomTabBar pour retrouver l'icône/label d'un onglet.
 */
export function buildRouteMeta(): Record<string, { icon: string; label: string }> {
  const meta: Record<string, { icon: string; label: string }> = {};
  for (const feature of getVisibleTabs()) {
    if (!feature.tab) continue;
    for (const route of feature.routes) {
      meta[route] = feature.tab;
    }
  }
  return meta;
}
