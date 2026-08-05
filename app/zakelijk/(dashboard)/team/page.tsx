import { redirect } from "next/navigation";
import { getB2bSessieUitCookies } from "@/lib/services/b2bAuth";
import { listGebruikersVoorOrg, listRapportenVoorOrg, listOpenUitnodigingenVoorOrg, huidigeJaarMaand } from "@/lib/services/b2bStore";
import TeamUitnodigenForm from "@/components/zakelijk/TeamUitnodigenForm";

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

  const [gebruikers, rapporten, openUitnodigingen] = await Promise.all([
    listGebruikersVoorOrg(context.organisatie.id),
    listRapportenVoorOrg(context.organisatie.id),
    listOpenUitnodigingenVoorOrg(context.organisatie.id),
  ]);
  const isEigenaar = context.gebruiker.rol === "eigenaar";

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

      {isEigenaar && (
        <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">Teamlid uitnodigen</p>
          <div className="mt-2.5">
            <TeamUitnodigenForm />
          </div>
          {openUitnodigingen.length > 0 && (
            <div className="mt-4 flex flex-col gap-1.5 border-t border-ink/[0.06] pt-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-ink/35">Openstaande uitnodigingen</p>
              {openUitnodigingen.map((u) => (
                <p key={u.id} className="text-[11.5px] text-ink/55">
                  {u.email} <span className="text-ink/35">· verstuurd {new Date(u.aangemaaktOp).toLocaleDateString("nl-NL")}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}

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
