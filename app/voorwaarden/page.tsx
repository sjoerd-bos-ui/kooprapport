import type { Metadata } from "next";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/ui/Container";
import { RAPPORT_PRIJS } from "@/lib/utils/prijs";

// -----------------------------------------------------------------------------
// Algemene voorwaarden — zelfde opzet/SEO-behandeling als app/privacy/page.tsx
// (statische pagina, altijd identiek voor iedereen, dus eigen
// generateMetadata + canonical, gewoon indexeerbaar, semantische h1/h2,
// opgenomen in app/sitemap.ts). Zie OVERDRACHT-kooprapport.md, "SEO-beleid".
//
// Inhoud is net als bij de privacyverklaring feitelijk opgebouwd uit wat de
// app daadwerkelijk doet (betaalflow in lib/payments/*, PaywallModal.tsx,
// app/api/rapport/premium/route.ts, RAPPORT_PRIJS) — geen generieke,
// losstaande juridische tekst. Identiteitsgegevens zijn dezelfde als op de
// privacypagina (door de gebruiker aangeleverd): Kooprapport, KvK 87451387,
// Pleinweg 66D, 3083 EH Rotterdam, info@kooprapport.nl.
//
// Artikel 7 (herroepingsrecht) beschrijft de wettelijke uitzondering voor
// direct geleverde digitale inhoud (art. 6:230p BW). Die uitzondering wordt
// nu ook daadwerkelijk afgedwongen in de bestelflow zelf, niet alleen hier
// beschreven: PaywallModal.tsx heeft een verplichte checkbox die de klant
// vóór het betalen moet aanvinken (zie de toelichting daar).
// -----------------------------------------------------------------------------

const CANONICAL_PATH = "/voorwaarden";
const LAATST_BIJGEWERKT = "18 juli 2026";

export const metadata: Metadata = {
  title: "Algemene voorwaarden",
  description:
    "De algemene voorwaarden van Kooprapport: hoe een bestelling tot stand komt, wat u krijgt, het herroepingsrecht bij digitale rapporten en onze aansprakelijkheid.",
  alternates: { canonical: CANONICAL_PATH },
  robots: { index: true, follow: true },
};

function Artikel({ id, titel, children }: { id: string; titel: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-ink/10 pt-8">
      <h2 className="font-display text-xl font-bold text-ink">{titel}</h2>
      <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-ink/65">{children}</div>
    </section>
  );
}

