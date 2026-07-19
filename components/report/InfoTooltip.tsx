"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Kleine, generieke "i"-uitlegknop. Klik-gestuurd (niet alleen hover), zodat
// het ook op touchscreens werkt. Geen library nodig voor iets dit kleins.
//
// De pop-up wordt via een portal in document.body gerenderd i.p.v. relatief
// binnen deze span. Reden: op de plekken waar deze knop staat (bv. de
// statistiektegels in ReportHero) zit een voorouder-element met
// `overflow-hidden` (nodig voor de afgeronde hoeken van die tegels) — een
// gewoon absoluut gepositioneerd pop-upvlak werd daardoor onzichtbaar
// afgesneden, ook al ging de open-state wel degelijk aan. Positie wordt
// live berekend vanaf de knop, dus die overflow-clipping speelt niet meer.
export default function InfoTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setCoords({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
  }, [open]);

  // Sluiten bij scrollen/resizen: de pop-up is `fixed` t.o.v. het viewport,
  // dus zonder dit zou hij los van de knop kunnen komen te hangen.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <span className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-ink/30 text-[10px] font-semibold text-ink/50 transition-colors hover:border-ink hover:text-ink"
      >
        i
      </button>
      {open &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            className="fixed z-50 w-64 -translate-x-1/2 rounded-xl border border-ink/10 bg-paper p-4 text-xs leading-relaxed text-ink/70 shadow-overlay"
            style={{ top: coords.top, left: coords.left }}
          >
            {children}
          </span>,
          document.body
        )}
    </span>
  );
}
