"use client";

import { useRouter } from "next/navigation";

function initialen(naam: string): string {
  return naam
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((deel) => deel[0]?.toUpperCase() ?? "")
    .join("");
}

export default function B2bTopbar({
  gebruikerNaam,
  orgNaam,
  verbruikt,
  quotum,
}: {
  gebruikerNaam: string;
  orgNaam: string;
  verbruikt: number;
  quotum: number;
}) {
  const router = useRouter();

  async function uitloggen() {
    await fetch("/api/zakelijk/auth/logout", { method: "POST" });
    router.push("/zakelijk/login");
    router.refresh();
  }

  const resterend = Math.max(0, quotum - verbruikt);
  const bijnaOp = resterend <= Math.max(1, Math.round(quotum * 0.1));

  return (
    <div className="flex items-center justify-between border-b border-ink/10 bg-white px-8 py-4">
      <div>
        <p className="text-[13px] font-extrabold text-ink">{gebruikerNaam}</p>
        <p className="text-[10.5px] text-ink/50">{orgNaam}</p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`rounded-full px-3 py-1.5 text-[10.5px] font-bold ${
            bijnaOp ? "bg-[#FBEAEA] text-rust" : "bg-[#EEF0FF] text-accent"
          }`}
        >
          {verbruikt} / {quotum} rapporten deze maand
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">
          {initialen(gebruikerNaam) || "?"}
        </span>
        <button
          type="button"
          onClick={uitloggen}
          className="text-[11px] font-semibold text-ink/50 underline underline-offset-2 hover:text-ink"
        >
          Uitloggen
        </button>
      </div>
    </div>
  );
}
