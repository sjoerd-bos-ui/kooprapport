import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "on-dark";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

// Indigo (`accent`) als primaire actiekleur — vervangt de eerdere zwarte
// "power"-knop na de homepage-herontwerpronde. `on-dark` blijft bestaan voor
// de zeldzame donkere vlakken die overblijven (bv. de SiteFooter-bookend),
// maar heeft nu geen mosterd meer nodig: gewoon wit op de donkere ink-tint.
const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-dark",
  secondary: "border border-ink/20 bg-transparent text-ink hover:border-accent hover:text-accent",
  ghost: "bg-transparent text-ink/60 hover:text-ink",
  "on-dark": "bg-white text-ink hover:bg-parchment",
};

export function Button({ children, variant = "primary", className = "", ...props }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center whitespace-nowrap rounded-xl px-6 py-3 text-sm font-semibold transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed";
  return (
    <button className={`${base} ${VARIANTS[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
