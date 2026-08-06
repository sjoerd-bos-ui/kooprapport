// -----------------------------------------------------------------------------
// E-mailverzending via Resend — rechtstreeks met fetch() tegen hun REST-API,
// zelfde aanpak als de rest van deze app (Upstash, Mollie): geen SDK erbij,
// zodat er geen extra npm-installatie nodig is en de aanroep expliciet en
// controleerbaar blijft. Docs: https://resend.com/docs/api-reference/emails/send-email
// -----------------------------------------------------------------------------

import { APP_BASE_URL } from "@/lib/config/payment";
import { RAPPORT_PRIJS } from "@/lib/utils/prijs";

const RESEND_API_URL = "https://api.resend.com/emails";

export interface StuurRapportEmailInput {
  naar: string;
  adresLabel: string;
  bestandsnaam: string;
  pdfBuffer: Buffer;
}

export interface StuurRapportEmailResultaat {
  ok: boolean;
  error?: string;
}

// Simpele, bewust strikte e-mailcheck — geen volledige RFC 5322-validatie
// (die is notoir onbetrouwbaar), maar wel genoeg om overduidelijk foute
// invoer ("test", "iemand@") vóór de Resend-aanroep af te vangen.
export function isGeldigEmailadres(waarde: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(waarde.trim());
}

export async function stuurRapportEmail(input: StuurRapportEmailInput): Promise<StuurRapportEmailResultaat> {
  const apiKey = process.env.RESEND_API_KEY;
  const van = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !van) {
    // Geen sleutel geconfigureerd — nooit stil een fout rapport tonen alsof
    // het gelukt is (zelfde eerlijkheidsprincipe als de databronnen).
    return { ok: false, error: "E-mailverzending is nog niet geconfigureerd." };
  }

  const html = buildRapportEmailHtml(input.adresLabel);

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: van,
      to: [input.naar],
      subject: `Kooprapport — ${input.adresLabel}`,
      html,
      attachments: [
        {
          filename: input.bestandsnaam,
          content: input.pdfBuffer.toString("base64"),
        },
      ],
    }),
  });

  if (!res.ok) {
    const tekst = await res.text().catch(() => "");
    console.error(`[email] Resend gaf status ${res.status}:`, tekst);
    return { ok: false, error: "Versturen is niet gelukt. Probeer het later opnieuw." };
  }

  return { ok: true };
}

export interface StuurPreviewEmailInput {
  naar: string;
  adresLabel: string;
  previewUrl: string;
}

// -----------------------------------------------------------------------------
// "Bewaar dit rapport in uw mail" op de GRATIS preview (vóór ontgrendelen) —
// bewust een ANDERE functie dan stuurRapportEmail hierboven: er is op dit
// moment nog geen betaald Report-object en dus ook geen PDF om bij te
// voegen. Deze mail bevat alleen een terugkeerlink naar dezelfde
// preview-pagina (report.core.address.slug-gebaseerde canonical URL), zodat
// iemand die twijfelt het adres later makkelijk terugvindt. Zelfde
// rate-limit-toepassing als bij de premium e-mail (zie
// app/api/rapport/preview-email/route.ts).
// -----------------------------------------------------------------------------
export async function stuurPreviewEmail(input: StuurPreviewEmailInput): Promise<StuurRapportEmailResultaat> {
  const apiKey = process.env.RESEND_API_KEY;
  const van = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !van) {
    return { ok: false, error: "E-mailverzending is nog niet geconfigureerd." };
  }

  const html = buildPreviewEmailHtml(input.adresLabel, input.previewUrl);

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: van,
      to: [input.naar],
      subject: `Uw preview voor ${input.adresLabel} staat klaar`,
      html,
    }),
  });

  if (!res.ok) {
    const tekst = await res.text().catch(() => "");
    console.error(`[email] Resend gaf status ${res.status} (preview-mail):`, tekst);
    return { ok: false, error: "Versturen is niet gelukt. Probeer het later opnieuw." };
  }

  return { ok: true };
}

