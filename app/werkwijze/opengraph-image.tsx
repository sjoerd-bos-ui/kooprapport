import { ogImageContentType, ogImageSize, renderOgImage } from "@/lib/og/ogTemplate";

export const alt = "Werkwijze · Kooprapport";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function Image() {
  return renderOgImage({
    kicker: "Werkwijze",
    titel: "Hoe Kooprapport tot stand komt",
    omschrijving:
      "Per onderdeel van het rapport in het kort uitgelegd waar de gegevens vandaan komen en hoe actueel ze zijn.",
  });
}
