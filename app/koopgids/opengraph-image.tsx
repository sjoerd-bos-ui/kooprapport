import { ogImageContentType, ogImageSize, renderOgImage } from "@/lib/og/ogTemplate";

export const alt = "Koopgids · Kooprapport";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function Image() {
  return renderOgImage({
    kicker: "Koopgids",
    titel: "Alles wat u moet weten voordat u koopt.",
    omschrijving:
      "Elk onderdeel van uw rapport haarfijn uitgelegd, gebaseerd op dezelfde officiële bronnen als het rapport zelf.",
  });
}
