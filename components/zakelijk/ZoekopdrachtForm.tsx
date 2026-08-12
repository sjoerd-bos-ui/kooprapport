"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { B2bZoekopdracht, B2bKoperVoorkeuren } from "@/types/b2b";
import { B2B_WONINGTYPE_VOORKEUREN } from "@/types/b2b";
import VoorkeurenVragenlijst from "@/components/zakelijk/VoorkeurenVragenlijst";
import { MapPinIcon, CheckIcon, BoltIcon, MailIcon } from "@/components/report/icons";

function labelVoor<T extends string>(opties: { waarde: T; label: string }[], waarde: T): string {
  return opties.find((o) => o.waarde === waarde)?.label ?? waarde;
}

// NIEUW (continu budget i.p.v. buckets, zie types/b2b.ts): geen labellijst
// meer om in op te zoeken -- gewoon een bedrag formatteren, of "Nog geen vast
// maximum" bij `null`. Defensief tegen oudere dossiers die hier nog een
// bucket-string (bv. "350k_450k") hebben staan (typeof !== "number") --
// zelfde behandeling als "onbekend", nooit een crash op een verouderde
// waarde.
function budgetLabel(maxKoopprijs: B2bKoperVoorkeuren["maxKoopprijs"]): string {
  if (typeof maxKoopprijs !== "number") return "Nog geen vast maximum";
  return `Tot ${new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(maxKoopprijs)}`;
}

