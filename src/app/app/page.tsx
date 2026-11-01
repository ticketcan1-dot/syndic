import Link from "next/link";
import { Building2, Grid2X2, Users } from "lucide-react";
import { workspace } from "@/lib/data";
import { createOrganization } from "@/app/actions";
import { Submit } from "@/components/submit";
import { Notice } from "@/components/notice";
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
          <span className="eyebrow">Votre espace de gestion</span>
          <h1>Vue d’ensemble</h1>
          <p>Vos copropriétés, au même endroit.</p>
        </div>
        <Link href="/app/residences" className="button primary">
          Ajouter une résidence
        </Link>
      </div>
      <Notice error={data.error} message={(await searchParams).message} />
      <div className="stats">
        {[
          [Users, "Organisations", data.organizations.length],
          [Building2, "Résidences", data.residences.length],
          [Grid2X2, "Lots", data.units.length],
        ].map(([Icon, label, count]) => {
          const I = Icon as typeof Users;
          return (
            <div className="card" key={String(label)}>
              <I size={22} />
              <p style={{ margin: "12px 0 0" }}>{String(label)}</p>
              <div className="stat-number">
                {data.error ? "—" : String(count)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="split">
        <section className="card">
          <h2>Vos résidences</h2>
          <p>Retrouvez les copropriétés de vos organisations.</p>
          {data.residences.length ? (
            data.residences.map((r) => (
              <div className="list-row" key={r.id}>
                <div>
                  <strong>{r.name}</strong>
                  <p className="small">
                    {r.city} · {r.address}
                  </p>
                </div>
                <Link className="text-link small" href="/app/lots">
                  Voir les lots
                </Link>
              </div>
            ))
          ) : (
            <div className="empty">
              Aucune résidence pour le moment. Créez votre organisation, puis
              ajoutez votre première résidence.
            </div>
          )}
        </section>
        <section className="card">
          <h2>
            {data.organizations.length
              ? "Nouvelle organisation"
              : "Bienvenue chez vous"}
          </h2>
          <p>Une organisation regroupe les résidences que vous gérez.</p>
          <form className="form" action={createOrganization}>
            <label>
              Nom de l’organisation
              <input
                name="name"
                placeholder="Cabinet ou syndic bénévole"
                required
                minLength={2}
                maxLength={120}
              />
            </label>
            <Submit>Créer l’organisation</Submit>
          </form>
        </section>
      </div>
      <div className="section-note">
        <strong>Votre parcours de démarrage</strong>
        <p style={{ margin: "8px 0 0" }}>
          1. Créer une organisation → 2. Ajouter une résidence → 3. Enregistrer
          les lots
        </p>
      </div>
    </>
  );
}
