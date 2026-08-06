"use client";

import { useState, type ReactNode } from "react";

export interface KlantdossierTab {
  key: string;
  label: string;
  content: ReactNode;
}

// -----------------------------------------------------------------------------
// Tabbladen voor het klantdossier -- vervangt de eerdere vaste
// grid-cols-[1.3fr_0.7fr]-indeling waarin Zoekopdracht + Matches ergens
// rechtsonderin (in de smalle 0.7fr-kolom) weggedrukt stond. Alle vier
// tabbladen worden server-side al volledig gerenderd (page.tsx blijft een
// server component, alle data komt daar al binnen) en als children
// meegegeven -- dit component is puur client-side zichtbaarheid wisselen,
// geen eigen databehoefte. `hidden` i.p.v. conditioneel unmounten, zodat
// clientstate binnenin een tab (bv. een open bewerkformulier) niet verloren
// gaat bij het wisselen van tab.
// -----------------------------------------------------------------------------
export default function KlantdossierTabs({ tabs, standaardTab }: { tabs: KlantdossierTab[]; standaardTab: string }) {
  const [actief, setActief] = useState(standaardTab);

  return (
    <div className="mt-6">
      <div className="flex gap-1 overflow-x-auto border-b border-ink/10">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActief(t.key)}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2.5 text-[12.5px] font-semibold transition-colors ${
              actief === t.key ? "border-accent text-accent" : "border-transparent text-ink/50 hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-5">
        {tabs.map((t) => (
          <div key={t.key} hidden={actief !== t.key}>
            {t.content}
          </div>
        ))}
      </div>
    </div>
  );
}
