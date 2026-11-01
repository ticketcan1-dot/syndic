import { workspace } from "@/lib/data";
import { createUnit } from "@/app/actions";
import { Submit } from "@/components/submit";
import { Notice } from "@/components/notice";
import Link from "next/link";
const kinds: Record<string, string> = {
  apartment: "Appartement",
  shop: "Commerce",
  parking: "Parking",
};
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
          <h1>Lots</h1>
          <p>Appartements, commerces et parkings de vos résidences.</p>
        </div>
      </div>
      <Notice error={data.error} message={(await searchParams).message} />
      <div className="split">
        <section className="card">
          <h2>Registre des lots</h2>
          {data.units.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Lot</th>
                    <th>Résidence</th>
                    <th>Type</th>
                    <th>Quote-part</th>
                  </tr>
                </thead>
                <tbody>
                  {data.units.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.label}</strong>
                      </td>
                      <td>
                        {
                          data.residences.find((r) => r.id === u.residence_id)
                            ?.name
                        }
                      </td>
                      <td>{kinds[u.kind]}</td>
                      <td>{Number(u.share).toLocaleString("fr-MA")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty">
              Aucun lot enregistré. Ajoutez votre premier lot pour structurer
              votre résidence.
            </p>
          )}
        </section>
        <section className="card">
          <h2>Ajouter un lot</h2>
          {data.residences.length ? (
            <form action={createUnit} className="form">
              <label>
                Résidence
                <select name="residence_id" required>
                  {data.residences.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Libellé du lot
                <input
                  name="label"
                  required
                  maxLength={60}
                  placeholder="A-101"
                />
              </label>
              <label>
                Type
                <select name="kind">
                  <option value="apartment">Appartement</option>
                  <option value="shop">Commerce</option>
                  <option value="parking">Parking</option>
                </select>
              </label>
              <label>
                Quote-part
                <input
                  name="share"
                  type="number"
                  min="0.0001"
                  max="1000000"
                  step="0.0001"
                  defaultValue="1"
                  required
                />
              </label>
              <p className="form-note">
                Poids relatif pour une future répartition des charges. Aucune
                charge n’est générée dans cette version.
              </p>
              <Submit>Enregistrer le lot</Submit>
            </form>
          ) : (
            <p>
              Commencez par{" "}
              <Link href="/app/residences" className="text-link">
                ajouter une résidence
              </Link>
              .
            </p>
          )}
        </section>
      </div>
    </>
  );
}
