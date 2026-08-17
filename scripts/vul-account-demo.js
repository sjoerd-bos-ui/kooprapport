const fs = require("fs");
const path = require("path");

// -----------------------------------------------------------------------------
// Vult "Mijn rapporten" (B2C-consumentendashboard, /account) met een handvol
// voorbeeldbestellingen voor een gegeven e-mailadres -- zelfde opzet als
// npm run zakelijk:demo, alleen dan voor het lichtere B2C-account-model.
// Zie app/api/admin/account/demo-vullen/route.ts voor de uitleg.
//
// Gebruik (in de projectmap):
//   npm run account:demo -- --email "sjoerd-bos@live.nl"
//
// Optioneel: --url https://kooprapport.nl (default: http://localhost:3000).
// Optioneel: --aantal 2 (default: alle 5 -- zie route.ts voor het plan).
// -----------------------------------------------------------------------------

function leesAdminSecret() {
  const envPad = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPad)) {
    console.error(`[account:demo] Geen .env.local gevonden op ${envPad}.`);
    process.exit(1);
  }
  const inhoud = fs.readFileSync(envPad, "utf8");
  let waarde = null;
  for (const regel of inhoud.split("\n")) {
    const match = regel.match(/^ADMIN_SECRET=(.*)$/);
    if (match) waarde = match[1].trim();
  }
  if (!waarde) {
    console.error("[account:demo] ADMIN_SECRET staat niet (of leeg) in .env.local.");
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
  const aantalRuw = leesArg("aantal", null);
  const aantal = aantalRuw != null ? Number(aantalRuw) : undefined;

  if (!email) {
    console.error('[account:demo] Geef --email "..." mee (het e-mailadres waarmee je straks bij "Mijn rapporten" inlogt).');
    process.exit(1);
  }
  if (aantalRuw != null && (!Number.isFinite(aantal) || aantal < 1)) {
    console.error("[account:demo] --aantal moet een positief getal zijn.");
    process.exit(1);
  }

  console.log(`[account:demo] Vullen bij ${baseUrl} ...`);
  const res = await fetch(`${baseUrl}/api/admin/account/demo-vullen`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(aantal != null ? { email, aantal } : { email }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error(`[account:demo] Mislukt (HTTP ${res.status}):`, body.error ?? body);
    process.exit(1);
  }

  console.log(`[account:demo] Gelukt! ${body.aantalBestellingen} voorbeeldbestellingen gekoppeld aan ${body.email}.`);
  console.log(`[account:demo] Log in op ${baseUrl}/account/inloggen met dit e-mailadres om ze te zien.`);
}

main().catch((err) => {
  console.error("[account:demo] Onverwachte fout:", err.message);
  process.exit(1);
});
