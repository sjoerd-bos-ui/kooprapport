import type { Metadata } from "next";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/ui/Container";

// -----------------------------------------------------------------------------
// Privacyverklaring — statische pagina, bestaat altijd identiek voor iedereen
// (net als de homepage), dus qua SEO-beleid: eigen generateMetadata met
// canonical, gewoon indexeerbaar (robots: index/follow — dit is geen
// soft-404/lege staat), semantische koppen (h1 één keer, secties als h2), en
// opgenomen in app/sitemap.ts. Zie OVERDRACHT-kooprapport.md, "SEO-beleid,
// altijd aanhouden".
//
// Inhoud is feitelijk opgebouwd uit wat de app daadwerkelijk doet (zelfde
// "nooit iets verzinnen"-principe als de rest van dit project): elke
// dataverwerking hieronder is nagetrokken in de code (adapters in
// lib/data-sources/*, de betaalflow in lib/payments/*, de adres-autocomplete
// in components/address/AddressSearchBar.tsx). De identiteit van de
// verwerkingsverantwoordelijke (bedrijfsnaam "Kooprapport", KvK 87451387,
// Pleinweg 66D, 3083 EH Rotterdam, contact info@kooprapport.nl) is door de
// gebruiker zelf aangeleverd in de chat — dat waren bewust invulbare
// placeholders tot dat moment, nooit iets om zelf te verzinnen. De
// hostingpartij in de bronnentabel (sectie 4) is nog generiek ("onze
// hostingpartij") omdat er nog geen hostingkeuze/live domein is — die naam
// invullen zodra dat bekend is.
//
// Dit is een informatief document, geen juridisch advies — laat een jurist of
// AVG-adviseur hier vóór livegang naar kijken, zeker de aansprakelijkheids-
// en bewaartermijn-passages.
// -----------------------------------------------------------------------------

const CANONICAL_PATH = "/privacy";
const LAATST_BIJGEWERKT = "18 juli 2026";

export const metadata: Metadata = {
  title: "Privacyverklaring",
  description:
    "Lees hoe Kooprapport omgaat met uw gegevens: welke gegevens we verwerken, met welke partijen we adresgegevens delen, en welke rechten u heeft onder de AVG.",
  alternates: { canonical: CANONICAL_PATH },
  robots: { index: true, follow: true },
};

