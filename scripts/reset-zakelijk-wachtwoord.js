const fs = require("fs");
const path = require("path");

// -----------------------------------------------------------------------------
// Helperscript om het wachtwoord van een bestaande "Kooprapport Zakelijk"-
// gebruiker te resetten -- zelfde opzet als scripts/maak-zakelijk-account.js
// (leest ADMIN_SECRET rechtstreeks uit .env.local, dus nergens handmatig
// plakken/typen).
//
// Gebruik (in de projectmap):
//   npm run zakelijk:wachtwoord -- --email "sjoerd-bos@live.nl" --wachtwoord "NieuwWachtwoord123"
//
// Optioneel: --url https://kooprapport.nl om tegen de live site te draaien
// (default: http://localhost:3000).
// -----------------------------------------------------------------------------

function leesAdminSecret() {
  const envPad = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPad)) {
    console.error(`[zakelijk:wachtwoord] Geen .env.local gevonden op ${envPad}.`);
    process.exit(1);
  }
  const inhoud = fs.readFileSync(envPad, "utf8");
  let waarde = null;
  for (const regel of inhoud.split("\n")) {
    const match = regel.match(/^ADMIN_SECRET=(.*)$/);
    if (match) waarde = match[1].trim();
  }
  if (!waarde) {
    console.error("[zakelijk:wachtwoord] ADMIN_SECRET staat niet (of leeg) in .env.local.");
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
  const nieuwWachtwoord = leesArg("wachtwoord", null);

  if (!email || !nieuwWachtwoord) {
    console.error('[zakelijk:wachtwoord] Geef --email "..." en --wachtwoord "..." (minstens 8 tekens) mee.');
    process.exit(1);
  }

  console.log(`[zakelijk:wachtwoord] Resetten bij ${baseUrl} ...`);
  const res = await fetch(`${baseUrl}/api/admin/zakelijk/wachtwoord-resetten`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, nieuwWachtwoord }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error(`[zakelijk:wachtwoord] Mislukt (HTTP ${res.status}):`, body.error ?? body);
    process.exit(1);
  }

  console.log("[zakelijk:wachtwoord] Gelukt! Nieuwe inloggegevens:");
  console.log(`  Inlogpagina: ${baseUrl}/zakelijk/login`);
  console.log(`  E-mailadres: ${body.email}`);
  console.log(`  Wachtwoord:  ${nieuwWachtwoord}`);
}

main().catch((err) => {
  console.error("[zakelijk:wachtwoord] Onverwachte fout:", err.message);
  process.exit(1);
});
