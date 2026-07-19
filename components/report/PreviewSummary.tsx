"use client";

import { useEffect, useState } from "react";
import { CheckIcon, LockIcon } from "./icons";
import { RAPPORT_PRIJS } from "@/lib/utils/prijs";

// 20 voorbeeldreacties — fictieve voornaam + plaats. Bewust geen achternamen,
// foto's of sterrenscores (dat zou nog meer op een geverifieerde review
// lijken). Er staat één "Voorbeeldreacties"-label boven de hele sectie
// (i.p.v. per quote een badge naast de naam) — zo blijft voor bezoekers
// duidelijk dat dit illustratieve reacties zijn en geen geverifieerde
// klantreviews, zonder dat elke quote een eigen disclaimer nodig heeft.
// Nepreviews die wél als geverifieerd overkomen zijn in Nederland/EU
// verboden onder de regels tegen oneerlijke handelspraktijken — dat is de
// reden dat dit label niet helemaal verdwijnt.
const VOORBEELDSITUATIES = [
  { naam: "Sanne", plaats: "Rotterdam", tekst: "Binnen een minuut had ik een helder beeld van de woning. Vooral de waarde-indicatie en buurtverkopen gaven veel vertrouwen." },
  { naam: "Mark", plaats: "Utrecht", tekst: "Super overzichtelijk rapport. Alles stond netjes bij elkaar, van objectgegevens tot energielabel." },
  { naam: "Laura", plaats: "Den Haag", tekst: "Dit voelde echt als een premium rapport. De PDF is strak en professioneel opgemaakt." },
  { naam: "Tom", plaats: "Haarlem", tekst: "De vergelijking met woningen in de buurt maakte mijn beslissing een stuk makkelijker." },
  { naam: "Fatima", plaats: "Rotterdam", tekst: "Fijn dat je niet zelf alles hoeft uit te zoeken. Alles zat in één rapport." },
  { naam: "Daan", plaats: "Amsterdam", tekst: "De waarde-indicatie gaf precies de context die ik miste bij andere woningwebsites." },
  { naam: "Nina", plaats: "Breda", tekst: "Heel compleet en toch makkelijk te lezen. Vooral de combinatie van data en advies is sterk." },
  { naam: "Kevin", plaats: "Leiden", tekst: "De rapportopmaak is echt mooi. Je ziet meteen dat dit meer is dan een standaard woningcheck." },
  { naam: "Emma", plaats: "Amersfoort", tekst: "Ik vond vooral het deel over funderingsrisico en advies heel waardevol." },
  { naam: "Joris", plaats: "Delft", tekst: "Direct beschikbaar en meteen bruikbaar. Precies wat je wilt als je een woning bekijkt." },
  { naam: "Anouk", plaats: "Eindhoven", tekst: "De buurtanalyse gaf extra zekerheid. Het rapport voelt goed onderbouwd." },
  { naam: "Bram", plaats: "Nijmegen", tekst: "Heel handig dat je niet alleen data krijgt, maar ook een duidelijke samenvatting." },
  { naam: "Sophie", plaats: "Groningen", tekst: "Dit rapport geeft rust. Alles wat je nodig hebt staat in één overzicht." },
  { naam: "Ruben", plaats: "Tilburg", tekst: "De PDF ziet er professioneel uit en is handig om terug te lezen of te delen." },
  { naam: "Lisa", plaats: "Zwolle", tekst: "Ik had veel losse informatie verwacht, maar het is juist heel netjes en logisch opgebouwd." },
  { naam: "Hugo", plaats: "Rotterdam", tekst: "Voor mij was vooral de combinatie van objectgegevens en buurtverkopen doorslaggevend." },
  { naam: "Chantal", plaats: "Maastricht", tekst: "De opmaak en inhoud voelen premium aan. Dit is echt een stap verder dan standaard woninginformatie." },
  { naam: "Mees", plaats: "Almere", tekst: "Snel, duidelijk en compleet. Vooral fijn als je meerdere woningen met elkaar vergelijkt." },
  { naam: "Judith", plaats: "Dordrecht", tekst: "De inzichten zijn concreet en helpen echt bij het maken van een keuze." },
  { naam: "Timo", plaats: "Utrecht", tekst: "Het rapport geeft precies die extra zekerheid die je zoekt voordat je verder gaat met een woning." },
] as const;

