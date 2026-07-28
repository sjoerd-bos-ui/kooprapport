"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon, FileCheckIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// v6 — i.p.v. een met de hand nagebouwde HTML/Tailwind-kopie van elke
// PDF-pagina (die telkens weer uit de pas liep zodra de échte PDF een fix of
// contentwijziging kreeg — zie de vorige versies van dit bestand), rendert
// deze slider nu de ÉCHTE, gegenereerde voorbeeld-PDF zelf via pdf.js:
// dezelfde bytes die iemand ook daadwerkelijk downloadt via
// /api/rapport/voorbeeld-pdf (lib/pdf/ReportDocument.tsx + voorbeeldRapport.ts).
//
// Geen dubbel onderhoud meer: elke toekomstige aanpassing aan de PDF-generator
// komt hier automatisch, pixelidentiek in beeld, zonder dat deze component
// ooit weer los bijgewerkt hoeft te worden.
//
// BUGFIX (v7): v5 gebruikte het npm-pakket "pdfjs-dist" samen met een
// los-geraden jsdelivr-URL voor het workerscript. v6 probeerde in plaats
// daarvan pdf.js volledig als extern <script> vanaf cdnjs te laden — maar de
// site heeft een strikte Content-Security-Policy (next.config.js) die
// script-src beperkt tot 'self' + Google Tag Manager, dus élke externe CDN
// (cdnjs, jsdelivr, unpkg) wordt daar terecht door de browser geblokkeerd
// (zichtbaar als CSP-melding in de console).
//
// v7 host pdf.js daarom volledig zelf, zodat er geen CSP-uitzondering nodig
// is: de hoofdbibliotheek wordt via een gewone dynamische import
// meegebundeld door Next.js (telt als 'self', want het is gewoon een deel
// van onze eigen JS-bundel), en het losse workerbestand wordt door
// scripts/copy-pdf-worker.js na elke "npm install" automatisch vanuit
// node_modules/pdfjs-dist naar public/pdfjs/ gekopieerd — ook same-origin.
// Welke exacte bestandsnaam dat workerbestand heeft (dat verschilt per
// pdfjs-dist-versie/build) staat in public/pdfjs/manifest.json, dat hier
// eerst opgehaald wordt.
// -----------------------------------------------------------------------------

// BUGFIX: de PDF-route cachet zijn respons nu een dag lang (Cache-Control,
// zie app/api/rapport/voorbeeld-pdf/route.tsx — nodig omdat @react-pdf/
// renderer anders bij élk bezoek opnieuw rendert, zie de PERF-toelichting
// daar). Zonder versienummer in de URL bleef de browser/CDN daardoor een
// oude PDF tonen ná elke inhoudelijke aanpassing aan voorbeeldRapport.ts of
// ReportDocument.tsx, tot de cache vanzelf verliep — verwarrend ("nog niet
// aangepast") vlak na een echte fix. Dit versienummer ophogen bij elke
// inhoudelijke wijziging aan de voorbeeld-PDF forceert een verse, ongecachete
// URL, zonder de caching zelf (die de laadtijd echt verbetert) te hoeven
// opgeven.
const VOORBEELD_INHOUD_VERSIE = "3";
const PDF_URL = `/api/rapport/voorbeeld-pdf?v=${VOORBEELD_INHOUD_VERSIE}`;
const PDFJS_MANIFEST_URL = "/pdfjs/manifest.json";

// Interne rendering-resolutie (device pixels per PDF-punt) — hoger dan de
// uiteindelijke CSS-weergavegrootte, zodat de pagina scherp blijft op een
// groot/retina-scherm terwijl de canvas zelf via CSS kleiner getoond wordt.
const RENDER_SCHAAL = 2.2;

// Minimale vorm die we uit pdf.js gebruiken — bewust los getypeerd i.p.v. de
// volledige pdfjs-dist-typedefinities, zodat tsc dit bestand ook kan
// controleren zonder dat het npm-pakket lokaal geïnstalleerd hoeft te zijn.
interface PdfPaginaProxy {
  getViewport(params: { scale: number }): { width: number; height: number };
  render(params: { canvasContext: CanvasRenderingContext2D; viewport: unknown }): { promise: Promise<void>; cancel: () => void };
}
interface PdfDocumentProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPaginaProxy>;
}
interface PdfjsLibGlobal {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument(src: string): { promise: Promise<PdfDocumentProxy> };
}

let pdfjsPromise: Promise<PdfjsLibGlobal> | null = null;

