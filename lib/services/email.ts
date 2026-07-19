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

  const html = `
    <div style="font-family:sans-serif;color:#111827;line-height:1.5">
      <p>Hierbij het kooprapport voor <strong>${escapeHtml(input.adresLabel)}</strong>, als bijlage bij deze e-mail.</p>
      <p style="color:#6B7280;font-size:13px">Dit rapport is opgevraagd via kooprapport.nl. Heb je deze e-mail niet zelf aangevraagd, dan kun je 'm gewoon negeren.</p>
    </div>
  `;

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