export default function VoorwaardenPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Container width="narrow" className="py-14 sm:py-20">
          <p className="text-[11px] font-bold uppercase tracking-wider3 text-accent">Voorwaarden</p>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-ink sm:text-4xl">Algemene voorwaarden</h1>
          <p className="mt-3 text-sm text-ink/50">Laatst bijgewerkt: {LAATST_BIJGEWERKT}</p>

          <p className="mt-6 text-[14px] leading-relaxed text-ink/65">
            Deze voorwaarden gelden voor elk gebruik van kooprapport.nl en voor elke aankoop van een volledig
            woningrapport. Door een rapport te bestellen gaat u akkoord met deze voorwaarden. Lees ook onze{" "}
            <a href="/privacy" className="text-accent underline underline-offset-2">
              privacyverklaring
            </a>{" "}
            voor hoe we met uw gegevens omgaan.
          </p>

          <div className="mt-10 flex flex-col gap-8">
            <Artikel id="definities" titel="Artikel 1 — Definities">
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong className="font-semibold text-ink">Kooprapport, wij, we:</strong> Kooprapport, KvK
                  87451387, Pleinweg 66D, 3083 EH Rotterdam.
                </li>
                <li>
                  <strong className="font-semibold text-ink">U, klant:</strong> de persoon die kooprapport.nl bezoekt
                  of een rapport bestelt.
                </li>
                <li>
                  <strong className="font-semibold text-ink">Rapport:</strong> het digitale, adresgebonden
                  woningrapport dat Kooprapport samenstelt, bestaand uit een gratis preview en een eenmalig te
                  ontgrendelen volledige versie.
                </li>
              </ul>
            </Artikel>

            <Artikel id="toepasselijkheid" titel="Artikel 2 — Toepasselijkheid">
              <p>
                Deze voorwaarden zijn van toepassing op elk aanbod van Kooprapport en op elke tot stand gekomen
                overeenkomst tussen u en Kooprapport. Afwijkingen gelden alleen als we die vooraf schriftelijk (of per
                e-mail) zijn overeengekomen.
              </p>
            </Artikel>

            <Artikel id="dienst" titel="Artikel 3 — Wat u van ons koopt">
              <p>
                U vult een adres in en krijgt direct, gratis een preview te zien (onder meer bouwjaar, energielabel,
                oppervlakte en een indicatie van het funderingsrisico). Voor {RAPPORT_PRIJS} ontgrendelt u eenmalig
                het volledige rapport voor dat ene adres: waarde-indicatie met bandbreedte, verkopen in de buurt,
                volledige objectgegevens, energieprestatie met duiding, funderingsrisico met lokale context,
                buurtprofiel en een samenvatting met pluspunten en aandachtspunten, plus een downloadbare pdf-versie.
                Er is geen abonnement: u betaalt per adres, alleen voor rapporten die u daadwerkelijk ontgrendelt.
              </p>
            </Artikel>

            <Artikel id="totstandkoming" titel="Artikel 4 — Totstandkoming van de overeenkomst">
              <p>
                De overeenkomst komt tot stand op het moment dat uw betaling is bevestigd. Betalen gebeurt via
                iDEAL, verwerkt door onze betaalprovider Mollie. Zodra de betaling is bevestigd, wordt het volledige
                rapport automatisch en onmiddellijk voor u ontgrendeld — er is geen aparte handmatige
                verwerkingsstap of wachttijd.
              </p>
            </Artikel>

            <Artikel id="prijzen" titel="Artikel 5 — Prijzen en betaling">
              <p>
                Alle vermelde prijzen zijn in euro's en inclusief btw. De actuele prijs staat bij het bestellen
                duidelijk vermeld vóórdat u betaalt. Betalen kan uitsluitend via iDEAL. Kooprapport ontvangt en
                bewaart zelf geen bankgegevens of kaartgegevens: dat verloopt volledig via de beveiligde
                betaalomgeving van Mollie.
              </p>
            </Artikel>

            <Artikel id="levering" titel="Artikel 6 — Levering">
              <p>
                Het rapport is digitale inhoud en wordt direct na bevestigde betaling geleverd: het ontgrendelt
                automatisch in uw browser en is vanaf dat moment ook als pdf te downloaden. Er vindt geen fysieke
                verzending plaats.
              </p>
            </Artikel>

            <Artikel id="herroepingsrecht" titel="Artikel 7 — Herroepingsrecht">
              <p>
                Bij aankopen op afstand heeft u normaal gesproken 14 dagen bedenktijd om de overeenkomst kosteloos te
                herroepen. Voor digitale inhoud die niet op een fysieke drager wordt geleverd, geldt op grond van
                artikel 6:230p Burgerlijk Wetboek een wettelijke uitzondering op dit herroepingsrecht, ZODRA (a) de
                levering is begonnen met uw uitdrukkelijke voorafgaande toestemming, én (b) u heeft erkend dat u
                daarmee uw herroepingsrecht verliest.
              </p>
              <p>
                Omdat het rapport onmiddellijk na betaling wordt geleverd, vervalt uw herroepingsrecht op het moment
                dat de levering (het ontgrendelen van het rapport) begint. Door de bestelling af te ronden en te
                betalen, stemt u ermee in dat de levering direct start en bevestigt u dat u daarmee afstand doet van
                uw herroepingsrecht voor dit specifieke rapport.
              </p>
            </Artikel>

            <Artikel id="inhoud" titel="Artikel 8 — Inhoud en betrouwbaarheid van het rapport">
              <p>
                Kooprapport stelt het rapport samen uit publieke en commerciële bronnen (onder meer Kadaster, RVO/
                EP-Online, CBS, PDOK en Altum AI — zie onze{" "}
                <a href="/privacy" className="text-accent underline underline-offset-2">
                  privacyverklaring
                </a>{" "}
                voor het volledige overzicht). We verzinnen nooit een cijfer: ontbreekt een gegeven bij de bron, dan
                tonen we dat eerlijk als "niet beschikbaar" in plaats van een schatting te presenteren als feit.
              </p>
              <p>
                De geschatte woningwaarde is een modelmatige inschatting (automated valuation model), gebaseerd op
                kenmerken van de woning en vergelijkbare verkopen. Dit is nadrukkelijk{" "}
                <strong className="font-semibold text-ink">geen taxatierapport</strong> en niet geschikt als
                vervanging van een taxatie door een erkend taxateur, bijvoorbeeld voor een hypotheekaanvraag. Het
                funderingsrisico is een indicatie op basis van bouwjaar en bekende bodemclassificatie van het gebied,
                geen funderingsonderzoek van dit specifieke pand.
              </p>
              <p>
                Kooprapport spant zich in om gegevens correct en actueel over te nemen uit de genoemde bronnen, maar
                kan niet garanderen dat elke onderliggende bron te allen tijde foutloos of actueel is.
              </p>
            </Artikel>

            <Artikel id="gebruiksrecht" titel="Artikel 9 — Gebruik van het rapport">
              <p>
                Het rapport is bedoeld voor uw eigen, persoonlijke gebruik, bijvoorbeeld als oriëntatie of
                onderhandelingsbasis bij een woningaankoop. U mag het niet commercieel doorverkopen, herpubliceren of
                op grote schaal verspreiden zonder onze voorafgaande toestemming.
              </p>
            </Artikel>

            <Artikel id="aansprakelijkheid" titel="Artikel 10 — Aansprakelijkheid">
              <p>
                Kooprapport is niet aansprakelijk voor schade die voortvloeit uit het gebruik van het rapport of uit
                beslissingen die u op basis daarvan neemt, behalve in geval van opzet of bewuste roekeloosheid onzerzijds.
                Onze aansprakelijkheid is in alle gevallen beperkt tot het bedrag dat u voor het betreffende rapport
                heeft betaald.
              </p>
            </Artikel>

            <Artikel id="klachten" titel="Artikel 11 — Klachten">
              <p>
                Heeft u een klacht over het rapport of de dienstverlening, neem dan contact op via{" "}
                <a href="mailto:info@kooprapport.nl" className="font-semibold text-ink underline underline-offset-2">
                  info@kooprapport.nl
                </a>
                . We reageren binnen 14 dagen. Komen we er samen niet uit, dan kunt u zich wenden tot de bevoegde
                Nederlandse rechter.
              </p>
            </Artikel>

            <Artikel id="overmacht" titel="Artikel 12 — Overmacht">
              <p>
                Kooprapport is niet gehouden tot nakoming van een verplichting als dat onmogelijk is door een oorzaak
                die niet aan ons te wijten is, waaronder storingen bij de externe bronnen (zoals Kadaster, RVO, CBS,
                PDOK, Altum AI of Mollie) waarvan het rapport en de betaalflow afhankelijk zijn.
              </p>
            </Artikel>

            <Artikel id="wijzigingen" titel="Artikel 13 — Wijzigingen">
              <p>
                We kunnen deze voorwaarden aanpassen. De datum bovenaan deze pagina geeft aan wanneer de voorwaarden
                voor het laatst zijn bijgewerkt. Voor een reeds afgeronde bestelling blijven de voorwaarden gelden
                die golden op het moment van bestellen.
              </p>
            </Artikel>

            <Artikel id="recht" titel="Artikel 14 — Toepasselijk recht">
              <p>
                Op deze voorwaarden en op elke overeenkomst met Kooprapport is Nederlands recht van toepassing.
              </p>
            </Artikel>

            <Artikel id="contact" titel="Artikel 15 — Contactgegevens">
              <p>
                Kooprapport, KvK 87451387, Pleinweg 66D, 3083 EH Rotterdam. Vragen? Mail naar{" "}
                <a href="mailto:info@kooprapport.nl" className="font-semibold text-ink underline underline-offset-2">
                  info@kooprapport.nl
                </a>
                .
              </p>
            </Artikel>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