// Onderste helft van het gecombineerde hero+tabel-paneel (zie ReportHero.tsx
// en ReportView.tsx — beide delen samen één buitenrand/afronding, dit
// component heeft zelf dus geen eigen kaart/marge meer, alleen een
// bovenrand als scheidingslijn met de hero erboven).
//
// Geen los teaserblok/vertrouwensblok/tweede CTA meer eronder (die
// herhaalden alleen wat deze tabel al zegt) — de prijs staat nu gewoon in
// de knop zelf, met één dunne vertrouwensregel eronder.
//
// BELANGRIJK: geschatte woningwaarde en buurtverkopen staan bewust als "—"
// bij gratis, nooit als placeholder-cijfer in de tabel zelf — vóór
// ontgrendelen is er nog geen Altum-aanroep gedaan (kostenbeheersing, zie
// ReportView/reportService).
//
// De 7 rijen gebruiken exact dezelfde namen als de tabbladen/secties in het
// ontgrendelde rapport (ReportView.tsx: Rapportoverzicht, Waarde-indicatie,
// Verkopen in de buurt, Objectgegevens, Energieprestatie en label,
// Funderingsrisico, Buurtprofiel) — "1 lijn" in naamgeving, i.p.v. dat de
// tabel het anders noemt dan het rapport zelf. "Verkopen in de buurt" en
// "Buurtprofiel" waren voorheen samengevoegd in één rij ("Buurtverkopen en
// -profiel"), maar zijn twee losse brondata-onderdelen (buurtverkopen.ts vs.
// buurtprofiel.ts) — nu ook als twee losse rijen.
//
// Het "inkijkje" (tabbladpillen + geblurde waarde-tegel) staat in een eigen
// indigo-tint kader, los van de neutrale witte vergelijkingstabel eronder —
// bewust met echte ruimte ertussen i.p.v. gedeelde randen/dividers, zodat
// meteen duidelijk is dat dit twee verschillende dingen zijn: een kijkje in
// de echte interface, en daaronder de gratis/premium-vergelijking.
//
// De geblurde waarde-tegel toont uitdrukkelijk een VOORBEELDBEREIK (expliciet
// gelabeld als "voorbeeld"), geen schatting voor dit specifieke pand — dat
// cijfer bestaat pas na ontgrendelen. Zelfde onderscheid als het bestaande
// "mockdata ter illustratie"-label elders in de app.

function VergelijkRij({
  label,
  gratis,
  zebra,
}: {
  label: string;
  gratis: { type: "check" | "tekst"; tekst: string };
  zebra: boolean;
}) {
  return (
    <div
      className="grid grid-cols-[1.7fr_0.65fr_0.9fr] items-center px-4 py-2.5"
      style={{ backgroundColor: zebra ? "#F9F9FC" : "#FFFFFF" }}
    >
      <span className="text-[12.5px] text-ink">{label}</span>
      <span className="flex items-center justify-center">
        {gratis.type === "check" ? (
          <CheckIcon className="h-3.5 w-3.5 text-[#0F766E]" />
        ) : (
          <span className="text-[11px] text-ink/40">{gratis.tekst}</span>
        )}
      </span>
      <span className="flex items-center justify-center bg-mist">
        <CheckIcon className="h-3.5 w-3.5 text-accent" />
      </span>
    </div>
  );
}