function buildPreviewEmailHtml(adresLabel: string, previewUrl: string): string {
  const adres = escapeHtml(adresLabel);
  const link = escapeHtml(previewUrl);
  const logoUrl = `${APP_BASE_URL}/logo-email.png`;
  return `<!DOCTYPE html>
<html lang="nl">
  <body style="margin:0;padding:0;background-color:#F5F5FA;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F5FA;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #EEF0FF;">
            <tr>
              <td style="background-color:#1F1F2E;padding:22px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:10px;">
                      <img src="${logoUrl}" width="32" height="32" alt="" style="display:block;border-radius:9px;" />
                    </td>
                    <td>
                      <span style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">Kooprapport</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#4F46E5;">
                  Bewaard voor u
                </p>
                <p style="margin:0 0 18px;font-size:20px;line-height:1.4;font-weight:700;color:#1F1F2E;">
                  Uw preview voor ${adres} staat klaar
                </p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#1F1F2E;">
                  U bekeek zojuist de gratis preview voor dit adres. Onderstaande link brengt u er zo weer terug,
                  inclusief de optie om het volledige rapport alsnog te ontgrendelen.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                  <tr>
                    <td align="center" style="border-radius:10px;background-color:#4F46E5;">
                      <a href="${link}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
                        Bekijk uw preview
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6B7280;">
                  Deze e-mail is opgevraagd via kooprapport.nl. Heeft u 'm niet zelf aangevraagd, dan kunt u 'm
                  gewoon negeren, er verandert verder niets.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#F5F5FA;border-top:1px solid #EEF0FF;">
                <p style="margin:0 0 4px;font-size:12px;line-height:1.6;color:#9CA3AF;">
                  Kooprapport · KvK 87451387 · Pleinweg 66D, 3083 EH Rotterdam
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#9CA3AF;">
                  <a href="mailto:info@kooprapport.nl" style="color:#4F46E5;text-decoration:none;">info@kooprapport.nl</a> ·
                  <a href="https://kooprapport.nl" style="color:#4F46E5;text-decoration:none;">kooprapport.nl</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export interface StuurHerinneringEmailInput {
  naar: string;
  adresLabel: string;
  previewUrl: string;
  // undefined = geen (werkende) korting beschikbaar (bv. KORTING_SECRET niet
  // gezet) -- de mail wordt dan verstuurd ZONDER kortingsblok. Nooit een
  // korting tonen die bij het afrekenen niet ook echt wordt gehonoreerd, zie
  // lib/utils/kortingToken.ts.
  korting?: { percentage: number; bedragCenten: number };
  // Volledige URL (incl. APP_BASE_URL) naar app/afmelden/route.ts — verplicht,
  // geen optionele/weggelaten afmeldlink: dit is de enige e-mail in de app die
  // ongevraagd (48u later, zonder nieuwe actie van de klant) opnieuw contact
  // opneemt en een kortingsactie bevat, en hoort daarom altijd een opt-out te
  // hebben. Zie app/api/cron/reminder-email/route.ts voor hoe deze wordt
  // opgebouwd (lib/utils/afmeldLink.ts).
  afmeldUrl: string;
}

// -----------------------------------------------------------------------------
// Herinnering ~48 uur na "bewaar dit rapport in uw mail" (zie
// app/api/rapport/preview-email/route.tsx voor de wachtrij, app/api/cron/
// reminder-email/route.ts voor de verzending zelf). Recapituleert wat de
// gebruiker al gratis zag, toont wat er nog klaarstaat, en -- alleen als
// KORTING_SECRET geconfigureerd is -- een echte, tijdelijke korting. Bewust
// GEEN nepschaarste/nep-aftellers: de korting hier is een reëel, aflopend
// bedrag, precies zoals ook elders in de app nooit een verzonnen cijfer wordt
// getoond (zie de FAQ: "we verzinnen nooit cijfers").
// -----------------------------------------------------------------------------
export async function stuurHerinneringEmail(input: StuurHerinneringEmailInput): Promise<StuurRapportEmailResultaat> {
  const apiKey = process.env.RESEND_API_KEY;
  const van = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !van) {
    return { ok: false, error: "E-mailverzending is nog niet geconfigureerd." };
  }

  const html = buildHerinneringEmailHtml(input.adresLabel, input.previewUrl, input.korting, input.afmeldUrl);
  const onderwerp = input.korting
    ? `Nog interesse in ${input.adresLabel}? ${input.korting.percentage}% korting, 24 uur geldig`
    : `Uw rapport voor ${input.adresLabel} wacht nog op u`;

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: van,
      to: [input.naar],
      subject: onderwerp,
      html,
    }),
  });

  if (!res.ok) {
    const tekst = await res.text().catch(() => "");
    console.error(`[email] Resend gaf status ${res.status} (herinnering-mail):`, tekst);
    return { ok: false, error: "Versturen is niet gelukt. Probeer het later opnieuw." };
  }

  return { ok: true };
}

function buildHerinneringEmailHtml(
  adresLabel: string,
  previewUrl: string,
  korting: { percentage: number; bedragCenten: number } | undefined,
  afmeldUrl: string
): string {
  const adres = escapeHtml(adresLabel);
  const link = escapeHtml(previewUrl);
  const afmeld = escapeHtml(afmeldUrl);
  const logoUrl = `${APP_BASE_URL}/logo-email.png`;

  const kortingBlok = korting
    ? `<tr><td style="padding:0 32px 20px;">
         <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background-color:#1F1F2E;border-radius:12px;">
           <tr><td style="padding:16px 18px;">
             <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:#9A96FF;text-transform:uppercase;letter-spacing:0.05em;">24 uur geldig</p>
             <p style="margin:0;font-size:14px;color:#ffffff;">
               Ontgrendel nu voor <span style="text-decoration:line-through;color:#8A8A9A;">${RAPPORT_PRIJS}</span>
               <strong style="color:#ffffff;">€${(korting.bedragCenten / 100).toFixed(2).replace(".", ",")}</strong>
             </p>
           </td></tr>
         </table>
       </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="nl">
  <body style="margin:0;padding:0;background-color:#F5F5FA;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F5FA;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #EEF0FF;">
            <tr>
              <td style="background-color:#1F1F2E;padding:22px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:10px;">
                      <img src="${logoUrl}" width="32" height="32" alt="" style="display:block;border-radius:9px;" />
                    </td>
                    <td>
                      <span style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">Kooprapport</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 8px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#4F46E5;">
                  Nog steeds interesse?
                </p>
                <p style="margin:0 0 14px;font-size:19px;line-height:1.4;font-weight:700;color:#1F1F2E;">
                  ${adres} wacht nog op u
                </p>
                <p style="margin:0 0 20px;font-size:13.5px;line-height:1.6;color:#1F1F2E;">
                  U bekeek de gratis preview voor dit adres. De waarde-indicatie, vergelijkbare verkopen in de buurt
                  en het volledige buurtprofiel staan nog klaar, samen met 5 andere onderdelen.
                </p>
              </td>
            </tr>
            ${kortingBlok}
            <tr>
              <td style="padding:0 32px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                  <tr>
                    <td align="center" style="border-radius:10px;background-color:#4F46E5;">
                      <a href="${link}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
                        ${korting ? "Ontgrendel nu met korting" : "Bekijk uw rapport"}
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#9CA3AF;">
                  Deze e-mail is opgevraagd via kooprapport.nl. Niet zelf aangevraagd? Dan kunt u 'm negeren.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#F5F5FA;border-top:1px solid #EEF0FF;">
                <p style="margin:0 0 4px;font-size:12px;line-height:1.6;color:#9CA3AF;">
                  Kooprapport · KvK 87451387 · Pleinweg 66D, 3083 EH Rotterdam
                </p>
                <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#9CA3AF;">
                  <a href="mailto:info@kooprapport.nl" style="color:#4F46E5;text-decoration:none;">info@kooprapport.nl</a> ·
                  <a href="https://kooprapport.nl" style="color:#4F46E5;text-decoration:none;">kooprapport.nl</a>
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#9CA3AF;">
                  <a href="${afmeld}" style="color:#9CA3AF;text-decoration:underline;">Geen herinnering meer ontvangen</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export interface StuurMarktupdateBevestigingsEmailInput {
  naar: string;
  bevestigUrl: string;
}

// -----------------------------------------------------------------------------
// Dubbele-opt-in-bevestigingsmail voor de Marktupdates-nieuwsbrief (zie
// lib/services/marktupdateAbonnees.ts en app/api/marktupdates/abonneren/
// route.ts). Bewust GEEN meteen-abonneren: pas na een klik op de link hierin
// wordt iemand echt abonnee, zodat niemand ongevraagd wordt aangemeld.
// -----------------------------------------------------------------------------
export async function stuurMarktupdateBevestigingsEmail(
  input: StuurMarktupdateBevestigingsEmailInput
): Promise<StuurRapportEmailResultaat> {
  const apiKey = process.env.RESEND_API_KEY;
  const van = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !van) {
    return { ok: false, error: "E-mailverzending is nog niet geconfigureerd." };
  }

  const html = buildMarktupdateBevestigingsEmailHtml(input.bevestigUrl);

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: van,
      to: [input.naar],
      subject: "Bevestig uw aanmelding voor de Marktupdates",
      html,
    }),
  });

  if (!res.ok) {
    const tekst = await res.text().catch(() => "");
    console.error(`[email] Resend gaf status ${res.status} (marktupdate-bevestiging):`, tekst);
    return { ok: false, error: "Versturen is niet gelukt. Probeer het later opnieuw." };
  }

  return { ok: true };
}

