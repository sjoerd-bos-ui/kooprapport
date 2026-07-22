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

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#4F46E5",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              backgroundColor: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 700,
              color: "#4F46E5",
            }}
          >
            K
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, color: "#ffffff" }}>Kooprapport</div>
        </div>
        <div
          style={{
            marginTop: 48,
            fontSize: 56,
            fontWeight: 700,
            color: "#ffffff",
            maxWidth: 900,
            lineHeight: 1.15,
          }}
        >
          Alles wat u moet weten over een woning, op één plek.
        </div>
        <div style={{ marginTop: 24, fontSize: 28, color: "rgba(255,255,255,0.85)" }}>
          Waarde, verkopen in de buurt, fundering en nog veel meer, per adres
        </div>
      </div>
    ),
    { ...size }
  );
}
