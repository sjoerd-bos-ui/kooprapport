import { ogImageContentType, ogImageSize, renderOgImage } from "@/lib/og/ogTemplate";

export const alt = "Contact · Kooprapport";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function Image() {
  return renderOgImage({
    kicker: "Contact",
    titel: "Vragen over je woningrapport?",
    omschrijving: "Neem contact op met Kooprapport.",
  });
}
