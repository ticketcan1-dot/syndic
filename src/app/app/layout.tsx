import { AppFrame } from "@/components/app-frame";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard, Building2, Grid2X2, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { supabase } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
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
  const { data: isAdmin } = await db.rpc("syndic_is_platform_admin");
  return (
    <AppFrame>
      <div className="container">
        <nav className="residence-tabs">
          <Link href="/app">Vue d’ensemble</Link>
          <Link href="/app/residences">Résidences</Link>
          <Link href="/app/lots">Appartements</Link>
          <Link href="/app/communaute">Habitants</Link>
          {isAdmin === true && <Link href="/admin">Administration</Link>}
          <form action={signOut}>
            <button className="text-link">Déconnexion</button>
          </form>
        </nav>
        <main className="section">{children}</main>
      </div>
    </AppFrame>
  );
}
