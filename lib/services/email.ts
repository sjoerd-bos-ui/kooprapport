// -----------------------------------------------------------------------------
// E-mailverzending via Resend — rechtstreeks met fetch() tegen hun REST-API,
// zelfde aanpak als de rest van deze app (Upstash, Mollie): geen SDK erbij,
// zodat er geen extra npm-installatie nodig is en de aanroep expliciet en
// controleerbaar blijft. Docs: https://resend.com/docs/api-reference/emails/send-email
// -----------------------------------------------------------------------------

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
  return `<!DOCTYPE html>
<html lang="nl">
  <body style="margin:0;padding:0;background-color:#F5F5FA;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F5FA;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #EEF0FF;">
            <tr>
              <td style="background-color:#1F1F2E;padding:24px 32px;">
                <span style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">Kooprapport</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1F1F2E;">Hallo,</p>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#1F1F2E;">
                  Hierbij het kooprapport voor <strong>${adres}</strong>, als PDF-bijlage bij deze e-mail.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="background-color:#EEF0FF;border-radius:12px;width:100%;">
                  <tr>
                    <td style="padding:16px 20px;font-size:14px;line-height:1.5;color:#4338CA;font-weight:600;">
                      📄 kooprapport-${adres}.pdf
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6B7280;">
                  Dit rapport is opgevraagd via kooprapport.nl. Heb je deze e-mail niet zelf aangevraagd, dan kun je 'm gewoon negeren.
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
