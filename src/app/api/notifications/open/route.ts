import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase/server";
import { notificationTarget } from "@/lib/notification-target";
// Opening a notification marks it as read and goes to the page it is about.
export async function GET(request: NextRequest) {
  const id = z.uuid().safeParse(request.nextUrl.searchParams.get("id"));
  const db = await supabase();
  let target = "/operations?view=notifications";
  if (id.success) {
    const { data } = await db.from("syndic_inbox").select("title,link").eq("id", id.data).maybeSingle();
    if (data) {
      target = notificationTarget(data.title, data.link);
      await db.rpc("syndic_read_notification", { target: id.data });
    }
  }
  return NextResponse.redirect(new URL(target, request.url));
}