function buildMarktupdateBevestigingsEmailHtml(bevestigUrl: string): string {
  const link = escapeHtml(bevestigUrl);
  const logoUrl = `${APP_BASE_URL}/logo-email.png`;
  return `<!DOCTYPE html>
<html lang="nl">
  <body style="margin:0;padding:0;background-color:#F5F5FA;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F5FA;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #EEF0FF;">
            <tr>
              <td style="background-color:#1F1F2E;padding:22px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:10px;">
                      <img src="${logoUrl}" width="32" height="32" alt="" style="display:block;border-radius:9px;" />
                    </td>
                    <td>
                      <span style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">Kooprapport</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#4F46E5;">
                  Nog één stap
                </p>
                <p style="margin:0 0 18px;font-size:20px;line-height:1.4;font-weight:700;color:#1F1F2E;">
                  Bevestig uw aanmelding voor de Marktupdates
                </p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#1F1F2E;">
                  Klik op onderstaande knop om te bevestigen dat u elk kwartaal de nieuwe cijfers over de
                  woningmarkt in uw inbox wilt ontvangen. Zonder deze bevestiging ontvangt u niets.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                  <tr>
                    <td align="center" style="border-radius:10px;background-color:#4F46E5;">
                      <a href="${link}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
                        Bevestig aanmelding
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6B7280;">
                  Deze e-mail is aangevraagd via kooprapport.nl. Heeft u dit niet zelf aangevraagd, dan kunt u 'm
                  gewoon negeren, er verandert dan niets.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#F5F5FA;border-top:1px solid #EEF0FF;">
                <p style="margin:0 0 4px;font-size:12px;line-height:1.6;color:#9CA3AF;">
                  Kooprapport · KvK 87451387 · Pleinweg 66D, 3083 EH Rotterdam
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#9CA3AF;">
                  <a href="mailto:info@kooprapport.nl" style="color:#4F46E5;text-decoration:none;">info@kooprapport.nl</a> ·
                  <a href="https://kooprapport.nl" style="color:#4F46E5;text-decoration:none;">kooprapport.nl</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export interface StuurB2bUitnodigingEmailInput {
  naar: string;
  orgNaam: string;
  uitgenodigdDoorNaam: string;
  uitnodigingUrl: string;
}

// -----------------------------------------------------------------------------
// Teamuitnodiging voor "Kooprapport Zakelijk" (zie lib/services/b2bStore.ts:
// maakUitnodiging, en app/zakelijk/(auth)/uitnodiging/[token]/page.tsx voor
// de acceptatiepagina). Zelfde tabel-gebaseerde template als de rest van
// email.ts, alleen met de donkere kop i.p.v. het Kooprapport-logo -- dit is
// een interne, zakelijke uitnodiging, geen consumentenmail.
// -----------------------------------------------------------------------------
export async function stuurB2bUitnodigingEmail(input: StuurB2bUitnodigingEmailInput): Promise<StuurRapportEmailResultaat> {
  const apiKey = process.env.RESEND_API_KEY;
  const van = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !van) {
    return { ok: false, error: "E-mailverzending is nog niet geconfigureerd." };
  }

  const orgNaam = escapeHtml(input.orgNaam);
  const doorNaam = escapeHtml(input.uitgenodigdDoorNaam);
  const link = escapeHtml(input.uitnodigingUrl);

  const html = `<!DOCTYPE html>
<html lang="nl">
  <body style="margin:0;padding:0;background-color:#F5F5FA;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F5FA;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #EEF0FF;">
            <tr>
              <td style="background-color:#1F1F2E;padding:22px 32px;">
                <span style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">Kooprapport Zakelijk</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#4F46E5;">
                  Uitnodiging
                </p>
                <p style="margin:0 0 18px;font-size:20px;line-height:1.4;font-weight:700;color:#1F1F2E;">
                  ${doorNaam} nodigt u uit voor ${orgNaam}
                </p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#1F1F2E;">
                  Stel een wachtwoord in om toegang te krijgen tot het Kooprapport Zakelijk-dashboard van ${orgNaam}.
                  Deze link is 7 dagen geldig.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                  <tr>
                    <td align="center" style="border-radius:10px;background-color:#4F46E5;">
                      <a href="${link}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
                        Account activeren
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6B7280;">
                  Verwachtte u deze uitnodiging niet? Dan kunt u 'm gewoon negeren.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#F5F5FA;border-top:1px solid #EEF0FF;">
                <p style="margin:0 0 4px;font-size:12px;line-height:1.6;color:#9CA3AF;">
                  Kooprapport · KvK 87451387 · Pleinweg 66D, 3083 EH Rotterdam
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#9CA3AF;">
                  <a href="mailto:info@kooprapport.nl" style="color:#4F46E5;text-decoration:none;">info@kooprapport.nl</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: van, to: [input.naar], subject: `Uitnodiging voor ${input.orgNaam} op Kooprapport Zakelijk`, html }),
  });

  if (!res.ok) {
    const tekst = await res.text().catch(() => "");
    console.error(`[email] Resend gaf status ${res.status} (b2b-uitnodiging):`, tekst);
    return { ok: false, error: "Versturen is niet gelukt. Probeer het later opnieuw." };
  }
  return { ok: true };
}

