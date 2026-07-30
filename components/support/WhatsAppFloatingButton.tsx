"use client";

import { bouwWhatsAppLink, heeftWhatsAppSupport } from "@/lib/config/whatsapp";

// -----------------------------------------------------------------------------
// Zwevende WhatsApp-contactknop, site-breed gemonteerd in app/layout.tsx —
// expliciet bedoeld als vertrouwenselement ("makkelijk te contacten"), niet
// puur als supportkanaal. Daarom altijd zichtbaar (geen twijfel-vertraging
// zoals EmailBewaarOptie.tsx: dat element mag pas concurreren met een knop
// erboven zodra iemand twijfelt, dit element is juist bedoeld om vanaf het
// begin gerust te stellen).
//
// Rendert bewust NIETS zolang er geen echt nummer geconfigureerd is (zie
// lib/config/whatsapp.ts) — een zwevende knop die naar een kapotte/lege
// wa.me-link linkt zou precies het omgekeerde van vertrouwen wekken.
//
// z-40: onder de betaalmodal (z-50, zie PaywallModal.tsx) zodat de knop
// nooit over een open modal heen blijft zweven.
export default function WhatsAppFloatingButton() {
  if (!heeftWhatsAppSupport()) return null;

  return (
    <a
      href={bouwWhatsAppLink("Hoi, ik heb een vraag over Kooprapport")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Stuur ons een WhatsApp-bericht"
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 sm:bottom-6 sm:right-6"
    >
      <span className="hidden rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-white shadow-overlay sm:inline-block">
        Vragen? App ons direct
      </span>
      <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[#25D366] shadow-overlay transition-transform hover:scale-105">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="#fff" aria-hidden="true">
          <path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.5.1-.3-.1-1.2-.4-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.2-.4.1-.1 0-.3 0-.4-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.1 0 1.2.9 2.4 1 2.6.1.1 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1-.1-.2-.2-.5-.3Z" />
          <path d="M20.5 3.5A11 11 0 0 0 3.1 16.9L2 21.5l4.7-1.2a11 11 0 0 0 5.3 1.4h.1a11 11 0 0 0 8.4-18.2Zm-8.4 16.8h-.1a9.1 9.1 0 0 1-4.6-1.3l-.3-.2-3.1.8.8-3-.2-.3a9.1 9.1 0 1 1 16.9-4.7 9.1 9.1 0 0 1-9.4 8.7Z" />
        </svg>
      </span>
    </a>
  );
}
