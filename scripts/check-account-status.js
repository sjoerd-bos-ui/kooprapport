const fs = require("fs");
const path = require("path");

// -----------------------------------------------------------------------------
// Laat zien welke bestellingen (indien aanwezig) er in de KV-store staan voor
// een e-mailadres in "Mijn rapporten" -- handig om te checken of
// account:demo echt is aangekomen, zonder in te loggen. Zelfde opzet als
// scripts/vul-account-demo.js.
//
// Gebruik:
//   npm run account:status -- --email "sjoerd-bos@live.nl"
//
// Optioneel: --url https://kooprapport.nl (default: http://localhost:3000).
// -----------------------------------------------------------------------------

function leesAdminSecret() {
  const envPad = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPad)) {
    console.error(`[account:status] Geen .env.local gevonden op ${envPad}.`);
    process.exit(1);
  }
  const inhoud = fs.readFileSync(envPad, "utf8");
  let waarde = null;
  for (const regel of inhoud.split("\n")) {
    const match = regel.match(/^ADMIN_SECRET=(.*)$/);
    if (match) waarde = match[1].trim();
  }
  if (!waarde) {
    console.error("[account:status] ADMIN_SECRET staat niet (of leeg) in .env.local.");
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
    console.error('[account:status] Geef --email "..." mee.');
    process.exit(1);
  }

  console.log(`[account:status] Opzoeken bij ${baseUrl} ...`);
  const res = await fetch(`${baseUrl}/api/admin/account/status?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${adminSecret}` },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error(`[account:status] Mislukt (HTTP ${res.status}):`, body.error ?? body);
    process.exit(1);
  }

  if (body.aantalBestellingen === 0) {
    console.log(`[account:status] Geen bestellingen gevonden voor ${body.email}.`);
    return;
  }

  console.log(`[account:status] ${body.aantalBestellingen} bestelling(en) voor ${body.email}:`);
  for (const b of body.bestellingen) {
    console.log(
      `  - ${b.adres} (${b.status}${b.favoriet ? ", favoriet" : ""}${b.gearchiveerd ? ", gearchiveerd" : ""}) — ${b.aangemaaktOp}`
    );
  }
}

main().catch((err) => {
  console.error("[account:status] Onverwachte fout:", err.message);
  process.exit(1);
});
