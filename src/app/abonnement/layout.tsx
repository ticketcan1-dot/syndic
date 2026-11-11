import Link from "next/link";
import { I18nText } from "@/components/i18n";
import { AppFrame } from "@/components/app-frame";
import { signOut } from "@/app/actions";
export const dynamic = "force-dynamic";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppFrame>
      <div className="container">
        <nav className="residence-tabs">
          <Link href="/app">
            <I18nText text="Espace syndic" />
          </Link>
          <Link href="/abonnement">
            <I18nText text="Abonnement" />
          </Link>
          <form action={signOut}>
            <button className="text-link">
              <I18nText text="Déconnexion" />
            </button>
          </form>
        </nav>
        <main className="section">{children}</main>
      </div>
    </AppFrame>
  );
}
