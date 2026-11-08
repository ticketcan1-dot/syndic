import { z } from "zod";
import Link from "next/link";
import { provisionClient } from "@/lib/provision";
import { Brand } from "@/components/brand";
import { Submit } from "@/components/submit";
import { Notice } from "@/components/notice";
import { joinResidence } from "./actions";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { token } = await params;
  let residence = "";
  let manager = "";
  try {
    if (z.uuid().safeParse(token).success) {
      const db = provisionClient();
      const { data: link } = await db
        .from("syndic_join_links")
        .select("unit_id")
        .eq("id", token)
        .is("used_by", null)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();
      if (link) {
        const { data: unit } = await db
          .from("syndic_units")
          .select("residence_id")
          .eq("id", link.unit_id)
          .single();
        if (unit) {
          const { data: r } = await db
            .from("syndic_residences")
            .select("name,organization_id")
            .eq("id", unit.residence_id)
            .single();
          if (r) {
            const { data: o } = await db
              .from("syndic_organizations")
              .select("name")
              .eq("id", r.organization_id)
              .single();
            residence = r.name;
            manager = o?.name ?? "Votre syndic";
          }
        }
      }
    }
  } catch {}
  return (
    <main className="auth-shell">
      <section className="card auth-card">
        <Brand />
        {residence ? (
          <>
            <span className="eyebrow">Bienvenue chez vous</span>
            <h1>Bonjour 👋</h1>
            <p>
              Vous êtes invité à rejoindre <strong>{residence}</strong>, gérée
              par <strong>{manager}</strong>.
            </p>
            <Notice message={(await searchParams).message} />
            <form action={joinResidence} className="form">
              <input type="hidden" name="token" value={token} />
              <label>
                Prénom
                <input
                  name="first_name"
                  autoComplete="given-name"
                  required
                  minLength={2}
                  maxLength={80}
                />
              </label>
              <label>
                Nom
                <input
                  name="last_name"
                  autoComplete="family-name"
                  required
                  minLength={2}
                  maxLength={80}
                />
              </label>
              <label>
                Pseudo
                <input
                  name="nickname"
                  autoComplete="nickname"
                  required
                  minLength={2}
                  maxLength={40}
                />
              </label>
              <label>
                Téléphone
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  maxLength={24}
                />
              </label>
              <label>
                E-mail de connexion
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
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                />
                <span className="form-note">12 caractères minimum</span>
              </label>
              <Submit>Rejoindre ma résidence</Submit>
            </form>
          </>
        ) : (
          <>
            <h1>Invitation indisponible</h1>
            <p>
              Ce lien a expiré, a déjà été utilisé ou a été révoqué. Demandez un
              nouveau lien à votre syndic.
            </p>
            <Link href="/connexion" className="button primary">
              Se connecter
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
