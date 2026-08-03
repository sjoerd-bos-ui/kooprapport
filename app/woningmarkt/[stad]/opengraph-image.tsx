import { ogImageContentType, ogImageSize, renderOgImage } from "@/lib/og/ogTemplate";
import { getStadBySlug } from "@/lib/content/steden";

export const alt = "Huizenprijzen per stad · Kooprapport";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function Image({ params }: { params: Promise<{ stad: string }> }) {
  const { stad: stadSlug } = await params;
  const stad = getStadBySlug(stadSlug);
  return renderOgImage({
    kicker: "Woningmarkt per stad",
    titel: stad ? `Huizenprijzen in ${stad.naam}` : "Woningmarkt per stad",
    omschrijving: stad
      ? `Actuele prijsontwikkeling en overbiedpercentage in ${stad.naam}, per kwartaal, uit onze Marktupdates.`
      : "Prijsontwikkeling per stad, gebaseerd op onze Marktupdates.",
  });
}
