const fs = require("fs");
const path = require("path");

// -----------------------------------------------------------------------------
// Kopieert het pdf.js-workerbestand vanuit node_modules/pdfjs-dist naar
// public/pdfjs/, zodat VoorbeeldrapportSlider.tsx dit same-origin (via
// /pdfjs/pdf.worker.min.mjs) kan laden i.p.v. vanaf een externe CDN.
//
// Waarom zelf hosten i.p.v. cdnjs/jsdelivr: de CSP in next.config.js staat
// voor script-src alleen 'self' + Google Tag Manager toe — elke externe CDN
// wordt daar terecht (en zichtbaar in de browserconsole) geblokkeerd. Dit
// script draait automatisch na `npm install` (zie "postinstall" in
// package.json), dus het workerbestand staat er altijd, ook na een
// pdfjs-dist-versie-upgrade, zonder dat iemand dit handmatig hoeft te doen.
//
// De exacte bestandsnaam/locatie van het worker-bestand verschilt per
// pdfjs-dist-versie/build-variant (modern .mjs vs. legacy .js, met of zonder
// "min"). Omdat hier geen netwerktoegang is om dit voor de gebruikte versie
// te verifiëren, proberen we hieronder een lijst met bekende kandidaten i.p.v.
// te gokken op één vast pad — de eerste die daadwerkelijk bestaat, wordt
// gebruikt. Bestaat geen van alle, dan faalt de build hard en duidelijk i.p.v.
// stil een kapotte/ontbrekende worker te deployen.
// -----------------------------------------------------------------------------

const pakketRoot = path.join(__dirname, "..", "node_modules", "pdfjs-dist");

const kandidaten = [
  "build/pdf.worker.min.mjs",
  "build/pdf.worker.mjs",
  "legacy/build/pdf.worker.min.mjs",
  "legacy/build/pdf.worker.mjs",
  "build/pdf.worker.min.js",
  "build/pdf.worker.js",
  "legacy/build/pdf.worker.min.js",
  "legacy/build/pdf.worker.js",
];

const gevonden = kandidaten.find((relatief) => fs.existsSync(path.join(pakketRoot, relatief)));

if (!gevonden) {
  console.error(
    "[copy-pdf-worker] Geen pdf.js-workerbestand gevonden in node_modules/pdfjs-dist. " +
      "Geprobeerde paden: " +
      kandidaten.join(", ")
  );
  process.exit(1);
}

const bronPad = path.join(pakketRoot, gevonden);
const bestandsnaam = path.basename(gevonden);
const doelMap = path.join(__dirname, "..", "public", "pdfjs");
const doelPad = path.join(doelMap, bestandsnaam);

fs.mkdirSync(doelMap, { recursive: true });
fs.copyFileSync(bronPad, doelPad);

// Ook de exacte, gevonden bestandsnaam wegschrijven naar een klein, same-origin
// manifest.json — VoorbeeldrapportSlider.tsx haalt dit bij het openen op om te
// weten welke bestandsnaam (mjs/js, met/zonder "min") daadwerkelijk
// gekopieerd is, zonder dat we dat in de component zelf hoeven te
// hardcoderen (en dus zonder risico dat client en build-output uit de pas
// lopen als een toekomstige pdfjs-dist-versie een andere variant gebruikt).
fs.writeFileSync(path.join(doelMap, "manifest.json"), JSON.stringify({ worker: bestandsnaam }));

console.log(`[copy-pdf-worker] ${gevonden} gekopieerd naar public/pdfjs/${bestandsnaam}`);
