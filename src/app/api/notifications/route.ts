import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
// Number of unread notifications of the signed-in user (row-level security keeps it to their own inbox).
export async function GET() {
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.json({ unread: 0 }, { headers: { "Cache-Control": "no-store" } });
  const { count } = await db
    .from("syndic_inbox")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);
  return NextResponse.json({ unread: count ?? 0 }, { headers: { "Cache-Control": "no-store" } });
}
