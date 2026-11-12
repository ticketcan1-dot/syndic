import { I18nText } from "@/components/i18n";
import { supabase } from "@/lib/supabase/server";
export async function JoinContext({ next }: { next?: string }) {
  if (!next) return null;
  const token = next.split("/").pop() ?? "";
  const db = await supabase();
  const { data } = await db.rpc("syndic_residence_link_info", { token });
  const info = data as { residence: string; syndic: string } | null;
  if (!info) return null;
  return (
    <div className="notice" role="status">
      <I18nText text="Pour rejoindre" /> <strong>{info.residence}</strong> ({info.syndic})
    </div>
  );
}
