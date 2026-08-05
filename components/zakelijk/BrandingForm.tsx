"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { B2bBranding } from "@/types/b2b";

// -----------------------------------------------------------------------------
// Eigen huisstijl voor alles wat een EINDKLANT te zien krijgt via een
// gedeelde rapportlink (app/deelrapport/[token]) -- zie types/b2b.ts
// (B2bBranding) voor waarom dit alleen daar wordt toegepast en niet overal
// in het interne dashboard.
//
// Logo-upload i.p.v. alleen een URL plakken: er is in dit project geen
// bestandsopslag (geen Vercel Blob/S3/Cloudinary, zelfde "geen extra
// afhankelijkheid tenzij het echt moet"-discipline als de rest van de app).
// In plaats daarvan wordt een geüpload bestand in de browser zelf verkleind
// (canvas, max 160px) en als base64 data-URI opgeslagen in hetzelfde
// logoUrl-veld -- geen nieuwe dienst nodig, en een paar KB per organisatie is
// geen probleem voor de bestaande kvStore. Wie liever een al gehoste URL
// gebruikt, kan die nog steeds gewoon plakken in hetzelfde veld.
// -----------------------------------------------------------------------------

const MAX_AFMETING = 160;

function verkleinTotDataUri(bestand: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Kon het bestand niet lezen."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Dit bestand is geen geldige afbeelding."));
      img.onload = () => {
        const schaal = Math.min(1, MAX_AFMETING / Math.max(img.width, img.height));
        const breedte = Math.round(img.width * schaal);
        const hoogte = Math.round(img.height * schaal);
        const canvas = document.createElement("canvas");
        canvas.width = breedte;
        canvas.height = hoogte;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Verkleinen is niet gelukt."));
          return;
        }
        ctx.drawImage(img, 0, 0, breedte, hoogte);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(bestand);
  });
}

export default function BrandingForm({ huidig }: { huidig: B2bBranding | undefined }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [weergaveNaam, setWeergaveNaam] = useState(huidig?.weergaveNaam ?? "");
  const [logoUrl, setLogoUrl] = useState(huidig?.logoUrl ?? "");
  const [accentKleur, setAccentKleur] = useState(huidig?.accentKleur ?? "#4F46E5");
  const [bezig, setBezig] = useState(false);
  const [uploadFout, setUploadFout] = useState<string | null>(null);
  const [melding, setMelding] = useState<string | null>(null);

  async function bestandGekozen(e: React.ChangeEvent<HTMLInputElement>) {
    const bestand = e.target.files?.[0];
    if (!bestand) return;
    setUploadFout(null);
    if (!bestand.type.startsWith("image/")) {
      setUploadFout("Kies een afbeeldingsbestand (PNG, JPG of SVG-alternatief als PNG).");
      return;
    }
    try {
      const dataUri = await verkleinTotDataUri(bestand);
      setLogoUrl(dataUri);
    } catch (err) {
      setUploadFout(err instanceof Error ? err.message : "Uploaden is niet gelukt.");
    }
  }

  async function opslaan() {
    setBezig(true);
    setMelding(null);
    const res = await fetch("/api/zakelijk/instellingen", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branding: { weergaveNaam, logoUrl, accentKleur } }),
    });
    setBezig(false);
    if (res.ok) {
      setMelding("Opgeslagen.");
      router.refresh();
    } else {
      const body = await res.json().catch(() => null);
      setMelding(body?.error ?? "Opslaan is niet gelukt.");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wide text-ink/35">Naam op gedeeld rapport</label>
        <input
          type="text"
          value={weergaveNaam}
          onChange={(e) => setWeergaveNaam(e.target.value)}
          placeholder="bv. Jansen Makelaars"
          className="mt-1.5 w-full rounded-lg border border-ink/10 bg-parchment px-3 py-2 text-[12.5px] text-ink outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wide text-ink/35">Logo</label>
        <div className="mt-1.5 flex items-center gap-2.5">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-ink/10 object-contain" />
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg bg-white px-3.5 py-2 text-[11.5px] font-semibold text-ink shadow-sm ring-1 ring-inset ring-ink/10 hover:bg-mist"
          >
            {logoUrl ? "Ander logo kiezen" : "Logo uploaden"}
          </button>
          {logoUrl && (
            <button type="button" onClick={() => setLogoUrl("")} className="text-[11px] font-semibold text-ink/40 hover:text-rust">
              Verwijderen
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={bestandGekozen} className="hidden" />
        </div>
        {uploadFout && <p className="mt-1.5 text-[10.5px] text-rust">{uploadFout}</p>}
        <p className="mt-1.5 text-[10px] text-ink/35">Wordt automatisch verkleind, geen aparte hosting nodig.</p>
      </div>
      <div className="sm:col-span-2">
        <label className="text-[10px] font-bold uppercase tracking-wide text-ink/35">Accentkleur</label>
        <div className="mt-1.5 flex items-center gap-2.5">
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(accentKleur) ? accentKleur : "#4F46E5"}
            onChange={(e) => setAccentKleur(e.target.value)}
            className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-ink/10 bg-transparent"
          />
          <input
            type="text"
            value={accentKleur}
            onChange={(e) => setAccentKleur(e.target.value)}
            className="w-32 rounded-lg border border-ink/10 bg-parchment px-3 py-2 text-[12.5px] text-ink outline-none focus:border-accent"
          />
        </div>
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="button"
          onClick={opslaan}
          disabled={bezig}
          className="rounded-lg bg-accent px-4 py-2 text-[11.5px] font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
        >
          {bezig ? "Opslaan…" : "Huisstijl opslaan"}
        </button>
        {melding && (
          <span className={`text-[11.5px] font-semibold ${melding === "Opgeslagen." ? "text-[#3B6D11]" : "text-rust"}`}>
            {melding === "Opgeslagen." ? "✓ " : ""}
            {melding}
          </span>
        )}
      </div>
      <p className="text-[10.5px] text-ink/40 sm:col-span-2">
        Wordt alleen gebruikt op de rapportlink die u met uw klant deelt (zie &quot;Delen&quot; bij een rapport) --
        uw eigen dashboard blijft altijd Kooprapport-gebrand.
      </p>
    </div>
  );
}
