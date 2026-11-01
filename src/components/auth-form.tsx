import Link from "next/link";
import { Brand } from "@/components/brand";
import { Submit } from "@/components/submit";
import { signIn, signUp, resetPassword } from "@/app/actions";
export function AuthForm({
  signup = false,
  message,
}: {
  signup?: boolean;
  message?: string;
}) {
  return (
    <main className="auth-shell">
      <div className="card auth-card">
        <Brand />
        <h1>{signup ? "Créer votre espace" : "Heureux de vous retrouver"}</h1>
        <p>
          {signup
            ? "Commencez par votre compte, puis créez votre première résidence."
            : "Connectez-vous pour retrouver vos résidences."}
        </p>
        {message && (
          <div className="notice" role="status">
            {message}
          </div>
        )}
        <form action={signup ? signUp : signIn} className="form">
          <label>
            Adresse e-mail
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>
          <label>
            Mot de passe
            <input
              name="password"
              type="password"
              autoComplete={signup ? "new-password" : "current-password"}
              required
              minLength={signup ? 12 : 1}
              maxLength={128}
            />
          </label>
          {signup && (
            <p className="form-note">
              12 caractères minimum. Un e-mail de confirmation vous sera envoyé.
            </p>
          )}
          <Submit>{signup ? "Créer mon compte" : "Se connecter"}</Submit>
        </form>
        <p className="small" style={{ marginTop: 24 }}>
          {signup ? "Vous avez déjà un compte ?" : "Première visite ?"}{" "}
          <Link
            className="text-link"
            href={signup ? "/connexion" : "/inscription"}
          >
            {signup ? "Se connecter" : "Créer un compte"}
          </Link>
        </p>
        {!signup && (
          <details className="auth-divider">
            <summary>Mot de passe oublié ?</summary>
            <form
              action={resetPassword}
              className="form"
              style={{ marginTop: 16 }}
            >
              <label>
                Votre e-mail
                <input name="email" type="email" required />
              </label>
              <Submit>Envoyer le lien</Submit>
            </form>
          </details>
        )}
      </div>
    </main>
  );
}
