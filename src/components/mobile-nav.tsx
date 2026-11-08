"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Home, Wallet, MessageCircle, CalendarDays, Users } from "lucide-react";
export function MobileNav() {
  const path = usePathname();
  const query = useSearchParams();
  const view = query.get("view") ?? "balances";
  const items = [
    {
      href: "/operations",
      title: "Accueil",
      icon: Home,
      active: path === "/operations" && view === "balances",
    },
    {
      href: "/operations?view=expenses",
      title: "Dépenses",
      icon: Wallet,
      active: path === "/operations" && view === "expenses",
    },
    {
      href: "/operations?view=messages",
      title: "Messages",
      icon: MessageCircle,
      active: path === "/operations" && view === "messages",
    },
    {
      href: "/operations?view=meetings",
      title: "Activités",
      icon: CalendarDays,
      active: path === "/operations" && view === "meetings",
    },
    {
      href: "/app/communaute",
      title: "Résidence",
      icon: Users,
      active: path.startsWith("/app"),
    },
  ];
  return (
    <nav className="mobile-nav" aria-label="Navigation principale">
      {items.map(({ href, title, icon: Icon, active }) => (
        <Link
          key={title}
          href={href}
          className={active ? "selected" : ""}
          aria-current={active ? "page" : undefined}
        >
          <Icon size={22} />
          <span>{title}</span>
        </Link>
      ))}
    </nav>
  );
}
