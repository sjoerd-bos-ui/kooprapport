"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { B2bDossierStatus } from "@/types/b2b";

export default function DossierStatusKnop({ dossierId, status }: { dossierId: string; status: B2bDossierStatus }) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);

  async function wisselen() {
    setBezig(true);
    const nieuweStatus: B2bDossierStatus = status === "lopend" ? "afgerond" : "lopend";
    await fetch(`/api/zakelijk/klanten/${dossierId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nieuweStatus }),
    });
    router.refresh();
    setBezig(false);
  }

  return (
    <button
      type="button"
      onClick={wisselen}
      disabled={bezig}
      className={`rounded-lg px-3.5 py-2 text-[11.5px] font-semibold transition-colors disabled:opacity-60 ${
        status === "lopend" ? "bg-ink/5 text-ink/60 hover:bg-ink/10" : "bg-[#EAF3DE] text-[#3B6D11]"
      }`}
    >
      {status === "lopend" ? "Markeer als afgerond" : "Heropen dossier"}
    </button>
  );
}
