import { signedIn } from "@/lib/access";
import { workspace } from "@/lib/data";
import { Notice } from "@/components/notice";
import { Submit } from "@/components/submit";
import { inviteResident, revokeInvitation, publishPost } from "./actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { db } = await signedIn();
  const data = await workspace();
  const [invitations, posts] = await Promise.all([
    db
      .from("syndic_resident_invitations")
      .select("*")
      .order("created_at", { ascending: false }),
    db
      .from("syndic_residence_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Résidents et activités</h1>
          <p>
            Invitez les occupants d’un lot et partagez les actualités de leur
            résidence.
          </p>
        </div>
      </div>
      <Notice
        message={(await searchParams).message}
        error={data.error || Boolean(invitations.error || posts.error)}
      />
      <div className="split">
        <section className="card">
          <h2>Inviter un résident</h2>
          {data.units.length ? (
            <form action={inviteResident} className="form">
              <label>
                Lot
                <select name="unit_id" required>
                  {data.units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {
                        data.residences.find((r) => r.id === u.residence_id)
                          ?.name
                      }{" "}
                      · {u.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                E-mail du résident
                <input type="email" name="email" required maxLength={254} />
              </label>
              <Submit>Créer l’invitation</Submit>
              <p className="form-note">
                Le résident devra créer son compte avec cette adresse, la
                vérifier et accepter l’invitation. Partagez-lui :{" "}
                {process.env.NEXT_PUBLIC_SITE_URL}/resident
              </p>
            </form>
          ) : (
            <p>Ajoutez d’abord une résidence et un lot.</p>
          )}
        </section>
        <section className="card">
          <h2>Publier une activité</h2>
          {data.residences.length ? (
            <form action={publishPost} className="form">
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
                Titre
                <input name="title" required minLength={3} maxLength={160} />
              </label>
              <label>
                Message
                <textarea
                  name="body"
                  required
                  minLength={3}
                  maxLength={5000}
                  rows={5}
                />
              </label>
              <Submit>Publier aux résidents</Submit>
            </form>
          ) : (
            <p>Ajoutez d’abord une résidence.</p>
          )}
        </section>
      </div>
      <section className="card" style={{ marginTop: 24 }}>
        <h2>Invitations et accès</h2>
        {!invitations.data?.length && <p>Aucune invitation.</p>}
        {invitations.data?.map((i) => (
          <div className="list-row" key={i.id}>
            <div>
              <strong>{i.email}</strong>
              <p>
                {data.units.find((u) => u.id === i.unit_id)?.label ?? "Lot"} ·{" "}
                {i.revoked_at
                  ? "Révoqué"
                  : i.accepted_at
                    ? "Accès accepté"
                    : new Date(i.expires_at) < new Date()
                      ? "Invitation expirée"
                      : "En attente"}
              </p>
            </div>
            {!i.revoked_at && (
              <form action={revokeInvitation}>
                <input type="hidden" name="id" value={i.id} />
                <Submit>Révoquer l’accès</Submit>
              </form>
            )}
          </div>
        ))}
      </section>
      <section className="card" style={{ marginTop: 24 }}>
        <h2>Activités publiées</h2>
        {posts.data?.length ? (
          posts.data.map((p) => (
            <article key={p.id} className="section-note">
              <strong>{p.title}</strong>
              <p style={{ whiteSpace: "pre-wrap" }}>{p.body}</p>
              <span className="small">
                {data.residences.find((r) => r.id === p.residence_id)?.name}
              </span>
            </article>
          ))
        ) : (
          <p>Aucune activité publiée.</p>
        )}
      </section>
    </>
  );
}
