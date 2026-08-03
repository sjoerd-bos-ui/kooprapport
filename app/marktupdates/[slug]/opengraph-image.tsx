import { ogImageContentType, ogImageSize, renderOgImage } from "@/lib/og/ogTemplate";
import { getMarktupdateBySlug } from "@/lib/content/marktupdates";

export const alt = "Marktupdate · Kooprapport";
export const size = ogImageSize;
export const contentType = ogImageContentType;

// Eén afbeelding per kwartaalupdate i.p.v. de vorige, site-brede
// standaardkaart -- zelfde reden als bij Koopgids-artikelen (zie
// app/koopgids/[slug]/opengraph-image.tsx).
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const update = getMarktupdateBySlug(slug);
  return renderOgImage({
    kicker: update ? `Marktupdate · ${update.periodeLabel}` : "Marktupdates",
    titel: update?.titel ?? "De woningmarkt in cijfers, elk kwartaal opnieuw",
    omschrijving: update?.samenvatting ?? "Gebaseerd op de nieuwste cijfers van NVM, Kadaster en CBS.",
  });
}
