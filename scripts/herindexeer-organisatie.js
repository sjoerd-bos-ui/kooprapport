const fs = require("fs");
const path = require("path");

// -----------------------------------------------------------------------------
// Eenmalige backfill voor organisaties die al bestonden vóórdat de "alle
// organisaties"-index (voor de matches-cron) werd toegevoegd -- zie
// app/api/admin/zakelijk/organisaties/herindexeren/route.ts. Zelfde opzet als
// de andere zakelijk:*-scripts (leest ADMIN_SECRET rechtstreeks uit .env.local).
//
// Gebruik (in de projectmap):
//   npm run zakelijk:herindexeren -- --email "sjoerd-bos@live.nl"
//
// Optioneel: --url https://kooprapport.nl (default: http://localhost:3000).
// -----------------------------------------------------------------------------

function leesAdminSecret() {
  const envPad = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPad)) {
    console.error(`[zakelijk:herindexeren] Geen .env.local gevonden op ${envPad}.`);
    process.exit(1);
  }
  const inhoud = fs.readFileSync(envPad, "utf8");
  let waarde = null;
  for (const regel of inhoud.split("\n")) {
    const match = regel.match(/^ADMIN_SECRET=(.*)$/);
    if (match) waarde = match[1].trim();
  }
  if (!waarde) {
    console.error("[zakelijk:herindexeren] ADMIN_SECRET staat niet (of leeg) in .env.local.");
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
    console.error('[zakelijk:herindexeren] Geef --email "..." mee (e-mailadres van een bestaande zakelijk-gebruiker).');
    process.exit(1);
  }

  console.log(`[zakelijk:herindexeren] Herindexeren bij ${baseUrl} ...`);
  const res = await fetch(`${baseUrl}/api/admin/zakelijk/organisaties/herindexeren`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error(`[zakelijk:herindexeren] Mislukt (HTTP ${res.status}):`, body.error ?? body);
    process.exit(1);
  }

  console.log(`[zakelijk:herindexeren] Gelukt! Organisatie ${body.orgId} staat nu in de index.`);
}

main().catch((err) => {
  console.error("[zakelijk:herindexeren] Onverwachte fout:", err.message);
  process.exit(1);
});
