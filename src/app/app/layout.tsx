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
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <nav>
          <Link href="/app">
            <LayoutDashboard size={19} />
            Vue d’ensemble
          </Link>
          <Link href="/app/residences">
            <Building2 size={19} />
            Résidences
          </Link>
          <Link href="/app/lots">
            <Grid2X2 size={19} />
            Lots
          </Link>
        </nav>
        <div className="bottom">
          <ShieldCheck size={22} />
          <p className="small">
            Votre espace de gestion
            <br />
            SyndiConnect · Version pilote
          </p>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>{user.email}</span>
          <form action={signOut}>
            <button type="submit" className="text-link">
              Déconnexion
            </button>
          </form>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
