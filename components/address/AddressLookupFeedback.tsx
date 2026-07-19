import Link from "next/link";
import type { AddressLookupResult } from "@/lib/services/addressLookup";
import { huisnummerVolledig } from "@/lib/services/addressLookup";
import { buildReportHref } from "@/lib/utils/slug";
import StatusChip from "@/components/report/StatusChip";
import { InfoIcon, MapPinIcon } from "@/components/report/icons";

// Toont de vier niet-"match"-statussen van lookupAddress consistent, zowel
// inline onder de zoekbalk als op de volledige rapportpagina (bv. bij een
// handmatig aangepaste of onvolledige URL). Bewust GEEN component voor
// "match" — die navigeert direct door, er is niets te tonen.
export default function AddressLookupFeedback({
  result,
  variant = "inline",
}: {
  result: AddressLookupResult;
  variant?: "inline" | "page";
}) {
  const wrapClass =
    variant === "page"
      ? "mx-auto mt-20 max-w-lg rounded-2xl border border-ink/10 bg-paper p-10 text-center"
      : "mt-4 rounded-2xl border border-ink/10 bg-paper p-5 text-sm";

  const backLink =
    variant === "page" ? (
      <Link href="/" className="mt-6 inline-block text-sm text-ink underline underline-offset-4 hover:text-accent">
        ← Terug naar de homepage
      </Link>
    ) : null;

  if (result.status === "multiple" && result.candidates) {
    return (
      <div className={wrapClass}>
        <StatusChip toon="aandacht" icon={<InfoIcon className="h-3 w-3" />}>
          Meerdere adressen
        </StatusChip>
        <p className="mt-3 font-display text-xl font-bold text-ink">Er zijn meerdere adressen gevonden</p>
        <p className="mt-2 text-sm text-ink/55">
          Dit huisnummer komt op dit adres meerdere keren voor in de adresregistratie. Kies het juiste object:
        </p>
        <ul className="mt-5 space-y-2 text-left">
          {result.candidates.map((c) => (
            <li key={c.slug}>
              <Link
                href={buildReportHref(c)}
                className="flex items-center gap-2.5 rounded-xl border border-ink/10 px-4 py-2.5 text-sm text-ink transition-colors hover:border-accent hover:bg-[#EEF0FF]"
              >
                <MapPinIcon className="h-4 w-4 shrink-0 text-accent" />
                <span>
                  <span className="font-medium">
                    {c.straat} {huisnummerVolledig(c)}
                  </span>
                  <span className="text-ink/45">
                    {" "}
                    · {c.postcode} {c.plaats}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {backLink}
      </div>
    );
  }

  if (result.status === "no-match") {
    return (
      <div className={wrapClass}>
        <StatusChip toon="risico" icon={<InfoIcon className="h-3 w-3" />}>
          Geen match
        </StatusChip>
        <p className="mt-3 font-display text-xl font-bold text-ink">Geen adres gevonden</p>
        <p className="mt-2 text-sm text-ink/55">
          Dit adres komt niet voor in de adresregistratie. Controleer de postcode, het huisnummer en de plaats.
          Er wordt bewust geen vergelijkbaar adres gesuggereerd.
        </p>
        {backLink}
      </div>
    );
  }

  if (result.status === "invalid") {
    return (
      <div className={wrapClass}>
        <StatusChip toon="risico" icon={<InfoIcon className="h-3 w-3" />}>
          Ongeldig
        </StatusChip>
        <p className="mt-3 font-display text-xl font-bold text-ink">Adres niet herkend</p>
        <ul className="mt-3 space-y-1 text-sm text-ink/55">
          {(result.fieldErrors ?? []).map((e) => (
            <li key={e.field}>{e.reason}</li>
          ))}
        </ul>
        {backLink}
      </div>
    );
  }

  // status === "incomplete"
  return (
    <div className={wrapClass}>
      <StatusChip toon="aandacht" icon={<InfoIcon className="h-3 w-3" />}>
        Onvolledig
      </StatusChip>
      <p className="mt-3 font-display text-xl font-bold text-ink">Vul het adres verder aan</p>
      <p className="mt-2 text-sm text-ink/55">
        Vul een postcode met huisnummer in (bv. 1015CJ 123), of een straat, huisnummer en plaats (bv. Keizersgracht
        123, Amsterdam).
      </p>
      {backLink}
    </div>
  );
}
