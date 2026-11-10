import { I18nText } from "@/components/i18n";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { platformAdmin } from "@/lib/access";
import { signOut } from "@/app/actions";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await platformAdmin();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <nav>
          <Link href="/admin">
            <I18nText text="Administration plateforme" />
          </Link>
          <Link href="/app">
            <I18nText text="Espace syndic" />
          </Link>
          <Link href="/resident">
            <I18nText text="Espace résident" />
          </Link>
        </nav>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            {user.email}
            <I18nText text="· Administration" />
          </span>
          <form action={signOut}>
            <button className="text-link">
              <I18nText text="Déconnexion" />
            </button>
          </form>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
