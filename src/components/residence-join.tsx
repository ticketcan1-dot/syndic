import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { I18nText } from "@/components/i18n";
import { LocalizedInput } from "@/components/i18n-input";
import { Brand } from "@/components/brand";
import { Notice } from "@/components/notice";
import { Submit } from "@/components/submit";
import { joinResidenceNewAccount, joinResidenceExistingAccount } from "@/app/rejoindre/[token]/actions";
export function ResidenceJoin({
  token,
  info,
  user,
  message,
}: {
  token: string;
  info: { residence: string; city: string; syndic: string };
  user: User | null;
  message?: string;
}) {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const text = (key: string) => (typeof meta[key] === "string" ? (meta[key] as string) : "");
  return (
    <main className="auth-shell">
      <section className="card auth-card">
        <Brand />
        <span className="eyebrow">
          <I18nText text="Bienvenue chez vous" />
        </span>
        <h1>{info.residence}</h1>
        <p>
          {info.city} · <I18nText text="gérée par" /> <strong>{info.syndic}</strong>
        </p>
        <Notice message={message} />
        <p className="form-note">
          <I18nText text="Votre syndic validera votre demande avant l’ouverture de votre accès." />
        </p>
        <form action={user ? joinResidenceExistingAccount : joinResidenceNewAccount} className="form">
          <input type="hidden" name="token" value={token} />
          {user && (
            <p>
              <I18nText text="Connecté en tant que" /> <strong>{user.email}</strong>
            </p>
          )}
          <label>
            <I18nText text="Prénom" />
            <LocalizedInput name="first_name" autoComplete="given-name" required minLength={2} maxLength={80} defaultValue={text("first_name")} />
          </label>
          <label>
            <I18nText text="Nom" />
            <LocalizedInput name="last_name" autoComplete="family-name" required minLength={2} maxLength={80} defaultValue={text("last_name")} />
          </label>
          <label>
            <I18nText text="Téléphone" />
            <LocalizedInput name="phone" type="tel" autoComplete="tel" required maxLength={24} defaultValue={text("phone")} />
          </label>
          <label>
            <I18nText text="Appartement (facultatif)" />
            <LocalizedInput name="apartment" maxLength={60} placeholder="A-12" />
          </label>
          {!user && (
            <>
              <label>
                <I18nText text="Adresse e-mail" />
                <LocalizedInput name="email" type="email" autoComplete="email" required maxLength={254} />
              </label>
              <label>
                <I18nText text="Mot de passe" />
                <LocalizedInput name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} />
                <span className="form-note">
                  <I18nText text="12 caractères minimum" />
                </span>
              </label>
              <label>
                <I18nText text="Confirmer le mot de passe" />
                <LocalizedInput name="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={128} />
              </label>
            </>
          )}
          <Submit>
            <I18nText text={user ? "Rejoindre avec mon compte" : "Créer mon compte et rejoindre"} />
          </Submit>
        </form>
        {!user && (
          <p className="small" style={{ marginTop: 20 }}>
            <I18nText text="Vous avez déjà un compte ?" />{" "}
            <Link className="text-link" href={`/connexion?next=${encodeURIComponent("/rejoindre/" + token)}`}>
              <I18nText text="Se connecter pour rejoindre" />
            </Link>
          </p>
        )}
      </section>
    </main>
  );
}