function Sectie({ id, titel, children }: { id: string; titel: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-ink/10 pt-8">
      <h2 className="font-display text-xl font-bold text-ink">{titel}</h2>
      <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-ink/65">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Container width="narrow" className="py-14 sm:py-20">
          <p className="text-[11px] font-bold uppercase tracking-wider3 text-accent">Privacy</p>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-ink sm:text-4xl">Privacyverklaring</h1>
          <p className="mt-3 text-sm text-ink/50">Laatst bijgewerkt: {LAATST_BIJGEWERKT}</p>

          <p className="mt-6 text-[14px] leading-relaxed text-ink/65">
            Deze verklaring legt uit welke gegevens Kooprapport verwerkt wanneer u een adres opzoekt, een gratis
            preview bekijkt of een volledig rapport koopt, met wie die gegevens worden gedeeld en welke rechten u
            daarbij heeft onder de Algemene Verordening Gegevensbescherming (AVG/GDPR). Kooprapport verwerkt zo min
            mogelijk persoonsgegevens: voor het overgrote deel van deze site is dat alleen het adres dat u zelf
            opzoekt, niet uw naam, e-mailadres of betaalgegevens.
          </p>

          <div className="mt-10 flex flex-col gap-8">
            <Sectie id="verantwoordelijke" titel="1. Wie is verantwoordelijk voor uw gegevens">
              <p>
                Kooprapport wordt aangeboden door <strong className="font-semibold text-ink">Kooprapport</strong>,
                ingeschreven bij de Kamer van Koophandel onder nummer{" "}
                <strong className="font-semibold text-ink">87451387</strong>, gevestigd aan de Pleinweg 66D, 3083
                EH Rotterdam. Deze partij is de verwerkingsverantwoordelijke in de zin van de AVG voor de gegevens
                die via kooprapport.nl worden verwerkt.
              </p>
            </Sectie>

            <Sectie id="welke-gegevens" titel="2. Welke gegevens we verwerken, en waarvoor">
              <p>
                <strong className="font-semibold text-ink">Het adres dat u opzoekt.</strong> Wanneer u begint te
                typen in de zoekbalk, stuurt uw browser die zoektekst rechtstreeks naar de adressuggesties-service
                van het Kadaster (PDOK Locatieserver) om suggesties te tonen. Kiest u een adres en vraagt u een
                rapport op, dan wordt dat adres vervolgens server-side gebruikt om de rapportgegevens op te halen bij
                de bronnen genoemd in sectie 4. Een geregistreerd adres kan, afhankelijk van de context, een
                persoonsgegeven zijn (het kan herleiden tot de bewoner); we gebruiken het uitsluitend om het door u
                gevraagde rapport samen te stellen, nooit voor een ander doel, en verkopen het niet door.
              </p>
              <p>
                <strong className="font-semibold text-ink">Technische gegevens.</strong> Zoals elke website
                verwerken de servers die Kooprapport draaien automatisch technische gegevens bij elk bezoek: IP-adres,
                browsertype, tijdstip en opgevraagde pagina's. Dit staat in standaard serverlogs en wordt gebruikt om
                de dienst te laten werken, misbruik te herkennen en storingen op te sporen — niet om u individueel te
                volgen tussen bezoeken.
              </p>
              <p>
                <strong className="font-semibold text-ink">Betaalgegevens.</strong> Wanneer u een rapport ontgrendelt,
                wordt u doorgestuurd naar de beveiligde betaalomgeving van onze betaalprovider Mollie. Uw
                betaalgegevens (bankrekeningnummer, kaartgegevens) worden rechtstreeks door Mollie verwerkt — deze
                komen nooit bij Kooprapport zelf binnen en worden niet door ons opgeslagen. Kooprapport ontvangt van
                Mollie alleen een betalings-ID en de status ("betaald"/"niet betaald") terug, gekoppeld aan een intern
                bestelnummer en het opgezochte adres.
              </p>
              <p>
                Kooprapport vraagt op geen enkel moment om uw naam of e-mailadres: er is geen account, geen
                registratie en geen inlog nodig om een rapport te bekijken of te kopen.
              </p>
            </Sectie>

            <Sectie id="cookies" titel="3. Cookies en vergelijkbare technieken">
              <p>
                Kooprapport plaatst zelf geen tracking-, marketing- of analytics-cookies. Er wordt geen bezoekgedrag
                bijgehouden met bijvoorbeeld Google Analytics of vergelijkbare tools.
              </p>
              <p>
                De "Kaart →"-knop op de rapportpagina is een gewone uitgaande link die Google Maps in een nieuw
                tabblad opent — geen ingesloten kaart op onze eigen pagina. Zolang u op kooprapport.nl blijft, zet
                Google dus geen cookies en ontvangt Google geen gegevens van u; pas als u zelf op die knop klikt en
                naar maps.google.com gaat, geldt daar Google's eigen privacybeleid. Bij het afrekenen wordt u op
                dezelfde manier doorgestuurd naar mollie.com, waar het eigen cookie- en privacybeleid van Mollie
                geldt. Wijzigt dit in de toekomst (bijvoorbeeld door een ingesloten kaart of analytics toe te
                voegen), dan wordt deze verklaring bijgewerkt en waar nodig vooraf om toestemming gevraagd.
              </p>
            </Sectie>

            <Sectie id="delen" titel="4. Met wie we gegevens delen">
              <p>
                Om een rapport samen te stellen wordt het door u opgezochte adres doorgegeven aan de volgende,
                grotendeels publieke bronnen — steeds alleen het adres zelf, nooit uw naam, IP-adres of andere
                persoonlijke identificatie:
              </p>
              <div className="overflow-x-auto rounded-xl border border-ink/10">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-parchment text-[11px] uppercase tracking-wide text-ink/50">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Partij</th>
                      <th className="px-4 py-2.5 font-semibold">Wat ze ontvangen</th>
                      <th className="px-4 py-2.5 font-semibold">Waarvoor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10">
                    <tr>
                      <td className="px-4 py-2.5 font-medium text-ink">Kadaster (BAG, Kadastrale Kaart)</td>
                      <td className="px-4 py-2.5 text-ink/65">Adres/coördinaat</td>
                      <td className="px-4 py-2.5 text-ink/65">Objectgegevens, kavelgrootte, bestemming</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-medium text-ink">RVO / EP-Online</td>
                      <td className="px-4 py-2.5 text-ink/65">Adres</td>
                      <td className="px-4 py-2.5 text-ink/65">Energielabel</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-medium text-ink">CBS (open data)</td>
                      <td className="px-4 py-2.5 text-ink/65">Buurtcode</td>
                      <td className="px-4 py-2.5 text-ink/65">Geaggregeerde buurt-/wijkcijfers</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-medium text-ink">PDOK (Locatieserver)</td>
                      <td className="px-4 py-2.5 text-ink/65">Getypte zoektekst, adres</td>
                      <td className="px-4 py-2.5 text-ink/65">Adressuggesties, coördinaat-opzoeking</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-medium text-ink">
                        Informatiehuis Ruimte / DSO-LV (Ruimtelijke Plannen, Omgevingsplan)
                      </td>
                      <td className="px-4 py-2.5 text-ink/65">Coördinaat</td>
                      <td className="px-4 py-2.5 text-ink/65">Bestemmingsgegevens</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-medium text-ink">Altum AI</td>
                      <td className="px-4 py-2.5 text-ink/65">Adres/kenmerken van de woning</td>
                      <td className="px-4 py-2.5 text-ink/65">
                        Geschatte woningwaarde (model) en vergelijkbare buurtverkopen
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-medium text-ink">Mollie</td>
                      <td className="px-4 py-2.5 text-ink/65">Bedrag, bestelnummer, uw betaalgegevens</td>
                      <td className="px-4 py-2.5 text-ink/65">Verwerken van de betaling</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-medium text-ink">Onze hostingpartij</td>
                      <td className="px-4 py-2.5 text-ink/65">Technische verkeersgegevens (o.a. IP-adres)</td>
                      <td className="px-4 py-2.5 text-ink/65">Hosten en beschikbaar houden van de website</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                De meeste van deze partijen zijn (semi-)publieke, overheids-open-databronnen die alleen het opgezochte
                adres ontvangen — geen gegevens die tot u persoonlijk herleiden. We verkopen geen gegevens door aan
                adverteerders, hypotheekadviseurs of andere commerciële derden.
              </p>
            </Sectie>

            <Sectie id="bewaartermijn" titel="5. Hoe lang we gegevens bewaren">
              <p>
                Bestelgegevens (bestelnummer, bedrag, betaalstatus, gekoppeld adres) bewaren we niet langer dan nodig
                is om de aankoop af te handelen en desgevraagd te kunnen aantonen. Op grond van de Nederlandse
                fiscale bewaarplicht kunnen we (of onze boekhouding) verplicht zijn financiële transactiegegevens tot
                7 jaar te bewaren; dit loopt via de reguliere boekhouding, niet via een aparte database met uw
                persoonsgegevens. Technische serverlogs worden na een beperkte periode automatisch opgeschoond.
              </p>
            </Sectie>

            <Sectie id="beveiliging" titel="6. Hoe we uw gegevens beveiligen">
              <p>
                Verbindingen met deze website verlopen versleuteld (HTTPS). Sleutels voor de externe bronnen die
                Kooprapport gebruikt (Kadaster, EP-Online, Altum AI, Mollie) worden uitsluitend server-side gebruikt
                en komen nooit in de broncode van uw browser terecht. Betaalgegevens worden, zoals hierboven
                beschreven, nooit door Kooprapport zelf verwerkt of opgeslagen, maar direct door Mollie in hun eigen
                beveiligde omgeving.
              </p>
            </Sectie>

            <Sectie id="rechten" titel="7. Uw rechten">
              <p>Onder de AVG heeft u het recht om:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>inzage te vragen in de gegevens die over u zijn verwerkt;</li>
                <li>onjuiste gegevens te laten corrigeren;</li>
                <li>uw gegevens te laten verwijderen, voor zover er geen wettelijke bewaarplicht op rust;</li>
                <li>de verwerking van uw gegevens te laten beperken;</li>
                <li>bezwaar te maken tegen de verwerking;</li>
                <li>uw gegevens in een overdraagbaar formaat te ontvangen (dataportabiliteit).</li>
              </ul>
              <p>
                U kunt hiervoor contact opnemen via de gegevens in sectie 10. We reageren binnen de wettelijke
                termijn van vier weken.
              </p>
            </Sectie>

            <Sectie id="minderjarigen" titel="8. Minderjarigen">
              <p>
                Kooprapport richt zich niet specifiek op personen jonger dan 16 jaar en verzamelt niet bewust
                gegevens van minderjarigen.
              </p>
            </Sectie>

            <Sectie id="wijzigingen" titel="9. Wijzigingen in deze verklaring">
              <p>
                We kunnen deze verklaring aanpassen, bijvoorbeeld wanneer er een nieuwe gegevensbron of functionaliteit
                bijkomt. De datum bovenaan deze pagina geeft aan wanneer de verklaring voor het laatst is bijgewerkt.
                Bij een wezenlijke wijziging plaatsen we hier een duidelijke melding.
              </p>
            </Sectie>

            <Sectie id="contact" titel="10. Contact en klachten">
              <p>
                Vragen over deze verklaring of over hoe Kooprapport met uw gegevens omgaat? Neem contact op via{" "}
                <a href="mailto:info@kooprapport.nl" className="font-semibold text-ink underline underline-offset-2">
                  info@kooprapport.nl
                </a>
                . U heeft ook altijd het recht om een klacht in te dienen bij de Nederlandse toezichthouder, de{" "}
                <a
                  href="https://autoriteitpersoonsgegevens.nl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline underline-offset-2"
                >
                  Autoriteit Persoonsgegevens
                </a>
                .
              </p>
            </Sectie>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
