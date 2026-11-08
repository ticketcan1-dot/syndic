import Link from "next/link";
import { Bell, Settings2 } from "lucide-react";
import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { MobileNav } from "@/components/mobile-nav";
export function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mobile-app">
      <header className="mobile-header">
        <Brand />
        <div className="actions">
          <Link
            href="/operations?view=notifications"
            className="icon-button"
            aria-label="Notifications"
          >
            <Bell size={21} />
          </Link>
          <Link href="/compte" className="icon-button" aria-label="Mon profil">
            <Settings2 size={21} />
          </Link>
        </div>
      </header>
      <div className="mobile-content">{children}</div>
      <Suspense>
        <MobileNav />
      </Suspense>
    </div>
  );
}
