import { ogImageContentType, ogImageSize, renderOgImage } from "@/lib/og/ogTemplate";

export const alt = "Woningmarkt per stad · Kooprapport";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function Image() {
  return renderOgImage({
    kicker: "Woningmarkt per stad",
    titel: "Huizenprijzen per stad, per kwartaal",
    omschrijving:
      "Dezelfde cijfers als in onze Marktupdates, per stad op een rijtje: prijsontwikkeling, overbieden en hoe dat zich per kwartaal ontwikkelt.",
  });
}
