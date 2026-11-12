import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { Building2 } from "lucide-react";
import { I18nText } from "@/components/i18n";
import { LocalizedInput } from "@/components/i18n-input";
import { Brand } from "@/components/brand";
import { Notice } from "@/components/notice";
import { Submit } from "@/components/submit";
import { joinResidenceExistingAccount } from "@/app/rejoindre/[token]/actions";
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
  const next = encodeURIComponent("/rejoindre/" + token);
  return (
    <main className="auth-shell">
      <section className="card auth-card join-card">
        <Brand />
        <span className="join-icon">
          <Building2 size={28} />
        </span>
        <h1>
          <I18nText text="Voulez-vous rejoindre" /> {info.residence} ?
        </h1>
        <p>
          <I18nText text="Ce lien vous a été envoyé par" /> <strong>{info.syndic}</strong>
          {info.city ? " · " + info.city : ""}
        </p>
        <Notice message={message} />
        {user ? (
          <form action={joinResidenceExistingAccount} className="form">
            <input type="hidden" name="token" value={token} />
            <p className="small">
              <I18nText text="Connecté en tant que" /> <strong>{user.email}</strong>
            </p>
            <label>
              <I18nText text="Appartement (facultatif)" />
              <LocalizedInput name="apartment" maxLength={60} placeholder="A-12" />
            </label>
            <Submit>
              <I18nText text="Oui, rejoindre la résidence" />
            </Submit>
          </form>
        ) : (
          <>
            <h2 style={{ marginTop: 24 }}>
              <I18nText text="Avez-vous un compte sur SyndiConnect ?" />
            </h2>
            <div className="join-choices">
              <Link className="button primary" href={`/connexion?next=${next}`}>
                <I18nText text="Oui, me connecter" />
              </Link>
              <Link className="button outline" href={`/inscription?next=${next}`}>
                <I18nText text="Non, créer mon compte" />
              </Link>
            </div>
          </>
        )}
        <p className="form-note" style={{ marginTop: 20 }}>
          <I18nText text="Votre syndic validera votre demande avant l’ouverture de votre accès." />
        </p>
      </section>
    </main>
  );
}
