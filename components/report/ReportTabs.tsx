"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface ReportTabDef {
  id: string;
  label: string;
  content: ReactNode;
}

// Sticky horizontale tabbalk voor het ontgrendelde rapport (concept 2 uit de
// structuurverkenning) — vervangt de lange doorlopende scrollpagina met zes
// losse secties. De balk blijft zichtbaar tijdens het scrollen, net onder de
// SiteHeader, zodat je altijd tussen onderdelen kan springen zonder terug
// naar boven te scrollen. Alleen de actieve tab wordt gerenderd.
//
// activeId/onChange zijn optioneel: zonder die props beheert dit component
// zijn eigen state (ongewijzigd gedrag). Met beide props wordt het een
// controlled component, zodat andere content — bijvoorbeeld de doorklikbare
// kaarten op het Rapportoverzicht-tabblad — ook zelf naar een ander tabblad
// kan springen.
//
// Volledig ARIA-tabbenpatroon (was eerder alleen aria-current op de knoppen):
// role="tablist"/"tab"/"tabpanel" + aria-selected + aria-controls/
// aria-labelledby, plus roving tabindex met pijltjestoetsen — zie
// https://www.w3.org/WAI/ARIA/apg/patterns/tabs/. Zonder dit las een
// schermlezer de balk voor als een simpele rij losse knoppen, niet als een
// samenhangende tabbenset.
export default function ReportTabs({
  tabs,
  activeId: controlledActiveId,
  onChange,
}: {
  tabs: ReportTabDef[];
  activeId?: string;
  onChange?: (id: string) => void;
}) {
  const [internalActiveId, setInternalActiveId] = useState(tabs[0]?.id);
  const activeId = controlledActiveId ?? internalActiveId;
  const setActiveId = onChange ?? setInternalActiveId;
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function focusTab(index: number) {
    const tab = tabs[(index + tabs.length) % tabs.length];
    setActiveId(tab.id);
    tabRefs.current[tab.id]?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      focusTab(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusTab(index - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusTab(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusTab(tabs.length - 1);
    }
  }

  return (
    <div className="mt-6">
      <div
        role="tablist"
        aria-label="Rapportonderdelen"
        className="sticky top-[68px] z-30 -mx-1 mb-4 flex gap-1.5 overflow-x-auto rounded-2xl border border-ink/10 bg-white/95 p-1.5 backdrop-blur"
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === active?.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              id={`tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveId(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                isActive ? "bg-accent text-white" : "text-ink/55 hover:bg-parchment"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {active && (
        <div id={`tabpanel-${active.id}`} role="tabpanel" aria-labelledby={`tab-${active.id}`} tabIndex={0}>
          {active.content}
        </div>
      )}
    </div>
  );
}
