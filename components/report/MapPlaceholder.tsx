import type { AddressMeta } from "@/types/report";

// Let op: dit component wordt momenteel nergens gerenderd (de live
// locatiekaart-link zit in ReportHero.tsx) — hier wel bijgewerkt voor
// consistentie, mocht dit alsnog ingezet worden.
//
// Echte kaart via een Google Maps-embed op basis van het adres (geen
// coördinaten nodig, geen API-sleutel, geen kosten): de "q="-embed-URL laat
// Google zelf het adres geocoderen. Zolang address (straat/huisnummer/
// postcode/plaats) klopt, toont dit een kloppende, interactieve kaart met
// pin — geen gok, geen losse coördinaten die uit de pas kunnen lopen met het
// adres. Bij een lege/onvolledige address-string kan het embed geen locatie
// vinden en toont het simpelweg zijn eigen "kon geen resultaten vinden".
//
// lonLat (optioneel, zie PropertyCore.lonLat): geeft, indien aanwezig, een
// preciezer adrespunt dan Google's eigen adrestekst-geocodering — zelfde
// bron/redenering als de "Kaart →"-link in ReportHero.tsx.
export default function MapPlaceholder({
  address,
  lonLat,
}: {
  address: AddressMeta;
  lonLat?: { lon: number; lat: number } | null;
}) {
  const adresRegel = `${address.straat} ${address.huisnummer}${address.huisletter ?? ""}${
    address.toevoeging ? `-${address.toevoeging}` : ""
  }, ${address.postcode} ${address.plaats}`;
  const src = lonLat
    ? `https://www.google.com/maps?q=${lonLat.lat},${lonLat.lon}&output=embed`
    : `https://www.google.com/maps?q=${encodeURIComponent(adresRegel)}&output=embed`;

  return (
    <div className="relative mt-8 overflow-hidden rounded-2xl border border-ink/10 bg-mist">
      <span className="absolute left-5 top-5 z-10 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-ink/70 shadow-flat">
        Locatie
      </span>
      <div className="h-52 w-full sm:h-72">
        <iframe
          title={`Kaart van ${adresRegel}`}
          src={src}
          className="h-full w-full border-0 grayscale-[20%] contrast-[1.05]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}
