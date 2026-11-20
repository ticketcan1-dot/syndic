"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { translate, useLocale } from "@/components/i18n";
// Bell with the number of unread notifications. It rings when something new arrives
// (a reminder from the syndic, a reply, a poll…) and keeps a gentle swing while unread items remain.
export function NotificationBell() {
  const locale = useLocale();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [ring, setRing] = useState(false);
  const previous = useRef<number | null>(null);
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const { unread: count } = (await res.json()) as { unread: number };
      if (previous.current !== null && count > previous.current) {
        setRing(true);
        setTimeout(() => setRing(false), 2000);
      }
      previous.current = count;
      setUnread(count);
    } catch {
      /* offline: keep the last value */
    }
  }, []);
  useEffect(() => {
    refresh();
    const timer = setInterval(() => document.visibilityState === "visible" && refresh(), 30000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);
  useEffect(() => {
    refresh();
  }, [pathname, refresh]);
  const label =
    translate("Notifications", locale) + (unread ? ` (${unread} ${translate("non lues", locale)})` : "");
  return (
    <Link
      href="/operations?view=notifications"
      className={"icon-button bell" + (unread ? " has-unread" : "") + (ring ? " ring" : "")}
      aria-label={label}
      title={label}
    >
      <Bell size={21} />
      {unread > 0 && <span className="bell-count">{unread > 99 ? "99+" : unread}</span>}
    </Link>
  );
}
