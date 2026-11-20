import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  // Refreshes the session cookie when needed. getClaims verifies the token locally when the project
  // uses asymmetric signing keys (no network call); pages still check the user with getUser().
  await client.auth.getClaims();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/rejoindre/:path*",
    "/",
    "/compte/:path*",
    "/invitation/:path*",
    "/incidents/:path*",
    "/operations/:path*",
    "/discussion/:path*",
    "/api/notifications",
    "/app/:path*",
    "/admin/:path*",
    "/resident/:path*",
    "/connexion",
    "/reinitialiser-mot-de-passe",
    "/inscription",
    "/en-attente",
    "/acces-admin",
    "/abonnement",
    "/auth/:path*",
  ],
};
