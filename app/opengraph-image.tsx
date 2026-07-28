import { ImageResponse } from "next/og";

// Site-wide OG-afbeelding (er was er nog helemaal geen — social previews en
// WhatsApp/LinkedIn-kaarten toonden dus niets). Geldt als fallback voor élke
// pagina die zelf geen eigen opengraph-image definieert, dus ook voor de
// rapportpagina's — die krijgen al wel een eigen, per-adres titel/
// beschrijving via generateMetadata, alleen (nog) niet een eigen
// gepersonaliseerde afbeelding (zie de audit voor de reden: dat vraagt om
// searchParams in een bestandsconventie die dat niet gegarandeerd
// doorgeeft, bewust niet ongetest geïmplementeerd).
export const alt = "Kooprapport — premium woningdata per adres";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// v2 — vervangt de vorige, simpele indigo-vlak-versie door dezelfde tekst,
// tegels en gestapelde voorbeeldkaarten die ook echt op de homepage-hero
// staan (app/page.tsx, sectie "zoeken"), zodat de Facebook/WhatsApp/
// LinkedIn-preview niet meer los staat van hoe de site er nu daadwerkelijk
// uitziet. Eerst als losse visualize-mockup afgestemd, pas hierna gebouwd.
//
// Satori (de renderer achter ImageResponse) ondersteunt alleen flexbox, geen
// CSS Grid en geen radial-gradient-achtergronden — vandaar hieronder overal
// expliciete flexDirection i.p.v. grid, en een vlakke witte achtergrond i.p.v.
// het gestippelde patroon dat de echte hero heeft. box-shadow zonder
// spread-waarde en transform:rotate zijn wel ondersteund (lokaal getest via
// een los node-scriptje dat next/dist/compiled/@vercel/og direct aanroept,
// omdat `next build` in de ontwikkelsandbox geen werkend SWC-binary heeft).
//
// BUGFIX: ✓ en ⚡ zaten er eerst bij de badges — Satori's default-lettertype
// kent die glyphs niet en probeert dan LIVE een aanvullend lettertype op te
// halen bij fonts.googleapis.com/cdn.jsdelivr.net (bevestigd via de
// hierboven genoemde lokale test: zonder netwerktoegang faalde het renderen
// keihard op precies die twee tekens). Op Vercel heeft de functie wel
// internettoegang, maar dat is een onnodige, trage en breekbare afhankelijkheid
// voor een louter decoratief icoontje — daarom hier bewust weggelaten i.p.v.
// simpelweg "toevallig getest en het werkte".
const PILLS = [
  { label: "Waarde", actief: false },
  { label: "Verkopen", actief: false },
  { label: "Fundering", actief: false },
  { label: "+37 meer", actief: true },
];

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 56,
          padding: "64px 72px",
          backgroundColor: "#FFFFFF",
        }}
      >
        {/* Linkerkolom — zelfde badge/kop/subkop/tegels als app/page.tsx */}
        <div style={{ display: "flex", flexDirection: "column", width: 580 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              alignSelf: "flex-start",
              gap: 8,
              borderRadius: 999,
              backgroundColor: "#EEF0FF",
              padding: "10px 18px",
              fontSize: 22,
              fontWeight: 700,
              color: "#4F46E5",
            }}
          >
            <span>Onafhankelijk · gebaseerd op officiële bronnen</span>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 46,
              fontWeight: 800,
              color: "#1F1F2E",
              lineHeight: 1.18,
              letterSpacing: -1,
            }}
          >
            Alles wat u moet weten over een woning, op één plek.
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 20,
              fontSize: 26,
              color: "rgba(31,31,46,0.62)",
              lineHeight: 1.4,
              maxWidth: 560,
            }}
          >
            Waarde, verkopen in de buurt, fundering en nog veel meer, per adres.
          </div>

          <div style={{ display: "flex", flexDirection: "row", gap: 14, marginTop: 32 }}>
            {PILLS.map((pill) => (
              <div
                key={pill.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 16,
                  backgroundColor: pill.actief ? "#4338CA" : "#EEF0FF",
                  padding: "16px 22px",
                  fontSize: 20,
                  fontWeight: 800,
                  color: pill.actief ? "#FFFFFF" : "#4338CA",
                }}
              >
                {pill.label}
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              alignSelf: "flex-start",
              gap: 8,
              marginTop: 28,
              borderRadius: 999,
              backgroundColor: "#EAF3DE",
              padding: "10px 18px",
              fontSize: 22,
              fontWeight: 700,
              color: "#3B6D11",
            }}
          >
            <span>Rapport direct beschikbaar</span>
          </div>
        </div>

        {/* Rechterkolom — vereenvoudigde weergave van de drie gestapelde
            voorbeeldkaarten uit de hero (Verkopen / Waarde-indicatie / Cover),
            met de echte Rijnkanaalkade 1-cijfers uit voorbeeldRapport.ts. */}
        <div style={{ display: "flex", position: "relative", width: 440, height: 470 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              position: "absolute",
              top: 60,
              left: -20,
              width: 240,
              backgroundColor: "#FFFFFF",
              border: "1px solid #E4E4EC",
              borderRadius: 16,
              padding: 20,
              transform: "rotate(-6deg)",
              boxShadow: "0 4px 10px rgba(31,31,46,0.08)",
            }}
          >
            <div style={{ display: "flex", fontSize: 15, fontWeight: 700, color: "rgba(31,31,46,0.45)" }}>VERKOPEN</div>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 10 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: "#1F1F2E" }}>30</span>
              <span style={{ fontSize: 14, color: "rgba(31,31,46,0.5)" }}>laatste 12 mnd</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 10 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: "#1F1F2E" }}>€7.908</span>
              <span style={{ fontSize: 14, color: "rgba(31,31,46,0.5)" }}>gem. per m²</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              position: "absolute",
              top: 0,
              right: 0,
              width: 300,
              backgroundColor: "#FFFFFF",
              border: "1px solid #E4E4EC",
              borderRadius: 16,
              padding: 22,
              transform: "rotate(4deg)",
              boxShadow: "0 24px 40px rgba(31,31,46,0.16)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#1F1F2E" }}>Waarde indicatie</span>
              <span
                style={{
                  display: "flex",
                  fontSize: 15,
                  fontWeight: 800,
                  padding: "4px 12px",
                  borderRadius: 999,
                  backgroundColor: "#EAF3DE",
                  color: "#27500A",
                }}
              >
                +4%
              </span>
            </div>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: "#1F1F2E", marginTop: 10 }}>
              €1.264.239
            </div>
            <div style={{ display: "flex", fontSize: 16, color: "rgba(31,31,46,0.5)", marginTop: 6 }}>
              154 m² · bouwjaar 2021
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              position: "absolute",
              bottom: 10,
              left: 90,
              width: 260,
              backgroundColor: "#FFFFFF",
              border: "1px solid #E4E4EC",
              borderRadius: 16,
              padding: 20,
              transform: "rotate(-2deg)",
              boxShadow: "0 4px 10px rgba(31,31,46,0.08)",
            }}
          >
            <div style={{ display: "flex", fontSize: 14, fontWeight: 700, color: "rgba(31,31,46,0.45)" }}>
              VOORBEELDRAPPORT
            </div>
            <div style={{ display: "flex", fontSize: 22, fontWeight: 800, color: "#1F1F2E", marginTop: 4 }}>
              Rijnkanaalkade 1
            </div>
            <div style={{ display: "flex", fontSize: 15, color: "rgba(31,31,46,0.5)" }}>1019 VA Amsterdam</div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
