import { I18nText } from "@/components/i18n";
import { AppFrame } from "@/components/app-frame";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard, Building2, Grid2X2, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { supabase } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import { daysLeft, planLabels } from "@/lib/plans";
export const dynamic = "force-dynamic";
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/connexion");
  const [{ data: isAdmin }, { data: status }, { data: membership }] =
    await Promise.all([
      db.rpc("syndic_is_platform_admin"),
      db.rpc("syndic_my_status"),
      db
        .from("syndic_organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1),
    ]);
  const orgId = membership?.[0]?.organization_id;
  const { data: subs } = orgId
    ? await db
        .from("syndic_subscription_records")
        .select("plan,status,ends_at")
        .eq("organization_id", orgId)
    : { data: null };
  if (
    isAdmin !== true &&
    !status?.member &&
    (status?.request === "pending" || status?.request === "rejected")
  )
    redirect("/en-attente");
  // A normal account only sees the spaces it has been authorised to see.
  if (isAdmin !== true && !status?.member) redirect("/resident");
  const sub = subs?.[0];
  if (orgId && isAdmin !== true && (!sub || daysLeft(sub.ends_at) <= 0 || !["active", "trialing"].includes(sub.status)))
    redirect("/abonnement?message=" + encodeURIComponent("Votre abonnement est terminé : l’accès à votre espace et à celui de vos habitants est suspendu jusqu’à la validation de votre paiement."));
  const remaining = sub ? daysLeft(sub.ends_at) : null;
  const expired =
    sub &&
    (remaining! <= 0 || !["active", "trialing"].includes(sub.status));
  return (
    <AppFrame>
      <div className="container">
        <nav className="residence-tabs">
          <Link href="/app">
            <I18nText text="Vue d’ensemble" />
          </Link>
          <Link href="/app/residences">
            <I18nText text="Immeubles" />
          </Link>
          <Link href="/app/lots">
            <I18nText text="Appartements" />
          </Link>
          <Link href="/app/communaute">
            <I18nText text="Habitants" />
          </Link>
          <Link href="/abonnement">
            <I18nText text="Abonnement" />
          </Link>
          {isAdmin === true && (
            <Link href="/admin">
              <I18nText text="Administration" />
            </Link>
          )}
          <form action={signOut}>
            <button className="text-link">
              <I18nText text="Déconnexion" />
            </button>
          </form>
        </nav>
        <main className="section">
          {sub && (
            <div
              className="notice subscription-banner"
              role={expired ? "alert" : "status"}
            >
              <I18nText text={planLabels[sub.plan] ?? sub.plan} />
              {" · "}
              {expired ? (
                <I18nText text="Abonnement expiré : renouvelez-le pour continuer." />
              ) : (
                <>
                  <I18nText text="Jours restants :" />
                  <strong>{remaining}</strong>
                </>
              )}
              {" · "}
              <Link href="/abonnement" className="text-link">
                <I18nText text="Gérer mon abonnement" />
              </Link>
            </div>
          )}
          {children}
        </main>
      </div>
    </AppFrame>
  );
}
