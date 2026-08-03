import { ogImageContentType, ogImageSize, renderOgImage } from "@/lib/og/ogTemplate";
import { getArtikelBySlug } from "@/lib/content/koopgids";

export const alt = "Koopgids-artikel · Kooprapport";
export const size = ogImageSize;
export const contentType = ogImageContentType;

// Eén afbeelding per artikel i.p.v. de vorige, site-brede standaardkaart --
// laat de echte titel/samenvatting van dit specifieke artikel zien, zodat
// een gedeelde link in WhatsApp/LinkedIn ook echt over dit onderwerp gaat.
// Onbekende slug (zou hier niet moeten voorkomen, generateStaticParams dekt
// alle artikelen): valt terug op de generieke Koopgids-kicker/titel i.p.v.
// een kapotte afbeelding.
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artikel = getArtikelBySlug(slug);
  return renderOgImage({
    kicker: artikel ? `Koopgids · ${artikel.categorie}` : "Koopgids",
    titel: artikel?.titel ?? "Alles wat u moet weten voordat u koopt.",
    omschrijving: artikel?.samenvatting ?? "Uitgelegd op basis van dezelfde officiële bronnen als het rapport zelf.",
  });
}