export default function PreviewSummary({ onUnlockClick }: { onUnlockClick: () => void }) {
  // Eén willekeurige situatie per keer dat de pagina laadt — geen "volgende"-
  // knop meer, dus geen doorklikbare carousel.
  //
  // BELANGRIJK (SEO-fix, hydratie): Math.random() direct in de useState-
  // initializer koos vroeger op de server EN bij het hydrateren in de
  // browser allebei opnieuw een index — met andere uitkomsten, want
  // Math.random() deelt geen state tussen die twee losse uitvoeringen. Zolang
  // deze pagina alleen ooit client-side rendere (vóór de SEO-fix in
  // app/rapport/[slug]/page.tsx) viel dat nooit op. Nu het rapport ook
  // server-side wordt opgebouwd, gaf dat een React-hydratiefout (server- en
  // client-HTML kwamen niet overeen) — React herstelt zich daar zelf van,
  // maar met een layoutflits en een overbodige volledige re-render. Fix:
  // altijd starten met index 0 (identiek op server en client, geen mismatch
  // mogelijk) en pas ná het mounten (dus alleen in de browser) alsnog
  // willekeurig kiezen — de variatie blijft dus bestaan, alleen niet meer
  // als eerste geverfde inhoud.
  const [situatieIndex, setSituatieIndex] = useState(0);
  useEffect(() => {
    setSituatieIndex(Math.floor(Math.random() * VOORBEELDSITUATIES.length));
  }, []);
  const situatie = VOORBEELDSITUATIES[situatieIndex];

  return (
    <div className="border-t border-ink/10 bg-white px-5 py-5 sm:px-6 sm:py-6">
      {/* Inkijkje — eigen indigo-tint kader, duidelijk gescheiden van de
          tabel eronder (geen gedeelde randen/dividers, wel echte ruimte). */}
      <div className="rounded-2xl border border-[#DADCF9] bg-mist p-4">
        <p className="mb-2.5 px-0.5 text-[9.5px] font-bold uppercase tracking-wide text-accent">
          Zo ziet het volledige rapport eruit
        </p>
        {/* Decoratieve tabbladpillen — mimicken de echte ReportTabs-indeling
            van het ontgrendelde rapport (niet klikbaar, puur ter illustratie
            dat het rapport zo is opgedeeld). */}
        <div className="flex gap-1.5 overflow-x-auto">
          <span className="whitespace-nowrap rounded-xl px-3 py-1.5 text-[10.5px] font-medium text-accent/60">
            Rapportoverzicht
          </span>
          <span className="whitespace-nowrap rounded-xl bg-accent px-3 py-1.5 text-[10.5px] font-semibold text-white">
            Waarde-indicatie
          </span>
          <span className="whitespace-nowrap rounded-xl px-3 py-1.5 text-[10.5px] font-medium text-accent/60">
            Verkopen in de buurt
          </span>
          <span className="whitespace-nowrap rounded-xl px-3 py-1.5 text-[10.5px] font-medium text-accent/60">
            Objectgegevens
          </span>
          <span className="whitespace-nowrap rounded-xl px-3 py-1.5 text-[10.5px] font-medium text-accent/60">
            Energieprestatie en label
          </span>
          <span className="whitespace-nowrap rounded-xl px-3 py-1.5 text-[10.5px] font-medium text-accent/60">
            Funderingsrisico
          </span>
          <span className="whitespace-nowrap rounded-xl px-3 py-1.5 text-[10.5px] font-medium text-accent/60">
            Buurtprofiel
          </span>
        </div>

        {/* Geblurde waarde-tegel onder de "Waarde"-tab — expliciet een
            VOORBEELDBEREIK, niet de schatting voor dit pand (die bestaat pas
            na ontgrendelen). De blur + het label maken dat ondubbelzinnig. */}
        <div className="mt-2.5 flex items-center justify-between gap-3 rounded-xl bg-white p-3.5">
          <div>
            <p className="text-[9.5px] font-semibold uppercase tracking-wide text-accent">Voorbeeld</p>
            <p className="mt-1 select-none text-lg font-extrabold text-ink" style={{ filter: "blur(5px)" }}>
              € 3XX.000 – € 4XX.000
            </p>
          </div>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mist text-accent">
            <LockIcon className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>

      {/* "Wat u ontgrendelt" — het eigenlijke verkoopblok, duidelijk apart van
          het inkijkje hierboven (dat toont de interface; dit verkoopt de
          inhoud). Mini-omslagkaartje geeft het tastbare gevoel van een echt,
          verzorgd PDF-document; de checklist noemt alle 8 onderdelen + de
          PDF, i.p.v. 3 losse iconen die op het rapport zelf leken. Eén grote
          knop direct hieronder — dit is de enige plek waar we vragen om te
          ontgrendelen, i.p.v. verspreid over meerdere knoppen. */}
      <div id="ontgrendel" className="relative mt-5 rounded-2xl border border-[#E2E1F7] bg-gradient-to-b from-[#FBFBFF] to-[#F3F3FC] p-5 pt-6">
        <span className="absolute -top-2.5 left-5 rounded-full bg-accent-dark px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          Wat u ontgrendelt
        </span>

        <div className="flex flex-wrap items-start gap-4">
          <div className="w-[92px] shrink-0 overflow-hidden rounded-xl shadow-lg">
            <div className="bg-gradient-to-br from-accent to-accent-dark p-2">
              <p className="text-[4.5px] font-bold text-white/70">PREMIUM KOOPRAPPORT</p>
              <p className="mt-1 text-[8px] font-extrabold text-white">Prinsengracht 88</p>
            </div>
            <div className="bg-white p-2 text-[5.5px] leading-[1.7] text-ink/45">
              8 pagina&apos;s
              <br />
              PDF incl.
              <br />
              Direct beschikbaar
            </div>
          </div>

          <div className="grid flex-1 grid-cols-1 gap-x-4 gap-y-1.5 sm:min-w-[220px] sm:grid-cols-2">
            {[
              "Rapportoverzicht",
              "Waarde-indicatie",
              "Verkopen in de buurt",
              "Objectgegevens",
              "Energieprestatie en label",
              "Funderingsrisico + advies",
              "Buurtprofiel",
              "Samenvatting",
              "Downloadbare PDF",
            ].map((item) => (
              <span key={item} className="flex items-center gap-1.5 text-[12px] text-ink">
                <CheckIcon className="h-3 w-3 shrink-0 text-[#0F766E]" />
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Eén willekeurige voorbeeldreactie per paginabezoek — geen
            doorklikbare knop. "Voorbeeldreacties" staat één keer boven de
            kaart i.p.v. een badge per quote/naam: houdt de kaart zelf
            aantrekkelijk terwijl de sectie als geheel toch duidelijk
            gelabeld blijft (geen ongelabelde nepreviews). Groot decoratief
            aanhalingsteken + initiaal-avatar i.p.v. een platte tekstregel. */}
        <div className="mt-4 border-t border-[#E2E1F7] pt-3.5">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-ink/35">Voorbeeldreacties</p>
          <div className="relative mt-2 overflow-hidden rounded-xl bg-white p-4">
            <span className="pointer-events-none absolute left-2.5 top-0 select-none font-serif text-6xl font-bold leading-none text-mist">
              &ldquo;
            </span>
            <p className="relative ml-1 text-[13px] italic leading-relaxed text-ink">{situatie.tekst}</p>
            <div className="mt-3 flex items-center gap-2.5">
              <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8B85EE] to-accent text-[11px] font-extrabold text-white">
                {situatie.naam.charAt(0)}
              </span>
              <span className="text-[11.5px]">
                <span className="font-bold text-ink">{situatie.naam}</span>{" "}
                <span className="text-ink/45">uit {situatie.plaats}</span>
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onUnlockClick}
          className="mt-4 w-full rounded-xl bg-[#D97706] py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#B45309]"
        >
          Ontgrendel nu voor {RAPPORT_PRIJS}
        </button>
        <p className="mt-2 text-center text-[10px] text-ink/40">Eenmalig · geen abonnement · veilig via iDEAL</p>
      </div>

      {/* De uitgebreide vergelijkingstabel staat nu ingeklapt achter een
          <details> i.p.v. altijd volledig getoond — voor wie de details per
          onderdeel wil zien, zonder dat het de pagina drukker maakt voor wie
          dat niet wil. */}
      <details className="group mt-4">
        <summary className="cursor-pointer list-none text-center text-[11.5px] font-bold text-accent [&::-webkit-details-marker]:hidden">
          Bekijk volledige vergelijking gratis vs. premium
          <span className="ml-1 inline-block transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="mt-3 overflow-hidden rounded-xl border border-ink/10">
          <div className="grid grid-cols-[1.7fr_0.65fr_0.9fr] bg-white px-4 py-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink/40">Gratis versus premium</span>
            <span className="text-center text-[10px] font-bold uppercase tracking-wide text-ink/40">Gratis</span>
            <span className="text-center text-[10px] font-bold uppercase tracking-wide text-accent">Premium</span>
          </div>
          <VergelijkRij label="Rapportoverzicht" gratis={{ type: "tekst", tekst: "basis" }} zebra />
          <VergelijkRij label="Waarde-indicatie" gratis={{ type: "tekst", tekst: "Nee" }} zebra={false} />
          <VergelijkRij label="Verkopen in de buurt" gratis={{ type: "tekst", tekst: "Nee" }} zebra />
          <VergelijkRij label="Objectgegevens" gratis={{ type: "check", tekst: "" }} zebra={false} />
          <VergelijkRij label="Energieprestatie en label" gratis={{ type: "check", tekst: "" }} zebra />
          <VergelijkRij label="Funderingsrisico" gratis={{ type: "tekst", tekst: "indicatie" }} zebra={false} />
          <VergelijkRij label="Buurtprofiel" gratis={{ type: "tekst", tekst: "Nee" }} zebra />
        </div>
      </details>

      <p className="mt-3 text-center text-[10.5px] text-ink/40">
        Bronnen: BAG, RVO, Altum AI, Kadaster
      </p>
    </div>
  );
}
