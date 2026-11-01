import { updatePassword } from "@/app/actions";
import { Submit } from "@/components/submit";
import { Notice } from "@/components/notice";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  return (
    <section className="card auth-card">
      <h1>Nouveau mot de passe</h1>
      <Notice message={(await searchParams).message} />
      <form action={updatePassword} className="form">
        <label>
          Mot de passe
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />
        </label>
        <Submit>Enregistrer</Submit>
      </form>
    </section>
  );
}
