"use client";

import type { Report } from "@/types/report";
import ReportView from "@/components/report/ReportView";

// -----------------------------------------------------------------------------
// Dunne wrapper om het ECHTE, publieke rapport-component (ReportView.tsx) in
// "Kooprapport Zakelijk" te hergebruiken, i.p.v. de losse, merkbaar dunnere
// B2bRapportSamenvatting die dit eerder toonde. Een B2B-rapport is altijd al
// "betaald" (het zit binnen het organisatiequotum, geen losse Mollie-
// bestelling per rapport), dus:
//   - isUnlocked altijd true -- toont meteen alle tabbladen, geen paywall.
//   - onUnlock is een no-op -- kan sowieso nooit aangeroepen worden zolang
//     isUnlocked al true is (de "Ontgrendel nu"-knop bestaat dan niet).
//   - bestellingId blijft null -- verbergt alleen "Download aankoopbewijs"
//     (een consumenten-Mollie-concept dat hier niet van toepassing is).
//   - naaktModus=true -- laat SiteHeader/SiteFooter weg, dit draait al
//     binnen het B2B-dashboardframe (of de deelrapport-paginakop).
//
// "Download PDF" en "Verstuur naar mail" komen HIERDOOR gratis mee: dat zijn
// ingebouwde knoppen van ReportView zelf (/api/rapport/pdf, /api/rapport/
// email), dus de PDF is gegarandeerd exact dezelfde als op de scherm-
// weergave -- letterlijk hetzelfde React-PDF-document, hetzelfde Report-
// object, geen aparte/tweede opmaak om uit de pas te laten lopen.
// -----------------------------------------------------------------------------
export default function B2bReportView({ report }: { report: Report }) {
  return <ReportView report={report} isUnlocked={true} isConfirmingPayment={false} onUnlock={() => {}} bestellingId={null} naaktModus={true} />;
}
