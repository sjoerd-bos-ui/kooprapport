// -----------------------------------------------------------------------------
// WhatsApp-verzending via Twilio's WhatsApp-API — zelfde aanpak als
// lib/services/email.ts (Resend): rechtstreeks fetch() tegen Twilio's REST-API,
// geen SDK erbij. Docs: https://www.twilio.com/docs/whatsapp/api
//
// BELANGRIJKE BEPERKING (WhatsApp Business Policy, niet iets wat wij kunnen
// omzeilen): een bericht dat WIJ als eerste starten (zoals een "nieuwe
// match"-melding, of de bevestigingsvraag zelf) mag alleen als vrije tekst
// ("Body") verstuurd worden binnen een 24-uurs sessievenster nadat de koper
// zelf voor het laatst iets naar het WhatsApp-nummer stuurde. Buiten dat
// venster (verreweg het gangbaarste geval hier: de koper heeft nooit zelf
// naar ons geschreven) MOET Meta een vooraf goedgekeurd berichtsjabloon
// gebruiken (Twilio noemt dit "Content API": ContentSid + ContentVariables
// i.p.v. Body). Zo'n sjabloon moet EENMALIG door Sjoerd zelf worden
// aangemaakt en goedgekeurd in de Twilio Console (Content Template Builder)
// -- dat kan niet via deze codebase geautomatiseerd worden. Vandaar de
// TWILIO_CONTENT_SID_*-omgevingsvariabelen hieronder: zonder een
// goedgekeurde sjabloon-SID valt dit terug op vrije tekst (Body), wat prima
// werkt in de Twilio Sandbox tijdens ontwikkelen, maar in productie buiten
// het sessievenster gewoon door Twilio geweigerd wordt (resultaat.ok: false).
// -----------------------------------------------------------------------------

