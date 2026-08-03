import { ogImageContentType, ogImageSize, renderOgImage } from "@/lib/og/ogTemplate";

export const alt = "Waarom Kooprapport";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function Image() {
  return renderOgImage({
    kicker: "Waarom Kooprapport",
    titel: "Eén eigen model, opgebouwd uit vele lagen",
    omschrijving:
      "Onafhankelijk, zorgvuldig zelf ontwikkeld en los van alle partijen rond de aankoop of verkoop van uw woning.",
  });
}
