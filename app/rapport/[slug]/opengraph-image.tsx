import { ogImageContentType, ogImageSize, renderOgImage } from "@/lib/og/ogTemplate";

export const alt = "Woningrapport · Kooprapport";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const adres = slug
    .split("-")
    .filter(Boolean)
    .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
    .join(" ");
  return renderOgImage({
    kicker: "Woningrapport",
    titel: adres || "Woningrapport",
    omschrijving: "Waarde-indicatie, buurtverkopen, energielabel, funderingsrisico en buurtprofiel per adres.",
  });
}
