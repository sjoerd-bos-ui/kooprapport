import { NextResponse } from "next/server";
import { MARKTUPDATES } from "@/lib/content/marktupdates";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// RSS 2.0-feed voor de Marktupdates (zie de SEO-audit: er was nog geen enkel
// syndicatiekanaal voor deze kwartaal-content). Gebouwd op dezelfde MARKTUPDATES
// content-array als /marktupdates zelf, dus nooit los te lopen van wat er
// daadwerkelijk gepubliceerd is -- geen los te onderhouden tweede databron.
//
// Statische route (geen searchParams/dynamische input), dus door Next.js
// standaard gecached net als elke andere statische pagina; wordt opnieuw
// gebouwd zodra MARKTUPDATES verandert (nieuwe kwartaalupdate).
//
// gepubliceerdISO (zie lib/content/marktupdates.ts) gebruikt voor een echte,
// per-item pubDate i.p.v. steeds "nu" -- zelfde principe als de
// lastModified-fix in app/sitemap.ts.
function xmlEscape(tekst: string): string {
  return tekst
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const items = [...MARKTUPDATES]
    .reverse() // nieuwste eerst, zelfde volgorde als de hub-pagina
    .map((update) => {
      const url = `${APP_BASE_URL}/marktupdates/${update.slug}`;
      const pubDate = new Date(update.gepubliceerdISO).toUTCString();
      return `    <item>
      <title>${xmlEscape(update.titel)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${xmlEscape(update.samenvatting)}</description>
    </item>`;
    })
    .join("\n");

  const nieuwsteDatum =
    MARKTUPDATES.length > 0
      ? new Date([...MARKTUPDATES].sort((a, b) => (a.gepubliceerdISO < b.gepubliceerdISO ? 1 : -1))[0].gepubliceerdISO).toUTCString()
      : new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Kooprapport Marktupdates</title>
    <link>${APP_BASE_URL}/marktupdates</link>
    <description>Elk kwartaal de belangrijkste cijfers over de Nederlandse woningmarkt: verkoopprijzen, overbieden en verschillen per regio.</description>
    <language>nl-NL</language>
    <lastBuildDate>${nieuwsteDatum}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
