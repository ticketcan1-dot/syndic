"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { I18nText } from "@/components/i18n";
// Section links of a space; the current one is highlighted.
export function SectionTabs({ items }: { items: { href: string; label: string; exact?: boolean }[] }) {
  const path = usePathname();
  return (
    <>
      {items.map((item) => {
        const active = item.exact ? path === item.href : path === item.href || path.startsWith(item.href + "/");
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
            <I18nText text={item.label} />
          </Link>
        );
      })}
    </>
  );
}
