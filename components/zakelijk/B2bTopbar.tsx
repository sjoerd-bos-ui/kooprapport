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
  const percentage = Math.min(100, Math.round((verbruikt / Math.max(1, quotum)) * 100));
  const bijnaOp = resterend <= Math.max(1, Math.round(quotum * 0.1));

  return (
    <div className="flex items-center justify-between border-b border-ink/10 bg-white px-8 py-4">
      <div>
        <p className="text-[13px] font-extrabold text-ink">{gebruikerNaam}</p>
        <p className="text-[10.5px] text-ink/50">{orgNaam}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 rounded-full bg-[#F8F8FF] py-1.5 pl-3 pr-1.5">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-ink/[0.08]">
            <div
              className={`h-full rounded-full ${bijnaOp ? "bg-rust" : "bg-accent"}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold ${bijnaOp ? "bg-[#FBEAEA] text-rust" : "bg-[#EEF0FF] text-accent"}`}>
            {verbruikt} / {quotum}
          </span>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-ink to-ink/80 text-[10px] font-bold text-white shadow-sm">
          {initialen(gebruikerNaam) || "?"}
        </span>
        <button
          type="button"
          onClick={uitloggen}
          className="text-[11px] font-semibold text-ink/45 underline underline-offset-2 hover:text-ink"
        >
          Uitloggen
        </button>
      </div>
    </div>
  );
}
