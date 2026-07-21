// -----------------------------------------------------------------------------
// E-mailverzending via Resend — rechtstreeks met fetch() tegen hun REST-API,
// zelfde aanpak als de rest van deze app (Upstash, Mollie): geen SDK erbij,
// zodat er geen extra npm-installatie nodig is en de aanroep expliciet en
// controleerbaar blijft. Docs: https://resend.com/docs/api-reference/emails/send-email
// -----------------------------------------------------------------------------

import { APP_BASE_URL } from "@/lib/config/payment";

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
