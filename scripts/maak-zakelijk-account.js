const fs = require("fs");
const path = require("path");

// -----------------------------------------------------------------------------
// Helperscript om lokaal (of tegen een andere omgeving) een B2B-organisatie +
// eerste gebruiker aan te maken voor "Kooprapport Zakelijk", zonder dat je
// zelf ADMIN_SECRET uit .env.local hoeft te kopiëren/plakken in een
// curl-commando — dat was de bron van de eerdere 401's (typefout/verouderde
// waarde). Dit script leest ADMIN_SECRET rechtstreeks uit .env.local, dus
// die kan nooit meer uit de pas lopen.
//
// Gebruik (in de projectmap, met npm run dev al draaiend in een ANDER venster):
//   npm run zakelijk:account -- --naam "Testkantoor" --email "sjoerd-bos@live.nl" --wachtwoord "Testwachtwoord123"
//
// Optioneel: --url https://kooprapport.nl om tegen de live site te draaien
// (dan moet ADMIN_SECRET in .env.local overeenkomen met wat op Vercel staat).
// Optioneel: --tier starter|pro|kantoor (default: pro).
// -----------------------------------------------------------------------------

function leesAdminSecret() {
  const envPad = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPad)) {
    console.error(`[zakelijk:account] Geen .env.local gevonden op ${envPad}.`);
    process.exit(1);
  }
  const inhoud = fs.readFileSync(envPad, "utf8");
  // Staat de regel er (per ongeluk) dubbel in, dan geldt gewoon de laatste --
  // zelfde gedrag als een normale .env-loader.
  let waarde = null;
  for (const regel of inhoud.split("\n")) {
    const match = regel.match(/^ADMIN_SECRET=(.*)$/);
    if (match) waarde = match[1].trim();
  }
  if (!waarde) {
    console.error("[zakelijk:account] ADMIN_SECRET staat niet (of leeg) in .env.local.");
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
  const organisatieNaam = leesArg("naam", "Testkantoor");
  const eigenaarNaam = leesArg("eigenaarnaam", "Sjoerd Bos");
  const eigenaarEmail = leesArg("email", "sjoerd-bos@live.nl");
  const wachtwoord = leesArg("wachtwoord", null);
  const tier = leesArg("tier", "pro");

  if (!wachtwoord) {
    console.error('[zakelijk:account] Geef een wachtwoord mee: --wachtwoord "..." (minstens 8 tekens).');
    process.exit(1);
  }

  console.log(`[zakelijk:account] Aanmaken bij ${baseUrl} ...`);
  const res = await fetch(`${baseUrl}/api/admin/zakelijk/organisaties`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ organisatieNaam, tier, eigenaarNaam, eigenaarEmail, wachtwoord }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error(`[zakelijk:account] Mislukt (HTTP ${res.status}):`, body.error ?? body);
    process.exit(1);
  }

  console.log("[zakelijk:account] Gelukt! Inloggegevens:");
  console.log(`  Inlogpagina: ${baseUrl}/zakelijk/login`);
  console.log(`  E-mailadres: ${eigenaarEmail}`);
  console.log(`  Wachtwoord:  ${wachtwoord}`);
}

main().catch((err) => {
  console.error("[zakelijk:account] Onverwachte fout:", err.message);
  process.exit(1);
});
