// Eén gedeelde set kleine lijniconen voor het hele rapport — geen
// icon-library nodig, maar wel op één plek gebundeld zodat elk onderdeel
// (statchips, badges, kaarten) dezelfde visuele iconentaal deelt i.p.v. dat
// elk component zijn eigen SVG's uitvindt.

export function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" />
    </svg>
  );
}

export function BoltIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path d="M12.5 3 5 13.5h5.5L11 21l7.5-10.5H13L12.5 3Z" strokeLinejoin="round" />
    </svg>
  );
}

export function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path d="M12 4 3 20h18L12 4Z" strokeLinejoin="round" />
      <path d="M12 10.5v4M12 17.5v.1" strokeLinecap="round" />
    </svg>
  );
}

export function RulerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <rect x="3" y="8" width="18" height="8" rx="1.5" />
      <path d="M7 8v3M11 8v3M15 8v3M19 8v3" />
    </svg>
  );
}

export function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <rect x="5" y="10.5" width="14" height="9" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </svg>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className={className}>
      <path d="M5 12.5 9.5 17 19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path d="M12 21s7-6.1 7-11.2A7 7 0 0 0 5 9.8C5 14.9 12 21 12 21Z" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  );
}

export function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <rect x="4" y="3.5" width="12" height="17" rx="1" />
      <path d="M16 9h4v11.5H16M7.5 7.5h1M11.5 7.5h1M7.5 11h1M11.5 11h1M7.5 14.5h1M11.5 14.5h1" />
    </svg>
  );
}

export function BoxIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path d="M3.5 8 12 3.5 20.5 8 12 12.5 3.5 8Z" strokeLinejoin="round" />
      <path d="M3.5 8v8.5L12 21m0-8.5V21m0-8.5 8.5-4.5V16.5L12 21" strokeLinejoin="round" />
    </svg>
  );
}

export function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path d="M4 12a8 8 0 1 0 2.6-5.9" />
      <path d="M4 5v4h4" />
      <path d="M12 8v4.5l3 2" strokeLinecap="round" />
    </svg>
  );
}

export function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path d="M4 16 10 10l4 4 6-7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 7h5v5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path d="M12 3.5 19 6.3v5.4c0 4.6-3 7.6-7 8.8-4-1.2-7-4.2-7-8.8V6.3L12 3.5Z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function UsersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M2.5 19.5c1-3.2 3.4-5 6.5-5s5.5 1.8 6.5 5" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M15.5 14.3c2.4.3 4.2 2 5 5.2" />
    </svg>
  );
}

export function CompassIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M14.8 9.2 13 13l-3.8 1.8L11 11l3.8-1.8Z" strokeLinejoin="round" />
    </svg>
  );
}

export function StoreIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path d="M4 9.5 5 4h14l1 5.5" strokeLinejoin="round" />
      <path d="M4 9.5a2.3 2.3 0 0 0 4.6 0 2.3 2.3 0 0 0 4.6 0 2.3 2.3 0 0 0 4.6 0 2.3 2.3 0 0 0 4.6 0" />
      <path d="M5.5 11v9h13v-9" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

export function FileCheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path d="M7 3.5h7.5L18 7v13.5H7V3.5Z" strokeLinejoin="round" />
      <path d="M9.5 13.5 11.3 15.3 15 11.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M4 12h16M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function InfoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 8v.1" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M6 9.5 12 15.5 18 9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StethoscopeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path d="M6 3.5v6a4.5 4.5 0 0 0 9 0v-6" strokeLinecap="round" />
      <path d="M10.5 13.5V16a5 5 0 0 0 10 0v-1.5" strokeLinecap="round" />
      <circle cx="20.5" cy="13" r="1.5" />
      <path d="M6 3.5h-1.3M15 3.5h-1.3" strokeLinecap="round" />
    </svg>
  );
}

export function DoorIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <rect x="6" y="3" width="12" height="18" rx="1" />
      <circle cx="14.5" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FlagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path d="M6 21V4" strokeLinecap="round" />
      <path d="M6 4.5h11l-3 4 3 4H6" strokeLinejoin="round" />
    </svg>
  );
}

export function BulbIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path d="M9 18h6M10 21h4" strokeLinecap="round" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" strokeLinejoin="round" />
    </svg>
  );
}

export function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path d="M4 11.5 12 4l8 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9.5h12V10" strokeLinejoin="round" />
      <path d="M10 19.5v-6h4v6" strokeLinejoin="round" />
    </svg>
  );
}

export function SchoolIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path d="M12 3.5 21 8l-9 4.5L3 8l9-4.5Z" strokeLinejoin="round" />
      <path d="M7 10.3v5.4c0 1.5 2.2 2.8 5 2.8s5-1.3 5-2.8v-5.4" />
      <path d="M21 8v6" strokeLinecap="round" />
    </svg>
  );
}

// Gebruikt voor het stepper-onderdeel dat het brede, algemene modelinput
// samenvat (150+ kenmerken) — bewust een "gestapelde lagen"-icoon i.p.v. één
// los kenmerk, om visueel te onderscheiden van de bevestigde losse feiten
// (oppervlakte, bouwjaar, kamers) ernaast in dezelfde stepper.
// Onderstaande vijf iconen horen bij de uitbreiding van de "voorzieningen"-
// lijst in het buurtprofiel (zie VOORZIENING_DEFINITIES in
// lib/data-sources/buurtprofiel.ts) — kleur per icoon staat in
// lib/utils/voorzieningenStijl.ts, niet hier.
export function ApotheekIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <rect x="5" y="5" width="14" height="14" rx="3" />
      <path d="M12 9v6M9 12h6" strokeLinecap="round" />
    </svg>
  );
}

export function KinderdagverblijfIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <circle cx="12" cy="13" r="6" />
      <circle cx="7.5" cy="7" r="2" />
      <circle cx="16.5" cy="7" r="2" />
    </svg>
  );
}

export function TreinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <rect x="6" y="4" width="12" height="12" rx="3" />
      <path d="M6 12h12" />
      <circle cx="9" cy="19" r="1.3" />
      <circle cx="15" cy="19" r="1.3" />
    </svg>
  );
}

export function OpritIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path d="M8 3 5 21M16 3l3 18" strokeLinecap="round" />
      <path d="M12 5v3M12 11v3M12 17v3" strokeLinecap="round" strokeDasharray="2 3" />
    </svg>
  );
}

export function ParkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path d="M12 3c4 2 6 6 4 10-1 2-3 3-4 3s-3-1-4-3c-2-4 0-8 4-10Z" strokeLinejoin="round" />
      <path d="M12 13v8" strokeLinecap="round" />
    </svg>
  );
}

export function LayersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path d="M12 3.5 21 8.5l-9 5-9-5 9-5Z" strokeLinejoin="round" />
      <path d="m3 12.5 9 5 9-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m3 16.5 9 5 9-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Kavelgrootte (perceeloppervlakte) — vier hoek-haakjes rond een leeg vlak,
// zoals een meetkader/crop-icoon. Hoort bij lib/data-sources/kavel.ts.
export function KavelIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path
        d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Bestemming (bestemmingsplan/omgevingsplan) — een plattegrond met een
// gemarkeerd vlak, verwijst naar de bestemmingsomschrijving van het perceel.
// Hoort bij lib/data-sources/bestemming.ts.
export function BestemmingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path d="M4 5.5 9 4l6 1.5 5-1.5v14.5l-5 1.5-6-1.5-5 1.5V5.5Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 4v14.5M15 5.5V20" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
