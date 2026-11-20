"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
// Thin bar at the top of the screen: starts on click of an internal link, ends when the new page is shown.
function Bar() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as HTMLElement | null)?.closest("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      setState("loading");
    }
    function onSubmit(event: SubmitEvent) {
      const form = event.target as HTMLFormElement | null;
      if (form && !event.defaultPrevented) setState("loading");
    }
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);
  useEffect(() => {
    // The URL changes as soon as the loading skeleton appears: keep the bar running until the real
    // page has replaced the skeleton.
    const finish = () => setState((current) => (current === "loading" ? "done" : current));
    if (!document.querySelector(".skeleton-page")) {
      finish();
      return;
    }
    const observer = new MutationObserver(() => {
      if (!document.querySelector(".skeleton-page")) {
        observer.disconnect();
        finish();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname, search]);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (state === "done") timer.current = setTimeout(() => setState("idle"), 400);
    // Never stay stuck (e.g. a form that only shows a message on the same page).
    if (state === "loading") timer.current = setTimeout(() => setState("done"), 15000);
  }, [state]);
  return <div className={"nav-progress " + state} aria-hidden="true" />;
}
export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}
