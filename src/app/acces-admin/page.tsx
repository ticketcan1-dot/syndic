import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { I18nText } from "@/components/i18n";
import { LocalizedInput } from "@/components/i18n-input";
import { Brand } from "@/components/brand";
import { Notice } from "@/components/notice";
import { Submit } from "@/components/submit";
import { adminSignIn } from "@/app/actions";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  return (
    <main className="auth-shell admin-auth">
      <div className="card auth-card">
        <Brand />
        <span className="badge" style={{ marginTop: 16 }}>
          <ShieldCheck size={14} /> <I18nText text="Accès administrateur" />
        </span>
        <h1>
          <I18nText text="Console d’administration" />
        </h1>
        <p>
          <I18nText text="Réservé à l’équipe de la plateforme." />
        </p>
        <Notice message={(await searchParams).message} />
        <form action={adminSignIn} className="form">
          <label>
            <I18nText text="E-mail administrateur" />
            <LocalizedInput name="email" type="email" autoComplete="username" required maxLength={254} />
          </label>
          <label>
            <I18nText text="Mot de passe" />
            <LocalizedInput name="password" type="password" autoComplete="current-password" required maxLength={128} />
          </label>
          <Submit>
            <I18nText text="Accéder à la console" />
          </Submit>
        </form>
        <p className="small" style={{ marginTop: 24 }}>
          <Link className="text-link" href="/connexion">
            <I18nText text="Connexion syndic ou habitant" />
          </Link>
        </p>
      </div>
    </main>
  );
}
