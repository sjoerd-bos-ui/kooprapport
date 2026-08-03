import { ogImageContentType, ogImageSize, renderOgImage } from "@/lib/og/ogTemplate";

export const alt = "Marktupdates · Kooprapport";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function Image() {
  return renderOgImage({
    kicker: "Marktupdates",
    titel: "De woningmarkt in cijfers, elk kwartaal opnieuw",
    omschrijving:
      "Verkoopprijzen, overbieden en de verschillen per regio, gebaseerd op de nieuwste cijfers van NVM, Kadaster en CBS.",
  });
}
