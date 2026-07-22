import { kvGet, kvSet } from "@/lib/services/kvStore";
import { berekenKortingBedragCenten } from "@/lib/utils/prijs";

// -----------------------------------------------------------------------------
// Handmatig invoerbare kortingscodes ("WELKOM15") -- ANDERS dan het
// ondertekende kortingstoken in kortingToken.ts (dat is automatisch, per
// adres, uit de herinneringsmail). Dit hier is voor codes die JIJ zelf
// verzint en uitdeelt: aan jezelf om te testen, of aan mensen (vrienden,
// social media, promo). Niet gebonden aan één adres -- werkt voor elk
// adres, want een marketingcode is bedoeld om breed te delen.
//
// Opslag: gewoon in de al bestaande KV-store (Upstash live / in-memory
// lokaal) als JSON per code, met een TTL die gelijkloopt met de
// geldigheidsdatum -- een verlopen code ruimt zichzelf dus ook in Redis op.
//
// EERLIJKE BEPERKING (zoals ook elders in deze store gedocumenteerd, bv.
// kvIncrWithTtl): het aantal-keer-gebruikt wordt bijgewerkt met een
// lees-verhoog-schrijf, niet met een atomaire Redis-transactie. Bij een
// paar losse marketingcodes die af en toe worden ingewisseld (niet
// honderden gelijktijdige aanmeldingen op exact hetzelfde moment) is de
// kans op een gemiste telling verwaarloosbaar; een striktere aanpak (Lua-
// script/transactie) is bewust niet gebouwd omdat dat voor dit gebruik
// meer complexiteit toevoegt dan het oplost.
// -----------------------------------------------------------------------------

interface KortingscodeData {
  percentage: number;
  maxGebruik: number;
  gebruikt: number;
  geldigTot: number; // unix ms
}

function sleutel(code: string): string {
  return `kortingscode:${code.trim().toUpperCase()}`;
}

export function normaliseerKortingscode(code: string): string {
  return code.trim().toUpperCase();
}

export async function maakKortingscode(
  codeRuw: string,
  percentage: number,
  maxGebruik: number,
  geldigDagen: number
): Promise<{ code: string; geldigTot: number }> {
  const code = normaliseerKortingscode(codeRuw);
  const geldigTot = Date.now() + geldigDagen * 24 * 60 * 60 * 1000;
  const data: KortingscodeData = { percentage, maxGebruik, gebruikt: 0, geldigTot };
  const ttlSeconden = Math.max(60, Math.round((geldigTot - Date.now()) / 1000));
  await kvSet(sleutel(code), JSON.stringify(data), ttlSeconden);
  return { code, geldigTot };
}

export interface KortingscodeVerificatie {
  geldig: boolean;
  reden?: "niet-gevonden" | "verlopen" | "limiet-bereikt";
  percentage?: number;
  bedragCenten?: number;
}

// ALLEEN-LEZEN check -- gebruikt door de "toon de prijs voordat je betaalt"-
// stap (app/api/betaling/kortingscode/route.ts), verhoogt het gebruik NIET.
export async function verifieerKortingscode(codeRuw: string): Promise<KortingscodeVerificatie> {
  const ruw = await kvGet(sleutel(codeRuw));
  if (!ruw) return { geldig: false, reden: "niet-gevonden" };

  let data: KortingscodeData;
  try {
    data = JSON.parse(ruw);
  } catch {
    return { geldig: false, reden: "niet-gevonden" };
  }

  if (Date.now() > data.geldigTot) return { geldig: false, reden: "verlopen" };
  if (data.gebruikt >= data.maxGebruik) return { geldig: false, reden: "limiet-bereikt" };

  return { geldig: true, percentage: data.percentage, bedragCenten: berekenKortingBedragCenten(data.percentage) };
}

// Wordt ALLEEN aangeroepen bij het daadwerkelijk aanmaken van een bestelling
// (/api/betaling/aanmaken) -- verhoogt "gebruikt" met 1 als de code op dat
// moment nog geldig is. Zelfde optimistische moment als de rest van de
// betaalflow (de bestelling wordt ook al aangemaakt vóórdat Mollie de
// betaling heeft bevestigd), dus consistent met hoe de rest van de app
// telt.
export async function verifieerEnVerbruikKortingscode(codeRuw: string): Promise<KortingscodeVerificatie> {
  const key = sleutel(codeRuw);
  const ruw = await kvGet(key);
  if (!ruw) return { geldig: false, reden: "niet-gevonden" };

  let data: KortingscodeData;
  try {
    data = JSON.parse(ruw);
  } catch {
    return { geldig: false, reden: "niet-gevonden" };
  }

  if (Date.now() > data.geldigTot) return { geldig: false, reden: "verlopen" };
  if (data.gebruikt >= data.maxGebruik) return { geldig: false, reden: "limiet-bereikt" };

  data.gebruikt += 1;
  const ttlSeconden = Math.max(60, Math.round((data.geldigTot - Date.now()) / 1000));
  await kvSet(key, JSON.stringify(data), ttlSeconden);

  return { geldig: true, percentage: data.percentage, bedragCenten: berekenKortingBedragCenten(data.percentage) };
}
