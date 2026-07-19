import type { AddressMeta } from "@/types/report";
import { slugify } from "@/lib/utils/slug";

function make(parts: {
  straat: string;
  huisnummer: string;
  huisletter?: string;
  toevoeging?: string;
  postcode: string;
  plaats: string;
}): AddressMeta {
  const { straat, huisnummer, huisletter, toevoeging, postcode, plaats } = parts;
  const huisnummerVolledig = `${huisnummer}${huisletter ?? ""}${toevoeging ? `-${toevoeging}` : ""}`;
  const label = `${straat} ${huisnummerVolledig}, ${plaats}`;
  return {
    straat,
    huisnummer,
    huisletter,
    toevoeging,
    postcode,
    plaats,
    label,
    slug: slugify(label),
  };
}

// -----------------------------------------------------------------------------
// Stand-in voor de BAG-adressenregistratie. In productie vervangen door:
//   - PDOK Locatieserver (suggesties tijdens typen — zie lib/services/
//     addressLookup.ts::searchAddressSuggestions)
//   - BAG Individuele Bevragingen (het exacte, definitieve adres/object —
//     zie lib/services/addressLookup.ts::lookupAddress)
//
// Bevat bewust ook adressen die op hetzelfde huisnummer meerdere BAG-objecten
// hebben (verschillende huisletter óf toevoeging) — zo kan de "meerdere
// mogelijke matches"-status ook echt getoond en getest worden, niet alleen
// het happy path van één-op-één matches.
// -----------------------------------------------------------------------------
export const MOCK_ADDRESSES: AddressMeta[] = [
  make({ straat: "Keizersgracht", huisnummer: "123", postcode: "1015CJ", plaats: "Amsterdam" }),
  make({ straat: "Coolsingel", huisnummer: "42", postcode: "3011AD", plaats: "Rotterdam" }),
  make({ straat: "Neude", huisnummer: "11", postcode: "3512AE", plaats: "Utrecht" }),
  make({ straat: "Noordeinde", huisnummer: "60", postcode: "2514GM", plaats: "Den Haag" }),
  make({ straat: "Stratumseind", huisnummer: "18", postcode: "5611ES", plaats: "Eindhoven" }),

  // Eén pand, drie BAG-objecten (huisletter) — "Prinsengracht 45" zonder
  // letter is een geldig, maar ambigu adres.
  make({ straat: "Prinsengracht", huisnummer: "45", huisletter: "A", postcode: "1015DE", plaats: "Amsterdam" }),
  make({ straat: "Prinsengracht", huisnummer: "45", huisletter: "B", postcode: "1015DE", plaats: "Amsterdam" }),
  make({ straat: "Prinsengracht", huisnummer: "45", huisletter: "C", postcode: "1015DE", plaats: "Amsterdam" }),

  // Eén huisnummer, meerdere objecten via toevoeging i.p.v. huisletter —
  // andere as van dezelfde ambiguïteit, "Van Diemenstraat 100" zonder
  // toevoeging is ook geldig maar ambigu.
  make({ straat: "Van Diemenstraat", huisnummer: "100", toevoeging: "1", postcode: "1013CN", plaats: "Amsterdam" }),
  make({ straat: "Van Diemenstraat", huisnummer: "100", toevoeging: "2", postcode: "1013CN", plaats: "Amsterdam" }),
];
