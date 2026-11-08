import { platformAdmin } from "@/lib/access";
import { Submit } from "@/components/submit";
import { Notice } from "@/components/notice";
import { setSubscription } from "./actions";
import { provisionSyndic } from "./provision";
const statuses: Record<string, string> = {
  trialing: "Essai",
  active: "Actif",
  past_due: "À régulariser",
  canceled: "Résilié",
  expired: "Expiré",
  suspended: "Suspendu",
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { db } = await platformAdmin();
  const [orgs, subs, history] = await Promise.all([
    db.rpc("syndic_admin_organizations"),
    db.from("syndic_subscription_records").select("*"),
    db
      .from("syndic_subscription_history")
      .select("id,organization_id,new_value,created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const organizations = (orgs.data ?? []) as {
    id: string;
    name: string;
    created_at: string;
  }[];
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Gestion de la plateforme</span>
          <h1>Administration</h1>
          <p>Organisations clientes et suivi des abonnements.</p>
        </div>
        <span className="badge">Accès réservé</span>
      </div>
      <Notice
        message={(await searchParams).message}
        error={Boolean(orgs.error || subs.error || history.error)}
      />
      <div className="stats">
        <div className="card">
          <p>Organisations</p>
          <div className="stat-number">{organizations.length}</div>
        </div>
        <div className="card">
          <p>Abonnements actifs</p>
          <div className="stat-number">
            {subs.data?.filter(
              (s) => s.status === "active" && new Date(s.ends_at) > new Date(),
            ).length ?? 0}
          </div>
        </div>
        <div className="card">
          <p>À configurer</p>
          <div className="stat-number">
            {
              organizations.filter(
                (o) => !subs.data?.some((s) => s.organization_id === o.id),
              ).length
            }
          </div>
        </div>
      </div>
      <section className="card">
        <h2>Créer un compte syndic</h2>
        {!process.env.SUPABASE_SECRET_KEY && (
          <div role="alert" className="notice">
            La création des comptes nécessite la variable serveur
            SUPABASE_SECRET_KEY dans Vercel, puis un redéploiement. Les comptes
            existants continuent de fonctionner.
          </div>
        )}
        <p>Le compte est activé immédiatement sans e-mail de confirmation.</p>
        <form action={provisionSyndic} className="form">
          <label>
            Organisation
            <input name="organization" required minLength={2} maxLength={120} />
          </label>
          <label>
            E-mail de connexion
            <input name="email" type="email" required />
          </label>
          <label>
            Mot de passe initial
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
            />
          </label>
          <Submit>Créer le compte syndic</Submit>
        </form>
      </section>
      <section className="card" style={{ marginTop: 24 }}>
        <h2>Abonnements des syndics</h2>
        <p>
          Suivi manuel. Chaque modification exige un motif et conserve un
          historique. Aucun encaissement automatique n’est effectué.
        </p>
        {organizations.length === 0 && (
          <p className="empty">Aucune organisation cliente pour le moment.</p>
        )}
        <div className="list">
          {organizations.map((o) => {
            const sub = subs.data?.find((s) => s.organization_id === o.id);
            return (
              <details key={o.id}>
                <summary>
                  {o.name} —{" "}
                  {sub
                    ? new Date(sub.ends_at) <= new Date() &&
                      ["active", "trialing"].includes(sub.status)
                      ? "Expiré"
                      : statuses[sub.status]
                    : "Non configuré"}
                </summary>
                <form
                  action={setSubscription}
                  className="form"
                  style={{ marginTop: 18 }}
                >
                  <input type="hidden" name="organization_id" value={o.id} />
                  <label>
                    Offre
                    <select name="plan" defaultValue={sub?.plan ?? "essentiel"}>
                      <option value="essentiel">Essentiel</option>
                      <option value="pro">Pro</option>
                      <option value="business">Business</option>
                    </select>
                  </label>
                  <label>
                    Statut
                    <select
                      name="status"
                      defaultValue={sub?.status ?? "trialing"}
                    >
                      {Object.entries(statuses).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Fin de période (fin de journée UTC)
                    <input
                      type="date"
                      name="end_date"
                      defaultValue={sub?.ends_at?.slice(0, 10)}
                      required
                    />
                  </label>
                  <label>
                    Motif / référence de validation
                    <input
                      name="reason"
                      required
                      minLength={5}
                      maxLength={500}
                      placeholder="Référence de règlement vérifié ou décision commerciale"
                    />
                  </label>
                  <Submit>Enregistrer l’abonnement</Submit>
                </form>
              </details>
            );
          })}
        </div>
      </section>
      <section className="card" style={{ marginTop: 24 }}>
        <h2>Dernières modifications</h2>
        {history.data?.length ? (
          history.data.map((h) => (
            <div key={h.id} className="list-row">
              <div>
                <strong>
                  {organizations.find((o) => o.id === h.organization_id)
                    ?.name ?? "Organisation"}
                </strong>
                <p>
                  {statuses[h.new_value.status]} · {h.new_value.note}
                </p>
              </div>
              <span className="small">
                {new Date(h.created_at).toLocaleDateString("fr-MA")}
              </span>
            </div>
          ))
        ) : (
          <p>Aucune modification enregistrée.</p>
        )}
      </section>
      <p className="small" style={{ marginTop: 20 }}>
        Les statuts sont un suivi commercial. Le blocage automatique des
        opérations et les paiements en ligne ne sont pas activés.
      </p>
    </>
  );
}
