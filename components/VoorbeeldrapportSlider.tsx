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
// BUGFIX (v6): v5 gebruikte het npm-pakket "pdfjs-dist" (dynamisch
// geïmporteerd) samen met een los-geraden jsdelivr-URL voor het worker-
// script. Dat bleek in productie te falen — twee dingen die uit de pas
// konden lopen (de bundelaar-build van het npm-pakket vs. het exacte
// bestandspad van de worker op een andere CDN), en dat kon ik in de
// sandbox niet testen. Nu laden we pdf.js volledig als klassiek <script>
// vanaf cdnjs — bibliotheek én worker van exact dezelfde, vastgepinde
// versie, dezelfde CDN, geen npm/bundelaar-afhankelijkheid meer nodig
// (pdfjs-dist is dan ook weer uit package.json gehaald).
// -----------------------------------------------------------------------------

const PDF_URL = "/api/rapport/voorbeeld-pdf";
// Vastgepinde, stabiele pdf.js-versie — bewust een "oudere" 3.x-release
// i.p.v. de nieuwste, omdat dit precies de UMD-build+worker-combinatie is
// die al jaren op cdnjs staat en in talloze voorbeelden zo gebruikt wordt.
const PDFJS_VERSION = "3.11.174";
const PDFJS_BASE_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

// Interne rendering-resolutie (device pixels per PDF-punt) — hoger dan de
// uiteindelijke CSS-weergavegrootte, zodat de pagina scherp blijft op een
// groot/retina-scherm terwijl de canvas zelf via CSS kleiner getoond wordt.
const RENDER_SCHAAL = 2.2;

// Minimale vorm die we uit pdf.js gebruiken — bewust los getypeerd, want de
// bibliotheek wordt hier als los <script> geladen (window.pdfjsLib) en niet
// als npm-module met eigen typedefinities meegecompileerd.
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

let pdfjsScriptPromise: Promise<PdfjsLibGlobal> | null = null;

// pdf.js als klassiek script laden (i.p.v. dynamische import) — voorkomt elk
// risico op een bundelaar/ESM-mismatch met de worker. Wordt maar één keer
// daadwerkelijk ingeladen, ook als de modal meerdere keren geopend wordt.
function laadPdfjs(): Promise<PdfjsLibGlobal> {
  if (pdfjsScriptPromise) return pdfjsScriptPromise;

  pdfjsScriptPromise = new Promise((resolve, reject) => {
    const bestaand = (window as unknown as { pdfjsLib?: PdfjsLibGlobal }).pdfjsLib;
    if (bestaand) {
      resolve(bestaand);
      return;
    }

    const script = document.createElement("script");
    script.src = `${PDFJS_BASE_URL}/pdf.min.js`;
    script.onload = () => {
      const lib = (window as unknown as { pdfjsLib?: PdfjsLibGlobal }).pdfjsLib;
      if (!lib) {
        reject(new Error("pdfjsLib niet gevonden na laden van script"));
        return;
      }
      lib.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE_URL}/pdf.worker.min.js`;
      resolve(lib);
    };
    script.onerror = () => reject(new Error(`Kon pdf.js-script niet laden vanaf ${script.src}`));
    document.head.appendChild(script);
  });

  return pdfjsScriptPromise;
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

  // Het PDF-document zelf pas ophalen/parsen zodra de modal voor het eerst
  // opent — niet al bij het inladen van de homepage.
  useEffect(() => {
    if (!open || doc) return;
    let actief = true;
    setLadenFout(null);

    (async () => {
      try {
        const pdfjsLib = await laadPdfjs();
        const taak = pdfjsLib.getDocument(PDF_URL);
        const geladenDoc = await taak.promise;
        if (!actief) return;
        setDoc(geladenDoc);
        setTotaalPaginas(geladenDoc.numPages);
      } catch (err) {
        // Fout altijd naar de console loggen — de gebruiker ziet alleen de
        // vriendelijke tekst, maar zo blijft dit debugbaar vanuit devtools
        // i.p.v. dat de echte oorzaak stil verdwijnt.
        console.error("Voorbeeldrapport: PDF laden mislukt", err);
        if (actief) setLadenFout("Het voorbeeldrapport kon niet geladen worden. Probeer het later opnieuw.");
      }
    })();

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
