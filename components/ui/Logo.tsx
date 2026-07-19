// Kooprapport-merkmerk (Variant A, gekozen na een reeks visualize-rondes):
// een blokvormige "K" met een amber knooppunt op het kruispunt van stam en
// diagonalen. Eén bron voor het icoon zodat SiteHeader, de homepage-header
// en eventuele toekomstige plekken nooit los van elkaar kunnen gaan lopen.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 56" className={className} aria-hidden="true">
      <rect x="6" y="6" width="44" height="44" rx="13" fill="#4F46E5" />
      <rect x="19" y="14" width="6.5" height="28" rx="2" fill="#fff" />
      <path d="M25.5 26 L25.5 22 L36.5 13 L40.5 17 Z" fill="#fff" />
      <path d="M25.5 30 L25.5 34 L36.5 43 L40.5 39 Z" fill="#fff" />
      <circle cx="25.5" cy="28" r="3.4" fill="#D97706" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark className="h-7 w-7 shrink-0" />
      <span className="font-display text-lg font-bold text-ink">Kooprapport</span>
    </span>
  );
}
