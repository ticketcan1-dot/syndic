import Link from "next/link";
import { signedIn } from "@/lib/access";
import { Brand } from "@/components/brand";
import { Notice } from "@/components/notice";
import { Submit } from "@/components/submit";
import { incidentAction } from "./actions";
type Unit = {
  id: string;
  label: string;
  residence: string;
  can_manage: boolean;
};
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { db } = await signedIn();
  const [context, incidents] = await Promise.all([
    db.rpc("syndic_operations_context"),
    db
      .from("syndic_incidents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  const units = (context.data?.units ?? []) as Unit[];
  const labels: Record<string, string> = {
    open: "Ouvert",
    in_progress: "En cours",
    resolved: "Résolu",
  };
  return (
    <div className="container">
      <header className="public-nav">
        <Brand />
        <Link href="/operations" className="button outline">
          Gestion quotidienne
        </Link>
      </header>
      <main className="section">
        <span className="eyebrow">Entretien et demandes</span>
        <h1>Incidents</h1>
        <p>Signalez un problème et suivez sa prise en charge.</p>
        <Notice
          message={(await searchParams).message}
          error={Boolean(context.error || incidents.error)}
        />
        <div className="split">
          <section className="card">
            <h2>Suivi des demandes</h2>
            {!incidents.data?.length && <p>Aucun incident déclaré.</p>}
            {incidents.data?.map((i) => {
              const unit = units.find((u) => u.id === i.unit_id);
              return (
                <details key={i.id}>
                  <summary>
                    {i.title} · {labels[i.status]}{" "}
                    {i.priority === "urgent" ? "· Urgent" : ""}
                  </summary>
                  <p className="small">
                    {unit?.residence} · {unit?.label} ·{" "}
                    {new Date(i.created_at).toLocaleDateString("fr-MA")}
                  </p>
                  <p style={{ whiteSpace: "pre-wrap" }}>{i.description}</p>
                  {i.resolution && (
                    <p>
                      <strong>Compte rendu :</strong> {i.resolution}
                    </p>
                  )}
                  {unit?.can_manage && (
                    <form action={incidentAction} className="form">
                      <input type="hidden" name="task" value="update" />
                      <input type="hidden" name="target" value={i.id} />
                      <label>
                        Statut
                        <select name="status" defaultValue={i.status}>
                          {Object.entries(labels).map(([v, t]) => (
                            <option key={v} value={v}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Compte rendu
                        <textarea
                          name="resolution"
                          defaultValue={i.resolution}
                          maxLength={5000}
                        />
                      </label>
                      <Submit>Mettre à jour</Submit>
                    </form>
                  )}
                </details>
              );
            })}
          </section>
          <section className="card">
            <h2>Déclarer un incident</h2>
            {units.length ? (
              <form action={incidentAction} className="form">
                <input type="hidden" name="task" value="report" />
                <label>
                  Lot
                  <select name="target">
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.residence} · {u.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Objet
                  <input name="title" required minLength={3} maxLength={160} />
                </label>
                <label>
                  Description
                  <textarea
                    name="description"
                    required
                    minLength={5}
                    maxLength={5000}
                    rows={5}
                  />
                </label>
                <label>
                  Priorité
                  <select name="priority">
                    <option value="normal">Normale</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </label>
                <Submit>Déclarer</Submit>
              </form>
            ) : (
              <p>Votre syndic doit d’abord vous associer à un lot.</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
