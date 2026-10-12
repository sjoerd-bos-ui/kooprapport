import { ogImageContentType, ogImageSize, renderOgImage } from "@/lib/og/ogTemplate";

export const alt = "Algemene voorwaarden · Kooprapport";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function Image() {
  return renderOgImage({
    kicker: "Voorwaarden",
    titel: "Algemene voorwaarden",
    omschrijving: "De voorwaarden van Kooprapport.",
  });
}
