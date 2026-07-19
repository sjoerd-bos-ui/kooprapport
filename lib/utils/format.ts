export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

// Defensief tegen undefined/null: sommige bronnen typeren een datumveld als
// verplicht (string) terwijl de live respons het toch kan weglaten (bv.
// Altum's sandbox-ValuationDate, die leeg terugkomt) — zonder deze guard zou
// dat hier letterlijk het woord "undefined" op het scherm zetten i.p.v. een
// nette fallback.
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "onbekend";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}
