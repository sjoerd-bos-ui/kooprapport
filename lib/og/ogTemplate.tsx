import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// -----------------------------------------------------------------------------
// Gedeeld OG-sjabloon voor elke pagina die GEEN eigen, volledig op maat
// gemaakte scene heeft (zoals de homepage, zie app/opengraph-image.tsx) --
// tot nu toe deelde de HELE site die ene homepage-afbeelding: een gedeeld
// Koopgids-artikel of Marktupdate toonde in WhatsApp/LinkedIn dus altijd
// dezelfde generieke kaart, zonder titel of onderwerp van dat specifieke
// artikel. Dit sjabloon toont in plaats daarvan de kicker (bv. "Koopgids")
// + de echte paginatitel + een korte omschrijving, in dezelfde merkstijl
// (indigo badge, Bricolage Grotesque kop, groene beschikbaarheidsbadge).
//
// Bewust GEEN losse rechterkolom-illustratie per pagina (dat zou voor elk
// Koopgids-artikel/Marktupdate een eigen, onderhouden scene vergen) -- de
// meeste winst zit al in het tonen van de JUISTE titel/onderwerp i.p.v.
// altijd dezelfde homepage-tekst.
const bricolageGrotesqueOg = readFile(join(process.cwd(), "app/bricolage-grotesque-og.ttf"));

export const ogImageSize = { width: 1200, height: 630 };
export const ogImageContentType = "image/png";

export async function renderOgImage({
  kicker,
  titel,
  omschrijving,
}: {
  kicker: string;
  titel: string;
  omschrijving: string;
}) {
  const fontData = await bricolageGrotesqueOg;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 88px",
          backgroundColor: "#FFFFFF",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            alignSelf: "flex-start",
            gap: 8,
            borderRadius: 999,
            backgroundColor: "#EEF0FF",
            padding: "12px 22px",
            fontSize: 24,
            fontWeight: 700,
            color: "#4F46E5",
          }}
        >
          <span>{kicker}</span>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 36,
            fontSize: 54,
            fontWeight: 800,
            fontFamily: "Bricolage Grotesque",
            color: "#1F1F2E",
            lineHeight: 1.16,
            letterSpacing: -1,
            maxWidth: 920,
          }}
        >
          {titel}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 26,
            fontSize: 28,
            color: "rgba(31,31,46,0.62)",
            lineHeight: 1.4,
            maxWidth: 860,
          }}
        >
          {omschrijving}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            alignSelf: "flex-start",
            gap: 8,
            marginTop: 44,
            borderRadius: 999,
            backgroundColor: "#EAF3DE",
            padding: "10px 20px",
            fontSize: 22,
            fontWeight: 700,
            color: "#3B6D11",
          }}
        >
          <span>Kooprapport · gebaseerd op officiële bronnen</span>
        </div>
      </div>
    ),
    {
      ...ogImageSize,
      fonts: [{ name: "Bricolage Grotesque", data: fontData, weight: 800, style: "normal" }],
    }
  );
}
