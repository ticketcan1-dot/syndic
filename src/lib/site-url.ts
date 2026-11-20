import "server-only";
import { headers } from "next/headers";
// Public address of the site, taken from the incoming request so that shared links always point to the
// domain actually in use (Vercel or custom domain). NEXT_PUBLIC_SITE_URL is only a fallback.
export async function siteUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto =
      h.get("x-forwarded-proto")?.split(",")[0] ??
      (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
}