// -----------------------------------------------------------------------------
// MATCHINGMODEL V2 (zie het Cowork-gesprek hierover, "matchingsproces onder
// de loep"): het oude budget/locatie/kenmerken-blok EN het oude losse
// 4-vragen koper-voorkeuren-blok zijn hier allebei verdwenen -- de volledige
// 13-vragen vragenlijst (VoorkeurenVragenlijst.tsx, gedeeld met de publieke
// pagina in KoperVoorkeurenForm.tsx) is nu het complete formulier. Zie
// types/b2b.ts: B2bZoekopdracht heeft nog maar drie velden.
//
// Twee manieren om koperVoorkeuren te wijzigen, zoals eerder ook al het
// geval was ("moet op deze manier ingevuld kunnen worden via de link, maar
// ook niet ingevuld of via de app zelf"):
//   1. de makelaar loopt hier zelf de wizard door -- opslaan stuurt meteen
//      de volledige koperVoorkeuren mee en start direct een Funda-zoekactie.
//   2. de makelaar kopieert de publieke link en laat de koper zelf invullen.
// Automatisch-matchen (matchenActief) is een losse, snelle aan/uit-knop op
// het al opgeslagen koperVoorkeuren-object -- vereist dus dat er al een keer
// een complete vragenlijst is opgeslagen (via 1 of 2 hierboven).
// -----------------------------------------------------------------------------
export default function ZoekopdrachtForm({ dossierId, huidig }: { dossierId: string; huidig: B2bZoekopdracht | undefined }) {
  const router = useRouter();
  const [bewerken, setBewerken] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);
  // Los van `bezig` (dat dekt alleen het opslaan zelf) -- deze staat
  // specifiek aan tijdens het live doorzoeken van Funda ná het opslaan.
  const [zoekBezig, setZoekBezig] = useState(false);
  const [linkBezig, setLinkBezig] = useState(false);
  const [linkMelding, setLinkMelding] = useState<string | null>(null);
  const [matchenBezig, setMatchenBezig] = useState(false);
  // Koper-mailnotificatie (zie het Cowork-gesprek "Nieuwe matches ... via de
  // mail"): het invoerveld is bewust een LOKALE, ongebonden string (niet
  // meteen bij elke toetsaanslag opslaan) -- pas bij "Opslaan" gaat de PATCH
  // eruit. De toggle-pill hieronder gebruikt wél meteen de al OPGESLAGEN
  // waarde (huidig?.emailKoper), net als matchenActief hierboven, zodat je
  // 'm niet per ongeluk aanzet op een adres dat nog niet is opgeslagen.
  const [emailKoperInput, setEmailKoperInput] = useState(huidig?.emailKoper ?? "");
  const [mailBezig, setMailBezig] = useState(false);
  const [mailMelding, setMailMelding] = useState<string | null>(null);
  const [bevestigingBezig, setBevestigingBezig] = useState(false);

  const koperVoorkeuren = huidig?.koperVoorkeuren ?? null;
  const matchenActief = huidig?.matchenActief ?? false;
  const emailKoperOpgeslagen = huidig?.emailKoper ?? null;
  const mailBijNieuweMatches = huidig?.mailBijNieuweMatches ?? false;
  // Dubbele opt-in (zie types/b2b.ts: emailKoperBevestigd) -- de koper moet
  // zelf op de link in de bevestigingsmail klikken vóór er daadwerkelijk
  // mailmeldingen uitgaan, ook als de toggle hieronder al "aan" staat.
  const emailKoperBevestigd = huidig?.emailKoperBevestigd ?? false;

  async function kopieerVoorkeurenLink() {
    setLinkBezig(true);
    setLinkMelding(null);
    try {
      const res = await fetch(`/api/zakelijk/klanten/${dossierId}/koper-voorkeuren-link`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setLinkMelding(body.error ?? "Link aanmaken is niet gelukt.");
        return;
      }
      try {
        await navigator.clipboard.writeText(body.voorkeurenUrl);
        setLinkMelding("Link gekopieerd -- stuur 'm naar de koper.");
      } catch {
        setLinkMelding(body.voorkeurenUrl);
      }
    } catch {
      setLinkMelding("Link aanmaken is niet gelukt.");
    } finally {
      setLinkBezig(false);
    }
  }

  async function toggleMatchenActief() {
    if (!koperVoorkeuren) return;
    setMatchenBezig(true);
    try {
      const res = await fetch(`/api/zakelijk/klanten/${dossierId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoekopdracht: { matchenActief: !matchenActief, koperVoorkeuren } }),
      });
      if (res.ok) router.refresh();
    } finally {
      setMatchenBezig(false);
    }
  }

  // BELANGRIJK: matchenActief/koperVoorkeuren moeten hier ALTIJD expliciet
  // meegestuurd worden (zelfde als bij toggleMatchenActief hierboven) --
  // de PATCH-route behandelt een ontbrekend `matchenActief` als `false`
  // (geen "laat ongewijzigd"-fallback zoals bij koperVoorkeuren), dus zonder
  // dit zou het opslaan van alleen het e-mailadres automatisch matchen
  // stilzwijgend uitzetten.
  async function opslaanKoperMail(email: string, mailAan: boolean, emailIsGewijzigd: boolean) {
    setMailBezig(true);
    setMailMelding(null);
    try {
      const res = await fetch(`/api/zakelijk/klanten/${dossierId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zoekopdracht: { matchenActief, koperVoorkeuren, emailKoper: email, mailBijNieuweMatches: mailAan },
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setMailMelding(body.error ?? "Opslaan is niet gelukt.");
        return;
      }
      // De PATCH-route verstuurt zelf al een bevestigingsmail bij een
      // ECHTE wijziging van het adres (zie de toelichting daar) -- hier
      // alleen het bijpassende bericht tonen, geen dubbele aanroep.
      setMailMelding(emailIsGewijzigd && email ? "Opgeslagen -- we hebben een bevestigingsmail naar de koper gestuurd." : "Opgeslagen.");
      router.refresh();
    } catch {
      setMailMelding("Opslaan is niet gelukt.");
    } finally {
      setMailBezig(false);
    }
  }

  function opslaanEmailKoper() {
    const email = emailKoperInput.trim();
    const gewijzigd = email !== (emailKoperOpgeslagen ?? "");
    // Een leeg adres kan nooit samengaan met een aanstaande mailtoggle (zie
    // de validatie in de PATCH-route) -- die zetten we hier meteen mee uit
    // i.p.v. de gebruiker een foutmelding te laten zien over iets dat hij
    // niet heeft aangeraakt.
    opslaanKoperMail(email, email ? mailBijNieuweMatches : false, gewijzigd);
  }

  function toggleMailBijNieuweMatches() {
    if (!emailKoperOpgeslagen) return;
    opslaanKoperMail(emailKoperOpgeslagen, !mailBijNieuweMatches, false);
  }

  async function opnieuwBevestigingVersturen() {
    setBevestigingBezig(true);
    setMailMelding(null);
    try {
      const res = await fetch(`/api/zakelijk/klanten/${dossierId}/koper-mail-bevestiging`, { method: "POST" });
      const body = await res.json();
      setMailMelding(res.ok ? "Bevestigingsmail opnieuw verstuurd." : body.error ?? "Versturen is niet gelukt.");
    } catch {
      setMailMelding("Versturen is niet gelukt.");
    } finally {
      setBevestigingBezig(false);
    }
  }

  async function opslaanVoorkeuren(nieuw: B2bKoperVoorkeuren) {
    setBezig(true);
    setMelding(null);
    try {
      const res = await fetch(`/api/zakelijk/klanten/${dossierId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoekopdracht: { matchenActief, koperVoorkeuren: nieuw } }),
      });
      const body = await res.json();
      if (!res.ok) {
        setMelding(body.error ?? "Opslaan is niet gelukt.");
        setBezig(false);
        return;
      }

      setMelding("Opgeslagen. Bezig met zoeken naar woningen op Funda…");
      setZoekBezig(true);
      try {
        const versRes = await fetch(`/api/zakelijk/klanten/${dossierId}/matches-verversen`, { method: "POST" });
        const versBody = await versRes.json();
        // BUGFIX (klacht "geeft nog steeds 0 matches zonder extra filter"):
        // een mislukte zoekaanvraag (netwerk/timeout bij de proxy, zie
        // fundaFeed.ts) zag er voorheen identiek uit als "0 passende
        // woningen" -- versBody.zoekFout maakt dat onderscheid nu expliciet.
        if (!versRes.ok) {
          setMelding("Opgeslagen.");
        } else if (versBody.zoekFout) {
          setMelding("Opgeslagen. Zoeken naar Funda is niet gelukt (netwerkprobleem) -- probeer straks opnieuw via 'Ververs' bij de matches.");
        } else {
          setMelding(`Opgeslagen -- ${versBody.nieuweMatches} nieuwe woning(en) gevonden.`);
        }
      } catch {
        setMelding("Opgeslagen.");
      } finally {
        setZoekBezig(false);
      }

      setBezig(false);
      setBewerken(false);
      router.refresh();
    } catch {
      setMelding("Opslaan is niet gelukt.");
      setBezig(false);
    }
  }

  if (!bewerken) {
    const locatieChips = koperVoorkeuren ? koperVoorkeuren.voorkeurLocaties.map((l) => l.label) : [];
    const woningtypeChips = koperVoorkeuren
      ? koperVoorkeuren.woningtypes.map((w) => (w === "other" ? koperVoorkeuren.woningtypeAnders ?? "Ander type" : labelVoor(B2B_WONINGTYPE_VOORKEUREN, w)))
      : [];

    return (
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">Zoekopdracht</p>
          <div className="flex items-center gap-3">
            {koperVoorkeuren && (
              <button type="button" onClick={kopieerVoorkeurenLink} disabled={linkBezig} className="text-[10.5px] font-semibold text-accent hover:underline disabled:opacity-50">
                {linkBezig ? "Bezig…" : "Voorkeuren-link kopiëren"}
              </button>
            )}
            <button type="button" onClick={() => setBewerken(true)} className="text-[10.5px] font-semibold text-accent hover:underline">
              {koperVoorkeuren ? "Bewerken" : "+ Invullen"}
            </button>
          </div>
        </div>
        {linkMelding && <p className="mt-1.5 text-[10.5px] font-semibold text-accent">{linkMelding}</p>}
        {koperVoorkeuren ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {locatieChips.map((label) => (
              <span key={label} className="flex items-center gap-1 rounded-full bg-mist px-2.5 py-1 text-[11px] font-semibold text-ink">
                <MapPinIcon className="h-3 w-3 shrink-0 text-ink/40" />
                {label}
              </span>
            ))}
            <span className="rounded-full bg-mist px-2.5 py-1 text-[11px] font-semibold text-ink">{budgetLabel(koperVoorkeuren.maxKoopprijs)}</span>
            {woningtypeChips.map((label) => (
              <span key={label} className="rounded-full bg-[#EEF0FF] px-2.5 py-1 text-[11px] font-semibold text-accent">
                {label}
              </span>
            ))}
            <button
              type="button"
              onClick={toggleMatchenActief}
              disabled={matchenBezig}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                matchenActief ? "bg-[#EAF3DE] text-[#3B6D11]" : "bg-ink/5 text-ink/40"
              }`}
            >
              <BoltIcon className="h-3 w-3" />
              Automatisch {matchenActief ? "aan" : "uit"}
            </button>
            <span className="flex items-center gap-1 rounded-full bg-[#EAF3DE] px-2.5 py-1 text-[11px] font-semibold text-[#3B6D11]">
              <CheckIcon className="h-3 w-3" />
              Voorkeuren bekend
            </span>
          </div>
        ) : (
          <p className="mt-2 text-[11.5px] text-ink/40">Nog geen voorkeurenlijst ingevuld voor dit dossier.</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink/[0.06] pt-3">
          <MailIcon className="h-3.5 w-3.5 shrink-0 text-ink/30" />
          <input
            type="email"
            value={emailKoperInput}
            onChange={(e) => setEmailKoperInput(e.target.value)}
            placeholder="e-mailadres van de koper"
            className="min-w-[200px] flex-1 rounded-lg border border-ink/15 px-2.5 py-1.5 text-[11.5px] text-ink focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={opslaanEmailKoper}
            disabled={mailBezig || emailKoperInput.trim() === (emailKoperOpgeslagen ?? "")}
            className="rounded-lg border border-ink/15 px-3 py-1.5 text-[10.5px] font-semibold text-ink/60 hover:bg-mist disabled:opacity-50"
          >
            {mailBezig ? "Bezig…" : "Opslaan"}
          </button>
          <button
            type="button"
            onClick={toggleMailBijNieuweMatches}
            disabled={mailBezig || !emailKoperOpgeslagen}
            title={!emailKoperOpgeslagen ? "Vul en bewaar eerst een e-mailadres" : undefined}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
              mailBijNieuweMatches ? "bg-[#EAF3DE] text-[#3B6D11]" : "bg-ink/5 text-ink/40"
            }`}
          >
            <MailIcon className="h-3 w-3" />
            Mail bij nieuwe matches {mailBijNieuweMatches ? "aan" : "uit"}
          </button>
          {/* Dubbele opt-in-status (zie types/b2b.ts: emailKoperBevestigd) --
              ook zichtbaar als de toggle nog uit staat, zodat de makelaar
              alvast weet dat de koper straks nog moet bevestigen. */}
          {emailKoperOpgeslagen &&
            (emailKoperBevestigd ? (
              <span className="flex items-center gap-1 rounded-full bg-[#EAF3DE] px-2.5 py-1 text-[11px] font-semibold text-[#3B6D11]">
                <CheckIcon className="h-3 w-3" />
                Bevestigd door koper
              </span>
            ) : (
              <span className="flex items-center gap-2 rounded-full bg-[#FDF3E0] px-2.5 py-1 text-[11px] font-semibold text-[#8A5A00]">
                Wacht op bevestiging van de koper
                <button
                  type="button"
                  onClick={opnieuwBevestigingVersturen}
                  disabled={bevestigingBezig || mailBezig}
                  className="font-semibold text-accent underline decoration-dotted hover:no-underline disabled:opacity-50"
                >
                  {bevestigingBezig ? "Bezig…" : "opnieuw versturen"}
                </button>
              </span>
            ))}
          {mailMelding && <p className="w-full text-[10.5px] font-semibold text-accent">{mailMelding}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/[0.06] p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">Voorkeurenlijst bewerken</p>
        <div className="flex items-center gap-3">
          <button type="button" onClick={kopieerVoorkeurenLink} disabled={linkBezig} className="text-[10.5px] font-semibold text-accent hover:underline disabled:opacity-50">
            {linkBezig ? "Bezig…" : "Voorkeuren-link kopiëren"}
          </button>
          <button type="button" onClick={() => setBewerken(false)} disabled={bezig} className="text-[10.5px] font-semibold text-ink/50 hover:underline">
            Annuleren
          </button>
        </div>
      </div>
      {linkMelding && <p className="border-b border-ink/[0.06] px-4 py-2 text-[10.5px] font-semibold text-accent">{linkMelding}</p>}

      <div className="p-4">
        <VoorkeurenVragenlijst bestaand={koperVoorkeuren} onOpslaan={opslaanVoorkeuren} bezig={bezig} opslaanLabel="Opslaan en zoeken op Funda" />
      </div>

      {melding &&
        (zoekBezig ? (
          <div className="flex flex-col items-center justify-center gap-3 border-t border-ink/[0.06] px-4 py-8 text-center">
            <span className="h-8 w-8 shrink-0 animate-spin rounded-full border-[3px] border-accent/25 border-t-accent" />
            <div>
              <p className="text-[14px] font-bold text-accent">Bezig met zoeken naar woningen op Funda…</p>
              <p className="mt-1 text-[11.5px] text-accent/70">Dit kan tot een minuut duren -- we doorzoeken meerdere pagina's voor de volledige lijst.</p>
            </div>
          </div>
        ) : (
          <p className="border-t border-ink/[0.06] px-4 py-2 text-[10.5px] font-semibold text-accent">{melding}</p>
        ))}
    </div>
  );
}
