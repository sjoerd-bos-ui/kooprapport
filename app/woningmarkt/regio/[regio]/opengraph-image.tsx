import { ogImageContentType, ogImageSize, renderOgImage } from "@/lib/og/ogTemplate";
import { getRegioByWeergaveSlug, regioWeergaveNaam } from "@/lib/content/woningmarktRegios";

export const alt = "Huizenprijzen per regio · Kooprapport";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function Image({ params }: { params: Promise<{ regio: string }> }) {
  const { regio: slug } = await params;
  const regio = getRegioByWeergaveSlug(slug);
  const naam = regio ? regioWeergaveNaam(regio.regio) : null;
  return renderOgImage({
    kicker: "Woningmarkt per regio",
    titel: naam ? `Huizenprijzen in ${naam}` : "Woningmarkt per regio",
    omschrijving: regio
      ? `Overbieden en prijsverschil in ${naam}, uit het NVM Marktoverzicht ${regio.periodeLabel}.`
      : "Prijsontwikkeling per regio, gebaseerd op NVM-cijfers.",
  });
}
