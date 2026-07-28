"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon, FileCheckIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// v5 — i.p.v. een met de hand nagebouwde HTML/Tailwind-kopie van elke
// PDF-pagina (die telkens weer uit de pas liep zodra de échte PDF een fix of
// contentwijziging kreeg — zie de vorige versies van dit bestand), rendert
// deze slider nu de ÉCHTE, gegenereerde voorbeeld-PDF zelf via pdf.js:
// dezelfde bytes die iemand ook daadwerkelijk downloadt via
// /api/rapport/voorbeeld-pdf (lib/pdf/ReportDocument.tsx + voorbeeldRapport.ts).
//
// Geen dubbel onderhoud meer: elke toekomstige aanpassing aan de PDF-generator
// komt hier automatisch, pixelidentiek in beeld, zonder dat deze component
// ooit weer los bijgewerkt hoeft te worden.
// -----------------------------------------------------------------------------

const PDF_URL = "/api/rapport/voorbeeld-pdf";
// Interne rendering-resolutie (device pixels per PDF-punt) — hoger dan de
// uiteindelijke CSS-weergavegrootte, zodat de pagina scherp blijft op een
// groot/retina-scherm terwijl de canvas zelf via CSS kleiner getoond wordt.
const RENDER_SCHAAL = 2.2;

// Minimale vorm die we uit pdf.js gebruiken — bewust los getypeerd (i.p.v. de
// volledige pdfjs-dist-typedefinities) omdat dit pakket alleen client-side,
// dynamisch geïmporteerd wordt (zie hieronder) en niet server-side/tijdens
// tsc met een aparte node-omgeving hoeft te worden meegecompileerd.
interface PdfPaginaProxy {
  getViewport(params: { scale: number }): { width: number; height: number };
  render(params: { canvasContext: CanvasRenderingContext2D; viewport: unknown }): { promise: Promise<void>; cancel: () => void };
}
interface PdfDocumentProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPaginaProxy>;
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
        const pdfjsLib = await import("pdfjs-dist");
        // Worker laden vanaf jsdelivr, exact dezelfde versie als het lokaal
        // geïnstalleerde npm-pakket (pdfjsLib.version) — zo kan de
        // workerversie nooit uit de pas lopen met de hoofdbibliotheek, zonder
        // dat we zelf een vaste versie hoeven bij te houden.
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const taak = pdfjsLib.getDocument(PDF_URL);
        const geladenDoc = (await taak.promise) as unknown as PdfDocumentProxy;
        if (!actief) return;
        setDoc(geladenDoc);
        setTotaalPaginas(geladenDoc.numPages);
      } catch {
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
