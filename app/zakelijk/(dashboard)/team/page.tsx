import { redirect } from "next/navigation";
import { getB2bSessieUitCookies } from "@/lib/services/b2bAuth";
import { listGebruikersVoorOrg, listRapportenVoorOrg, huidigeJaarMaand } from "@/lib/services/b2bStore";

export const metadata = { title: "Team · Kooprapport Zakelijk", robots: { index: false, follow: false } };

function initialen(naam: string): string {
  return naam
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((deel) => deel[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function ZakelijkTeamPagina() {
  const context = await getB2bSessieUitCookies();
  if (!context) redirect("/zakelijk/login");

  const [gebruikers, rapporten] = await Promise.all([
    listGebruikersVoorOrg(context.organisatie.id),
    listRapportenVoorOrg(context.organisatie.id),
  ]);

  const dezeMaand = huidigeJaarMaand();
  const gebruikPerPersoon = new Map<string, number>();
  for (const r of rapporten) {
    if (huidigeJaarMaand(new Date(r.aangemaaktOp)) !== dezeMaand) continue;
    gebruikPerPersoon.set(r.aangevraagdDoorUserId, (gebruikPerPersoon.get(r.aangevraagdDoorUserId) ?? 0) + 1);
  }
  const maxGebruik = Math.max(1, ...Array.from(gebruikPerPersoon.values()));

  return (
    <div>
      <p className="font-display text-xl font-extrabold text-ink">Team</p>
      <p className="mt-1 text-[12px] text-ink/50">Gebruik deze maand per teamlid.</p>

      <div className="mt-5 divide-y divide-ink/[0.06] overflow-hidden rounded-2xl bg-white px-5 shadow-sm">
        {gebruikers.map((g) => {
          const aantal = gebruikPerPersoon.get(g.id) ?? 0;
          return (
            <div key={g.id} className="flex items-center justify-between py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">
                  {initialen(g.naam) || "?"}
                </span>
                <span className="text-[12.5px] font-semibold text-ink">
                  {g.naam} <span className="font-normal text-ink/40">· {g.rol === "eigenaar" ? "eigenaar" : "lid"}</span>
                </span>
              </div>
              <div className="flex w-44 items-center gap-2.5">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
                  <div className="h-full bg-accent" style={{ width: `${(aantal / maxGebruik) * 100}%` }} />
                </div>
                <span className="whitespace-nowrap text-[10.5px] text-ink/50">{aantal} rapporten</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
