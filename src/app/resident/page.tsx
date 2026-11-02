import Link from "next/link";
import { signedIn } from "@/lib/access";
import { Brand } from "@/components/brand";
import { Notice } from "@/components/notice";
import { Submit } from "@/components/submit";
import { signOut } from "@/app/actions";
import { acceptInvitation } from "./actions";
type ResidentSpace = {
  units: {
    id: string;
    label: string;
    residence: string;
    residence_id: string;
    city: string;
  }[];
  posts: {
    id: string;
    title: string;
    body: string;
    created_at: string;
    residence_id: string;
  }[];
};
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { db, user } = await signedIn();
  const [space, invitations] = await Promise.all([
    db.rpc("syndic_my_resident_space"),
    db
      .from("syndic_resident_invitations")
      .select("id,expires_at")
      .eq("email", user.email?.toLowerCase() ?? "")
      .is("revoked_at", null)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString()),
  ]);
  const data = (space.data ?? { units: [], posts: [] }) as ResidentSpace;
  return (
    <div className="container">
      <header className="public-nav">
        <Brand />
        <form action={signOut}>
          <button className="text-link">Déconnexion</button>
        </form>
      </header>
      <main className="section">
        <span className="eyebrow">Mon espace résident</span>
        <h1>La vie de votre résidence</h1>
        <Link href="/operations" className="button primary">
          Mes cotisations, messages et réunions
        </Link>
        <p>{user.email}</p>
        <Notice
          message={(await searchParams).message}
          error={Boolean(space.error || invitations.error)}
        />
        {invitations.data?.map((i) => (
          <section key={i.id} className="card" style={{ marginBottom: 20 }}>
            <h2>Une invitation vous attend</h2>
            <p>
              Acceptez votre association au lot pour accéder aux actualités de
              sa résidence.
            </p>
            <form action={acceptInvitation}>
              <input type="hidden" name="id" value={i.id} />
              <Submit>Accepter l’invitation</Submit>
            </form>
          </section>
        ))}
        <div className="grid3">
          {data.units.map((u) => (
            <section className="card" key={u.id}>
              <span className="badge">{u.city}</span>
              <h2 style={{ marginTop: 12 }}>{u.residence}</h2>
              <p>Lot {u.label}</p>
            </section>
          ))}
        </div>
        {!data.units.length && (
          <section className="card">
            <h2>En attente de votre syndic</h2>
            <p>
              Demandez une invitation à l’adresse de votre compte. Aucun lot
              n’est encore associé à votre compte.
            </p>
          </section>
        )}
        <section style={{ marginTop: 32 }}>
          <h2>Activités et annonces</h2>
          {data.posts.length ? (
            data.posts.map((p) => (
              <article className="card" key={p.id} style={{ marginBottom: 16 }}>
                <span className="small">
                  {new Date(p.created_at).toLocaleDateString("fr-MA")}
                </span>
                <h3>{p.title}</h3>
                <p style={{ whiteSpace: "pre-wrap" }}>{p.body}</p>
              </article>
            ))
          ) : (
            <p>Aucune activité publiée pour le moment.</p>
          )}
        </section>
        <Link href="/app" className="text-link small">
          Accéder à mon espace syndic
        </Link>
      </main>
    </div>
  );
}
