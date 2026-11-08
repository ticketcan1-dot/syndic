import Link from "next/link";
import { signedIn } from "@/lib/access";
import { acceptInvitation } from "@/app/resident/actions";
import { Submit } from "@/components/submit";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { db } = await signedIn();
  const { id } = await params;
  const { data } = await db
    .from("syndic_resident_invitations")
    .select("id,expires_at,accepted_at,revoked_at")
    .eq("id", id)
    .single();
  const valid =
    data &&
    !data.revoked_at &&
    !data.accepted_at &&
    new Date(data.expires_at) > new Date();
  return (
    <main className="auth-shell">
      <section className="card auth-card">
        <span className="eyebrow">Votre résidence</span>
        <h1>{valid ? "Bienvenue chez vous." : "Invitation indisponible"}</h1>
        {valid ? (
          <form action={acceptInvitation}>
            <input type="hidden" name="id" value={data.id} />
            <Submit>Rejoindre mon appartement</Submit>
          </form>
        ) : (
          <Link className="button primary" href="/resident">
            Mon espace
          </Link>
        )}
      </section>
    </main>
  );
}
