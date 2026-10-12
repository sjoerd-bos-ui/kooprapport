import { ogImageContentType, ogImageSize, renderOgImage } from "@/lib/og/ogTemplate";

export const alt = "Privacyverklaring · Kooprapport";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function Image() {
  return renderOgImage({
    kicker: "Privacy",
    titel: "Privacyverklaring",
    omschrijving: "Hoe Kooprapport omgaat met jouw gegevens.",
  });
}
