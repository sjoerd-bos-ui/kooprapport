"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UitnodigingIntrekkenKnop({ id }: { id: string }) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);

  async function intrekken() {
    setBezig(true);
    await fetch(`/api/zakelijk/team/uitnodigen/${id}`, { method: "DELETE" });
    router.refresh();
    setBezig(false);
  }

  return (
    <button type="button" onClick={intrekken} disabled={bezig} className="text-[10.5px] font-semibold text-ink/35 hover:text-rust disabled:opacity-60">
      {bezig ? "Bezig…" : "Intrekken"}
    </button>
  );
}