// pdf.js + bijbehorende worker inladen — beide same-origin, dus zonder CSP-
// aanpassing. Wordt maar één keer daadwerkelijk uitgevoerd, ook als de modal
// meerdere keren geopend wordt.
function laadPdfjs(): Promise<PdfjsLibGlobal> {
  if (pdfjsPromise) return pdfjsPromise;

  pdfjsPromise = (async () => {
    const manifestRespons = await fetch(PDFJS_MANIFEST_URL);
    if (!manifestRespons.ok) {
      throw new Error(`Kon ${PDFJS_MANIFEST_URL} niet ophalen (status ${manifestRespons.status})`);
    }
    const manifest = (await manifestRespons.json()) as { worker?: string };
    if (!manifest.worker) {
      throw new Error("manifest.json bevat geen 'worker'-veld");
    }

    // Dynamische import i.p.v. bovenaan het bestand — dit pakket is vrij
    // groot en hoeft alleen geladen te worden zodra de slider daadwerkelijk
    // geopend wordt, niet al bij het inladen van de homepage.
    const pdfjsLib = (await import("pdfjs-dist")) as unknown as PdfjsLibGlobal;
    pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdfjs/${manifest.worker}`;
    return pdfjsLib;
  })();

  return pdfjsPromise;
}

let documentPromise: Promise<PdfDocumentProxy> | null = null;

// PERF: het daadwerkelijke document (pdf.js-bibliotheek downloaden/parsen +
// de PDF zelf ophalen) los van het openen van de modal, zodat we dit al op
// de achtergrond kunnen starten vóórdat iemand daadwerkelijk klikt (zie
// vroegPrefetch/hover hieronder) — en zodat een tweede keer openen altijd
// instant is, ook binnen dezelfde paginabezoek.
function laadDocument(): Promise<PdfDocumentProxy> {
  if (documentPromise) return documentPromise;

  documentPromise = (async () => {
    const pdfjsLib = await laadPdfjs();
    const taak = pdfjsLib.getDocument(PDF_URL);
    return taak.promise;
  })();

  // Bij een fout niet blijven "vastzitten" op een mislukte poging — een
  // volgende aanroep (bv. nog een keer klikken) mag opnieuw proberen i.p.v.
  // voor altijd dezelfde afgewezen promise terug te geven.
  documentPromise.catch(() => {
    documentPromise = null;
  });

  return documentPromise;
}

function PdfPaginaCanvas({ doc, paginaNummer, laatstePagina }: { doc: PdfDocumentProxy | null; paginaNummer: number; laatstePagina: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const [status, setStatus] = useState<"laden" | "klaar" | "fout">("laden");

  useEffect(() => {
    if (!doc || paginaNummer < 1 || paginaNummer > laatstePagina) return;
    let actief = true;
    setStatus("laden");

    (async () => {
      try {
        const pagina = await doc.getPage(paginaNummer);
        if (!actief) return;
        const viewport = pagina.getViewport({ scale: RENDER_SCHAAL });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Een vorige, nog lopende render-taak op dit canvas eerst annuleren —
        // pdf.js staat geen twee gelijktijdige render()-aanroepen op hetzelfde
        // canvas toe (bv. bij snel doorklikken).
        renderTaskRef.current?.cancel();
        const taak = pagina.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = taak;
        await taak.promise;
        if (actief) setStatus("klaar");
      } catch (err) {
        // Een geannuleerde render-taak gooit zelf ook een (verwachte) fout —
        // die stil negeren, dat is geen echte fout, alleen een ingehaalde render.
        if (actief && (err as { name?: string })?.name !== "RenderingCancelledException") {
          console.error("Voorbeeldrapport: pagina renderen mislukt", err);
          setStatus("fout");
        }
      }
    })();

    return () => {
      actief = false;
      renderTaskRef.current?.cancel();
    };
  }, [doc, paginaNummer, laatstePagina]);

  return (
    <div className="relative aspect-[210/297] overflow-hidden rounded-lg bg-white shadow-2xl" style={{ width: "min(40vw, 640px)" }}>
      <canvas ref={canvasRef} className="h-full w-full" />
      {status === "laden" && (
        <div className="absolute inset-0 flex animate-pulse items-center justify-center bg-parchment">
          <span className="text-[11px] text-ink/40">Pagina wordt geladen…</span>
        </div>
      )}
      {status === "fout" && (
        <div className="absolute inset-0 flex items-center justify-center bg-parchment px-4 text-center">
          <span className="text-[11px] text-ink/40">Deze pagina kon niet geladen worden.</span>
        </div>
      )}
    </div>
  );
}

export default function VoorbeeldrapportSlider() {
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState(1);
  const [doc, setDoc] = useState<PdfDocumentProxy | null>(null);
  const [totaalPaginas, setTotaalPaginas] = useState(10);
  const [ladenFout, setLadenFout] = useState<string | null>(null);

  const laatsteLeft = Math.max(1, totaalPaginas - 1);

  // Klein hulpfunctie: het document ophalen (via de gedeelde, gecachte
  // laadDocument()) en de state bijwerken — gebruikt door zowel de
  // prefetch-triggers hieronder als het openen van de modal zelf.
  function verwerkDocument(geladenDoc: PdfDocumentProxy) {
    setDoc(geladenDoc);
    setTotaalPaginas(geladenDoc.numPages);
  }

  // PERF: zodra de pagina rustig is (na de eerste, belangrijkere content),
  // alvast op de achtergrond beginnen met pdf.js + de PDF ophalen — ruim
  // vóórdat iemand daadwerkelijk op "Bekijk het echte voorbeeldrapport"
  // klikt. Dit was de belangrijkste oorzaak van de merkbare wachttijd: die
  // hele download/parse-keten begon voorheen pas op het moment van klikken.
  useEffect(() => {
    const idleCallback =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback
        : (fn: () => void) => window.setTimeout(fn, 1500);

    const id = idleCallback(() => {
      laadDocument()
        .then((geladenDoc) => {
          if (!open) verwerkDocument(geladenDoc);
        })
        .catch(() => {
          // Stil negeren — dit is alleen een optimistische achtergrond-
          // prefetch; als dit mislukt, doet de "echte" poging bij het
          // openen van de modal hieronder gewoon opnieuw een verwoede
          // poging en toont dán pas de nette foutmelding.
        });
    });

    return () => {
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(id as number);
      else window.clearTimeout(id as number);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Het PDF-document ophalen/parsen zodra de modal opent — dankzij
  // laadDocument()'s caching is dit vrijwel altijd al (deels) klaar door de
  // prefetch hierboven, dus dit is meestal meteen synchroon/instant.
  useEffect(() => {
    if (!open || doc) return;
    let actief = true;
    setLadenFout(null);

    laadDocument()
      .then((geladenDoc) => {
        if (actief) verwerkDocument(geladenDoc);
      })
      .catch((err) => {
        // Fout altijd naar de console loggen — de gebruiker ziet alleen de
        // vriendelijke tekst, maar zo blijft dit debugbaar vanuit devtools
        // i.p.v. dat de echte oorzaak stil verdwijnt.
        console.error("Voorbeeldrapport: PDF laden mislukt", err);
        if (actief) setLadenFout("Het voorbeeldrapport kon niet geladen worden. Probeer het later opnieuw.");
      });

    return () => {
      actief = false;
    };
  }, [open, doc]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") setLeft((i) => Math.min(i + 1, laatsteLeft));
      if (e.key === "ArrowLeft") setLeft((i) => Math.max(i - 1, 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, laatsteLeft]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setLeft(1);
          setOpen(true);
        }}
        onMouseEnter={() => {
          // Extra prefetch-trigger: als iemand met de muis over de knop
          // hangt vóórdat de idle-prefetch hierboven kans heeft gehad om te
          // starten, begint het laden dan alvast — laadDocument() is
          // idempotent, dus dit dubbelt nooit met de achtergrond-prefetch.
          laadDocument().catch(() => {});
        }}
        onFocus={() => laadDocument().catch(() => {})}
        className="group inline-flex items-center gap-1.5 text-sm font-bold text-ink hover:text-accent"
      >
        <FileCheckIcon className="h-3.5 w-3.5 text-accent" />
        Bekijk het echte voorbeeldrapport
        <ArrowRightIcon className="h-3 w-3 shrink-0 text-accent transition-transform group-hover:translate-x-1" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-ink/90 px-3 py-6" onClick={() => setOpen(false)}>
          <button
            type="button"
            aria-label="Sluiten"
            onClick={() => setOpen(false)}
            className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            &#10005;
          </button>

          <p className="text-xs uppercase tracking-wide text-white/50 sm:text-sm">
            Voorbeeldrapport &middot; pagina {left}&ndash;{Math.min(left + 1, totaalPaginas)} van {totaalPaginas}
          </p>

          {ladenFout ? (
            <p className="max-w-sm text-center text-sm text-white/70">{ladenFout}</p>
          ) : (
            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                aria-label="Vorige paginas"
                onClick={() => setLeft((i) => Math.max(i - 1, 1))}
                disabled={left === 1}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 disabled:opacity-30"
              >
                &#8249;
              </button>

              <div className="flex gap-3">
                <PdfPaginaCanvas doc={doc} paginaNummer={left} laatstePagina={totaalPaginas} />
                <PdfPaginaCanvas doc={doc} paginaNummer={left + 1} laatstePagina={totaalPaginas} />
              </div>

              <button
                type="button"
                aria-label="Volgende paginas"
                onClick={() => setLeft((i) => Math.min(i + 1, laatsteLeft))}
                disabled={left === laatsteLeft}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 disabled:opacity-30"
              >
                &#8250;
              </button>
            </div>
          )}

          {!ladenFout && (
            <div className="flex flex-wrap justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              {Array.from({ length: totaalPaginas }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`Ga naar pagina ${n}`}
                  onClick={() => setLeft(Math.min(n, laatsteLeft))}
                  className={`h-1.5 w-1.5 rounded-full ${n === left || n === left + 1 ? "bg-white" : "bg-white/30"}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
