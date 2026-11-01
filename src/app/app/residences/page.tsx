import { workspace } from "@/lib/data";
import { createResidence } from "@/app/actions";
import { Submit } from "@/components/submit";
import { Notice } from "@/components/notice";
import Link from "next/link";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const data = await workspace();
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Résidences</h1>
          <p>Un carnet d’adresses pour vos copropriétés.</p>
        </div>
      </div>
      <Notice error={data.error} message={(await searchParams).message} />
      <div className="split">
        <section className="card">
          <h2>Votre portefeuille</h2>
          {data.residences.length ? (
            data.residences.map((r) => (
              <article className="list-row" key={r.id}>
                <div>
                  <strong>{r.name}</strong>
                  <p>{r.address}</p>
                  <span className="badge">{r.city}</span>
                </div>
                <span className="small">
                  {data.units.filter((u) => u.residence_id === r.id).length}{" "}
                  lots
                </span>
              </article>
            ))
          ) : (
            <p className="empty">
              Vos résidences apparaîtront ici après leur création.
            </p>
          )}
        </section>
        <section className="card">
          <h2>Ajouter une résidence</h2>
          {data.organizations.length ? (
            <form className="form" action={createResidence}>
              <label>
                Organisation
                <select name="organization_id" required>
                  {data.organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nom
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={120}
                  placeholder="Résidence Atlas"
                />
              </label>
              <label>
                Adresse
                <input name="address" required minLength={4} maxLength={300} />
              </label>
              <label>
                Ville
                <input name="city" required minLength={2} maxLength={80} />
              </label>
              <Submit>Créer la résidence</Submit>
            </form>
          ) : (
            <p>
              Commencez par{" "}
              <Link className="text-link" href="/app">
                créer une organisation
              </Link>
              .
            </p>
          )}
        </section>
      </div>
    </>
  );
}
