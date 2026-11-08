import { signedIn } from "@/lib/access";
import { AppFrame } from "@/components/app-frame";
import { Submit } from "@/components/submit";
import { Notice } from "@/components/notice";
import { saveNickname } from "./save";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { user } = await signedIn();
  return (
    <AppFrame>
      <main className="container section">
        <h1>Mon profil</h1>
        <Notice message={(await searchParams).message} />
        <section className="card">
          <form action={saveNickname} className="form">
            <label>
              Pseudo
              <input
                name="nickname"
                defaultValue={
                  typeof user.user_metadata?.nickname === "string"
                    ? user.user_metadata.nickname
                    : ""
                }
                required
                minLength={2}
                maxLength={40}
              />
            </label>
            <p>{user.email}</p>
            <Submit>Enregistrer</Submit>
          </form>
        </section>
      </main>
    </AppFrame>
  );
}
