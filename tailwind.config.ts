import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Indigo/wit "SaaS"-palet — vervangt het eerdere zwart/crème
        // editorial-palet, na de homepage-herontwerpronde. Bestaande
        // tokennamen zijn bewust behouden (parchment/paper/ink/sun/rust/
        // mist/line) zodat elke component die ze al gebruikte automatisch
        // meeverandert, zonder in tientallen bestanden losse classNames te
        // moeten aanpassen:
        //   ink     = tekst + neutrale donkere vlakken (geen felle brand-
        //             kleur meer — dat is nu `accent`).
        //   accent  = indigo — het primaire actie-/merkkleur (knoppen,
        //             links, chips, focus). NIEUW t.o.v. het oude systeem.
        //   sun     = amber — aandacht/gemiddeld (bv. funderingsrisico
        //             "midden").
        //   rust    = rood — waarschuwing/risico (bv. funderingsrisico
        //             "hoog", negatieve prijsdelta's).
        // parchment/paper voor lagen (pagina-canvas resp. kaarten), line
        // voor haarlijnen, mist voor lichte hover-tint.
        parchment: "#F5F5FA",
        paper: "#FFFFFF",
        ink: "#1F1F2E",
        accent: { DEFAULT: "#4F46E5", dark: "#4338CA" },
        sun: "#D97706",
        rust: "#B7302B",
        mist: "#EEF0FF",
        line: "#E4E4EC",
      },
      fontFamily: {
        // Bricolage Grotesque: uitgesproken, architectonische grotesk —
        // geen brave systeemserif, geen generieke SaaS-sans. Draagt de hele
        // typografische identiteit (koppen, cijfers, kickers). Inter blijft
        // uitsluitend voor lopende tekst/UI, bewust ondergeschikt.
        display: ["var(--font-display)", "Arial Black", "Helvetica Neue", "sans-serif"],
        sans: ["var(--font-sans)", "Helvetica Neue", "Arial", "sans-serif"],
      },
      fontSize: {
        // Groter, boller, krappere tracking — een dashboard-koptekst mag
        // hier best fysiek zwaar ogen (zie referentie: "Dashboard"/"Your
        // Realtor For Life!").
        "display-xl": ["4.5rem", { lineHeight: "0.98", letterSpacing: "-0.02em" }],
        "display-lg": ["3.5rem", { lineHeight: "1.0", letterSpacing: "-0.02em" }],
        "display-md": ["2.5rem", { lineHeight: "1.05", letterSpacing: "-0.015em" }],
        "display-sm": ["1.75rem", { lineHeight: "1.1", letterSpacing: "-0.01em" }],
      },
      letterSpacing: {
        wider2: "0.14em",
        wider3: "0.2em",
      },
      boxShadow: {
        // Bewust minimaal: het referentiemateriaal werkt vrijwel volledig
        // vlak (haarlijnen/kleurvlakken, geen zachte drop-shadows). Alleen
        // voor losstaande overlays (modal/dropdown) een subtiele schaduw.
        flat: "0 1px 0 rgba(31, 31, 46, 0.06)",
        overlay: "0 24px 48px -16px rgba(31, 31, 46, 0.22)",
      },
      borderRadius: {
        // Kleinere, striktere radius dan een gemiddeld SaaS-dashboard —
        // scherper, "gedrukt document"-achtig. Volle pillvorm blijft alleen
        // voor knoppen/tags (bewust contrast tussen scherpe kaarten en
        // ronde interactie-elementen, zie referentiebeelden).
        xl: "0.75rem",
        "2xl": "0.875rem",
        "3xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
