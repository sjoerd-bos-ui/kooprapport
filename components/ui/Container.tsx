import type { ReactNode } from "react";

// "narrow" = de leescolonne van het rapport zelf (bewust smaller dan een
// standaard dashboard-breedte — leest rustiger, meer als een gedrukt
// document). "wide" (default) blijft voor bredere secties zoals de hero.
export default function Container({
  children,
  className = "",
  width = "wide",
}: {
  children: ReactNode;
  className?: string;
  width?: "wide" | "narrow";
}) {
  const maxWidth = width === "narrow" ? "max-w-3xl" : "max-w-5xl";
  return <div className={`mx-auto w-full ${maxWidth} px-6 sm:px-8 lg:px-10 ${className}`}>{children}</div>;
}
