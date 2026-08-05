const fs = require("fs");
const path = require("path");

// -----------------------------------------------------------------------------
// Vult een bestaand "Kooprapport Zakelijk"-account met demo-klantdossiers en
// -rapporten (zie app/api/admin/zakelijk/demo-vullen/route.ts en
// lib/services/b2bDemoData.ts) -- zelfde opzet als de andere zakelijk:*-
// scripts (leest ADMIN_SECRET rechtstreeks uit .env.local).
//
// Gebruik (in de projectmap):
//   npm run zakelijk:demo -- --email "sjoerd-bos@live.nl"
//
// Optioneel: --url https://kooprapport.nl (default: http://localhost:3000).
// -----------------------------------------------------------------------------

function leesAdminSecret() {
  const envPad = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPad)) {
    console.error(`[zakelijk:demo] Geen .env.local gevonden op ${envPad}.`);
    process.exit(1);
  }
  const inhoud = fs.readFileSync(envPad, "utf8");
  let waarde = null;
  for (const regel of inhoud.split("\n")) {
    const match = regel.match(/^ADMIN_SECRET=(.*)$/);
    if (match) waarde = match[1].trim();
  }
  if (!waarde) {
    console.error("[zakelijk:demo] ADMIN_SECRET staat niet (of leeg) in .env.local.");
    process.exit(1);
  }
  return waarde;
}

function leesArg(naam, standaard) {
  const idx = process.argv.indexOf(`--${naam}`);
  if (idx === -1 || !process.argv[idx + 1]) return standaard;
  return process.argv[idx + 1];
}

async function main() {
  const adminSecret = leesAdminSecret();
  const baseUrl = leesArg("url", "http://localhost:3000");
  const email = leesArg("email", null);

  if (!email) {
    console.error('[zakelijk:demo] Geef --email "..." mee (e-mailadres van een bestaande zakelijk-gebruiker).');
    process.exit(1);
  }

  console.log(`[zakelijk:demo] Vullen bij ${baseUrl} ...`);
  const res = await fetch(`${baseUrl}/api/admin/zakelijk/demo-vullen`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error(`[zakelijk:demo] Mislukt (HTTP ${res.status}):`, body.error ?? body);
    process.exit(1);
  }

  console.log(`[zakelijk:demo] Gelukt! ${body.aantalDossiers} dossiers en ${body.aantalRapporten} rapporten toegevoegd aan "${body.orgNaam}".`);
}

main().catch((err) => {
  console.error("[zakelijk:demo] Onverwachte fout:", err.message);
  process.exit(1);
});
