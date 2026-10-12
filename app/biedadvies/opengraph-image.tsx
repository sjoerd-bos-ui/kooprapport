import { ogImageContentType, ogImageSize, renderOgImage } from "@/lib/og/ogTemplate";

export const alt = "Biedadvies · Kooprapport";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function Image() {
  return renderOgImage({
    kicker: "Biedadvies",
    titel: "Hoeveel moet je bieden op een huis?",
    omschrijving: "Bereken je bod op basis van het NVM-overbiedcijfer voor jouw regio.",
  });
}
