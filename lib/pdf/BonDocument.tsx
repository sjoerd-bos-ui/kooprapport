import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import { formatDate } from "@/lib/utils/format";

// -----------------------------------------------------------------------------
// Aankoopbewijs/betalingsbewijs — apart, eigen PDF-document (niet toegevoegd
// aan ReportDocument.tsx), want dit toont GEEN rapportinhoud maar alleen
// betaalgegevens: bestelnummer, datum, adres, bedrag (met BTW-uitsplitsing) en
// betaalmethode. Bedoeld voor de eigen administratie van de klant, niet als
// formeel gefactureerd B2B-document.
//
// EERLIJKHEIDSPRINCIPE: alle waarden hier komen rechtstreeks uit het
// server-side bewaarde Bestelling-record (lib/payments/bestellingen.ts) — nooit
// uit iets dat de klant zelf meestuurt. Zie app/api/rapport/bon/route.ts: het
// bedrag en de betaaldatum die hier verschijnen zijn dus altijd exact wat er
// écht in rekening is gebracht, nooit een clientside-waarde die vervalst zou
// kunnen zijn.
//
// BTW-KANTTEKENING (geen belastingadvies): de vermelde prijs is verondersteld
// inclusief 21% Nederlandse BTW (het standaardtarief), met hier alleen een
// rekenkundige uitsplitsing excl./BTW/incl. Of dat de juiste BTW-behandeling
// is voor precies deze dienst, en of er voor consumentenverkoop een wettelijke
// factuurplicht geldt, is iets voor een boekhouder/fiscalist om te bevestigen
// — dit document is bewust een "aankoopbewijs", geen formeel genummerde
// BTW-factuur met klantnaam/-adres (die gegevens worden hier expliciet NIET
// gevraagd, zie de privacyverklaring).
// -----------------------------------------------------------------------------

Font.registerHyphenationCallback((word) => [word]);

const KLEUR = {
  accent: "#4F46E5",
  accentDark: "#4338CA",
  ink: "#1F1F2E",
  inkMuted: "#6B6B7A",
  inkFaint: "#9797A3",
  parchment: "#F5F5FA",
  paper: "#FFFFFF",
  mist: "#EEF0FF",
  line: "#E4E4EC",
};

const BTW_PERCENTAGE = 21;

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: KLEUR.ink,
    backgroundColor: KLEUR.paper,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 36,
  },
  wordmark: {
    fontSize: 16,
    fontWeight: 700,
    color: KLEUR.ink,
  },
  kicker: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: KLEUR.accent,
    marginBottom: 4,
  },
  titel: {
    fontSize: 20,
    fontWeight: 700,
    color: KLEUR.ink,
  },
  metaBlok: {
    alignItems: "flex-end",
  },
  metaRegel: {
    fontSize: 9,
    color: KLEUR.inkMuted,
    marginBottom: 2,
  },
  kaart: {
    backgroundColor: KLEUR.parchment,
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  },
  rij: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  rijLabel: {
    fontSize: 9,
    color: KLEUR.inkMuted,
  },
  rijWaarde: {
    fontSize: 9,
    fontWeight: 700,
    color: KLEUR.ink,
    textAlign: "right",
  },
  scheidingslijn: {
    borderTopWidth: 1,
    borderTopColor: KLEUR.line,
    marginTop: 4,
    marginBottom: 10,
    paddingTop: 10,
  },
  totaalRij: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totaalLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: KLEUR.ink,
  },
  totaalWaarde: {
    fontSize: 14,
    fontWeight: 700,
    color: KLEUR.accentDark,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: KLEUR.line,
    paddingTop: 12,
  },
  footerTekst: {
    fontSize: 8,
    color: KLEUR.inkFaint,
    lineHeight: 1.5,
  },
});

function euro(centen: number): string {
  return `€ ${(centen / 100).toFixed(2).replace(".", ",")}`;
}

export interface BonDocumentProps {
  bestellingId: string;
  adresLabel: string;
  bedragCenten: number;
  betaaldOp: string;
  betaalmethode: string;
}

export default function BonDocument({ bestellingId, adresLabel, bedragCenten, betaaldOp, betaalmethode }: BonDocumentProps) {
  const inclBtw = bedragCenten;
  const exclBtw = Math.round(bedragCenten / (1 + BTW_PERCENTAGE / 100));
  const btwBedrag = inclBtw - exclBtw;
  // Kort, leesbaar referentienummer i.p.v. de volledige UUID — de eerste 8
  // tekens zijn ruim genoeg om intern (bv. bij een supportvraag) terug te
  // herleiden naar het volledige Bestelling-record, zonder de klant een lange,
  // onleesbare code te tonen.
  const referentie = bestellingId.slice(0, 8).toUpperCase();

  return (
    <Document title={`Aankoopbewijs ${referentie}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>Aankoopbewijs</Text>
            <Text style={styles.titel}>Kooprapport</Text>
          </View>
          <View style={styles.metaBlok}>
            <Text style={styles.metaRegel}>Referentie: {referentie}</Text>
            <Text style={styles.metaRegel}>Datum: {formatDate(betaaldOp)}</Text>
          </View>
        </View>

        <View style={styles.kaart}>
          <View style={styles.rij}>
            <Text style={styles.rijLabel}>Omschrijving</Text>
            <Text style={styles.rijWaarde}>Kooprapport — {adresLabel}</Text>
          </View>
          <View style={styles.rij}>
            <Text style={styles.rijLabel}>Betaalmethode</Text>
            <Text style={styles.rijWaarde}>{betaalmethode}</Text>
          </View>
          <View style={styles.rij}>
            <Text style={styles.rijLabel}>Status</Text>
            <Text style={styles.rijWaarde}>Betaald</Text>
          </View>

          <View style={styles.scheidingslijn}>
            <View style={styles.rij}>
              <Text style={styles.rijLabel}>Bedrag excl. BTW</Text>
              <Text style={styles.rijWaarde}>{euro(exclBtw)}</Text>
            </View>
            <View style={styles.rij}>
              <Text style={styles.rijLabel}>BTW ({BTW_PERCENTAGE}%)</Text>
              <Text style={styles.rijWaarde}>{euro(btwBedrag)}</Text>
            </View>
          </View>

          <View style={styles.totaalRij}>
            <Text style={styles.totaalLabel}>Totaal betaald</Text>
            <Text style={styles.totaalWaarde}>{euro(inclBtw)}</Text>
          </View>
        </View>

        <Text style={{ fontSize: 9, color: KLEUR.inkMuted, lineHeight: 1.6 }}>
          Dit is een aankoopbewijs voor een eenmalige, direct geleverde digitale dienst (rapport). Er is geen
          klantaccount of -adres bij Kooprapport bekend; dit document dient als bevestiging van uw betaling voor uw
          eigen administratie.
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerTekst}>Kooprapport · KvK 87451387 · Pleinweg 66D, 3083 EH Rotterdam</Text>
          <Text style={styles.footerTekst}>info@kooprapport.nl · kooprapport.nl</Text>
        </View>
      </Page>
    </Document>
  );
}
