import { cache } from "react";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase/server";
// One Supabase client and one user check per request, shared by layouts, pages and actions.
export const currentSession = cache(async () => {
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  return { db, user };
});
export async function signedIn() {
  const { db, user } = await currentSession();
  if (!user) redirect("/connexion");
  return { db, user };
}
export async function platformAdmin() {
  const { db, user } = await currentSession();
  if (!user) redirect("/acces-admin");
  const { data, error } = await db.rpc("syndic_is_platform_admin");
  if (error || data !== true) redirect("/acces-refuse");
  return { db, user };
}