const TWILIO_MESSAGES_URL = (accountSid: string) => `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

export interface StuurWhatsappResultaat {
  ok: boolean;
  error?: string;
}

// Zelfde soort bewust simpele, niet-RFC-volledige validatie als
// isGeldigEmailadres in email.ts -- genoeg om overduidelijk foute invoer af
// te vangen, geen poging tot een volledige internationale telefoonnummer-spec.
// Accepteert NL-notaties ("06 12345678", "0612345678", "+31612345678",
// "0031612345678") en normaliseert ze allemaal naar E.164 ("+31612345678"),
// het formaat dat Twilio verplicht. Geeft `null` terug bij iets dat er
// duidelijk niet op lijkt, zodat de aanroeper daar een foutmelding van kan
// maken i.p.v. straks stil te falen bij Twilio zelf.
export function naarE164Telefoonnummer(waarde: string): string | null {
  const cijfers = waarde.trim().replace(/[\s().-]/g, "");
  if (/^\+\d{8,15}$/.test(cijfers)) return cijfers;
  if (/^0031\d{9}$/.test(cijfers)) return `+31${cijfers.slice(4)}`;
  if (/^06\d{8}$/.test(cijfers)) return `+31${cijfers.slice(1)}`;
  if (/^0\d{9}$/.test(cijfers)) return `+31${cijfers.slice(1)}`;
  return null;
}

interface TwilioVerstuurInput {
  naar: string; // E.164, bv. "+31612345678"
  // Alleen gebruikt als er GEEN passende TWILIO_CONTENT_SID_* is
  // geconfigureerd (zie de toelichting bovenaan dit bestand) -- vrije tekst,
  // werkt alleen binnen het 24-uurs sessievenster of in de Sandbox.
  tekst: string;
  contentSid?: string;
  // Twilio verwacht dit als JSON-string, bv. {"1":"Jan","2":"3"}.
  contentVariabelen?: Record<string, string>;
}

async function verstuurViaTwilio(input: TwilioVerstuurInput): Promise<StuurWhatsappResultaat> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const van = process.env.TWILIO_WHATSAPP_FROM; // bv. "whatsapp:+14155238886"
  if (!accountSid || !authToken || !van) {
    return { ok: false, error: "WhatsApp-verzending is nog niet geconfigureerd." };
  }

  const body = new URLSearchParams({
    From: van.startsWith("whatsapp:") ? van : `whatsapp:${van}`,
    To: `whatsapp:${input.naar}`,
  });
  if (input.contentSid) {
    body.set("ContentSid", input.contentSid);
    if (input.contentVariabelen) body.set("ContentVariables", JSON.stringify(input.contentVariabelen));
  } else {
    body.set("Body", input.tekst);
  }

  const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const res = await fetch(TWILIO_MESSAGES_URL(accountSid), {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const tekst = await res.text().catch(() => "");
    console.error(`[whatsapp] Twilio gaf status ${res.status}:`, tekst);
    return { ok: false, error: "Versturen via WhatsApp is niet gelukt." };
  }
  return { ok: true };
}

export interface StuurKoperWhatsappBevestigingInput {
  naar: string; // E.164
  klantnaam: string;
  organisatieNaam: string;
  bevestigUrl: string;
}

// -----------------------------------------------------------------------------
// Dubbele-opt-in-bevestiging (zie types/b2b.ts: telefoonKoperBevestigd) --
// zelfde functie als stuurKoperMailBevestigingsEmail in email.ts, alleen dan
// als WhatsApp-bericht met een link i.p.v. een e-mail. Pas na een klik op
// bevestigUrl (app/api/koper-whatsapp/bevestigen/route.ts) mag de cron
// daadwerkelijk matchmeldingen sturen.
// -----------------------------------------------------------------------------
export async function stuurKoperWhatsappBevestiging(input: StuurKoperWhatsappBevestigingInput): Promise<StuurWhatsappResultaat> {
  const contentSid = process.env.TWILIO_CONTENT_SID_BEVESTIGING;
  const tekst =
    `Hoi ${input.klantnaam}, ${input.organisatieNaam} wil je via WhatsApp laten weten zodra er een nieuwe ` +
    `passende woning is gevonden. Bevestig dat hier: ${input.bevestigUrl}`;
  return verstuurViaTwilio({
    naar: input.naar,
    tekst,
    contentSid,
    contentVariabelen: contentSid ? { "1": input.klantnaam, "2": input.organisatieNaam, "3": input.bevestigUrl } : undefined,
  });
}

export interface NieuweMatchWhatsappItem {
  titel: string;
  url: string;
  prijsLabel: string | null;
}

export interface StuurNieuweMatchesKoperWhatsappInput {
  naar: string; // E.164
  klantnaam: string;
  organisatieNaam: string;
  matches: NieuweMatchWhatsappItem[];
}

// -----------------------------------------------------------------------------
// De kern van "eerste zijn" (zie het Cowork-gesprek "de grootste
// functionaliteiten waar we echt de markt mee opschudden"): wordt aangeroepen
// vanuit de cron (matches-controleren/route.ts) zodra er nieuwe matches
// gevonden zijn voor een dossier met whatsappBijNieuweMatches +
// telefoonKoperBevestigd. Bewust maar de eerste 3 matches noemen in het
// bericht zelf (WhatsApp-berichten horen kort te zijn, geen lange lijst) --
// bij meer dan 3 verwijst de laatste regel naar "en X andere" zonder link,
// de koper klikt door naar de eerste paar om meteen te kunnen reageren.
// -----------------------------------------------------------------------------
export async function stuurNieuweMatchesKoperWhatsapp(input: StuurNieuweMatchesKoperWhatsappInput): Promise<StuurWhatsappResultaat> {
  const contentSid = process.env.TWILIO_CONTENT_SID_NIEUWE_MATCHES;
  const aantal = input.matches.length;
  const getoond = input.matches.slice(0, 3);
  const regels = getoond.map((m) => `• ${m.titel}${m.prijsLabel ? ` — ${m.prijsLabel}` : ""}\n${m.url}`).join("\n\n");
  const restRegel = aantal > 3 ? `\n\nEn nog ${aantal - 3} andere -- bekijk ze via je zoekopdracht bij ${input.organisatieNaam}.` : "";

  const tekst =
    `Hoi ${input.klantnaam}, ${aantal} ${aantal === 1 ? "nieuwe woning past" : "nieuwe woningen passen"} bij je wensen ` +
    `(via ${input.organisatieNaam}):\n\n${regels}${restRegel}`;

  return verstuurViaTwilio({
    naar: input.naar,
    tekst,
    contentSid,
    contentVariabelen: contentSid
      ? {
          "1": input.klantnaam,
          "2": String(aantal),
          "3": input.organisatieNaam,
          "4": getoond[0]?.titel ?? "",
          "5": getoond[0]?.url ?? "",
        }
      : undefined,
  });
}