export interface NieuweMatchEmailItem {
  titel: string;
  url: string;
  prijsLabel: string | null;
}

export interface StuurNieuweMatchesEmailInput {
  naar: string;
  klantnaam: string;
  dossierUrl: string;
  matches: NieuweMatchEmailItem[];
}

// -----------------------------------------------------------------------------
// Melding aan de makelaar/adviseur bij nieuwe woningmatches (#2, zie
// app/api/cron/matches-controleren/route.ts) -- zelfde tabel-gebaseerde
// template als stuurB2bUitnodigingEmail hierboven, met de matches als een
// simpele lijst (de e-mail zelf hoeft geen fotokaarten te tonen, dat gebeurt
// al in het dashboard -- hier is snel doorklikken naar het dossier het doel).
// -----------------------------------------------------------------------------
export async function stuurNieuweMatchesEmail(input: StuurNieuweMatchesEmailInput): Promise<StuurRapportEmailResultaat> {
  const apiKey = process.env.RESEND_API_KEY;
  const van = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !van) {
    return { ok: false, error: "E-mailverzending is nog niet geconfigureerd." };
  }

  const klantnaam = escapeHtml(input.klantnaam);
  const dossierUrl = escapeHtml(input.dossierUrl);
  const aantal = input.matches.length;

  const matchRegels = input.matches
    .map(
      (m) =>
        `<tr><td style="padding:10px 0;border-top:1px solid #EEF0FF;">
          <a href="${escapeHtml(m.url)}" style="font-size:14px;font-weight:600;color:#1F1F2E;text-decoration:none;">${escapeHtml(m.titel)}</a>
          ${m.prijsLabel ? `<div style="margin-top:2px;font-size:13px;color:#6B7280;">${escapeHtml(m.prijsLabel)}</div>` : ""}
        </td></tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="nl">
  <body style="margin:0;padding:0;background-color:#F5F5FA;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F5FA;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #EEF0FF;">
            <tr>
              <td style="background-color:#1F1F2E;padding:22px 32px;">
                <span style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">Kooprapport Zakelijk</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#4F46E5;">
                  Nieuwe matches
                </p>
                <p style="margin:0 0 18px;font-size:20px;line-height:1.4;font-weight:700;color:#1F1F2E;">
                  ${aantal} ${aantal === 1 ? "nieuwe woning past" : "nieuwe woningen passen"} bij de zoekopdracht van ${klantnaam}
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
                  ${matchRegels}
                </table>
                <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-top:24px;">
                  <tr>
                    <td align="center" style="border-radius:10px;background-color:#4F46E5;">
                      <a href="${dossierUrl}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
                        Bekijk dossier
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#F5F5FA;border-top:1px solid #EEF0FF;">
                <p style="margin:0 0 4px;font-size:12px;line-height:1.6;color:#9CA3AF;">
                  Kooprapport · KvK 87451387 · Pleinweg 66D, 3083 EH Rotterdam
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#9CA3AF;">
                  <a href="mailto:info@kooprapport.nl" style="color:#4F46E5;text-decoration:none;">info@kooprapport.nl</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: van,
      to: [input.naar],
      subject: `${aantal} ${aantal === 1 ? "nieuwe match" : "nieuwe matches"} voor ${input.klantnaam}`,
      html,
    }),
  });

  if (!res.ok) {
    const tekst = await res.text().catch(() => "");
    console.error(`[email] Resend gaf status ${res.status} (nieuwe-matches):`, tekst);
    return { ok: false, error: "Versturen is niet gelukt. Probeer het later opnieuw." };
  }
  return { ok: true };
}

// -----------------------------------------------------------------------------
// Interne melding naar Sjoerd bij een tier-wijzigingsverzoek (zie
// app/api/zakelijk/abonnement/wijzigen/route.ts) -- er is geen automatische
// Mollie-incasso voor abonnementen (alleen eenmalige betalingen, zie
// lib/config/payment.ts), dus dit is bewust een "kom in actie"-mail, geen
// bevestiging aan de klant dat er al iets geregeld is.
// -----------------------------------------------------------------------------
export async function stuurTierWijzigingsverzoekEmail(input: {
  orgNaam: string;
  huidigeTierLabel: string;
  gewensteTierLabel: string;
  aangevraagdDoorNaam: string;
  aangevraagdDoorEmail: string;
}): Promise<StuurRapportEmailResultaat> {
  const apiKey = process.env.RESEND_API_KEY;
  const van = process.env.RESEND_FROM_EMAIL;
  const naar = process.env.ADMIN_NOTIFICATION_EMAIL || "info@kooprapport.nl";
  if (!apiKey || !van) {
    return { ok: false, error: "E-mailverzending is nog niet geconfigureerd." };
  }

  const html = `<p>${escapeHtml(input.orgNaam)} (${escapeHtml(input.aangevraagdDoorNaam)}, ${escapeHtml(input.aangevraagdDoorEmail)}) vraagt een wijziging aan van
    <strong>${escapeHtml(input.huidigeTierLabel)}</strong> naar <strong>${escapeHtml(input.gewensteTierLabel)}</strong>.</p>`;

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: van, to: [naar], subject: `Tier-wijziging aangevraagd: ${input.orgNaam}`, html }),
  });

  if (!res.ok) {
    const tekst = await res.text().catch(() => "");
    console.error(`[email] Resend gaf status ${res.status} (tier-wijziging):`, tekst);
    return { ok: false, error: "Versturen is niet gelukt." };
  }
  return { ok: true };
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// -----------------------------------------------------------------------------
// Merk-huisstijl e-mailtemplate — tabel-gebaseerde layout met inline styles
// (geen flexbox/grid/externe CSS), want e-mailclients zoals Outlook renderen
// moderne CSS onbetrouwbaar. Kleuren komen 1-op-1 uit tailwind.config.ts:
// accent #4F46E5 / accent-dark #4338CA, ink #1F1F2E, parchment #F5F5FA,
// mist #EEF0FF. Bedrijfsgegevens onderaan zijn de echte, publieke gegevens
// van app/contact/page.tsx — een compleet, herkenbaar afzenderprofiel oogt
// betrouwbaarder voor spamfilters dan een kale bijlage-mail.
// -----------------------------------------------------------------------------
function buildRapportEmailHtml(adresLabel: string): string {
  const adres = escapeHtml(adresLabel);
  const logoUrl = `${APP_BASE_URL}/logo-email.png`;
  return `<!DOCTYPE html>
<html lang="nl">
  <body style="margin:0;padding:0;background-color:#F5F5FA;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F5FA;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #EEF0FF;">
            <tr>
              <td style="background-color:#1F1F2E;padding:22px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:10px;">
                      <img src="${logoUrl}" width="32" height="32" alt="" style="display:block;border-radius:9px;" />
                    </td>
                    <td>
                      <span style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">Kooprapport</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#4F46E5;">
                  Uw rapport is onderweg
                </p>
                <p style="margin:0 0 18px;font-size:20px;line-height:1.4;font-weight:700;color:#1F1F2E;">
                  Klaar voor ${adres} 🎉
                </p>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#1F1F2E;">
                  Zoals gevraagd: hierbij het volledige kooprapport, als PDF-bijlage bij deze e-mail. Alles wat u
                  moet weten over deze woning staat erin, klaar om rustig door te nemen wanneer het u uitkomt.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="background-color:#EEF0FF;border-radius:12px;width:100%;">
                  <tr>
                    <td style="padding:16px 20px;font-size:14px;line-height:1.5;color:#4338CA;font-weight:600;">
                      📄 kooprapport-${adres}.pdf
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6B7280;">
                  Deze e-mail is opgevraagd via kooprapport.nl. Heeft u 'm niet zelf aangevraagd, dan kunt u 'm
                  gewoon negeren, er verandert verder niets.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#F5F5FA;border-top:1px solid #EEF0FF;">
                <p style="margin:0 0 4px;font-size:12px;line-height:1.6;color:#9CA3AF;">
                  Kooprapport · KvK 87451387 · Pleinweg 66D, 3083 EH Rotterdam
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#9CA3AF;">
                  <a href="mailto:info@kooprapport.nl" style="color:#4F46E5;text-decoration:none;">info@kooprapport.nl</a> ·
                  <a href="https://kooprapport.nl" style="color:#4F46E5;text-decoration:none;">kooprapport.nl</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
