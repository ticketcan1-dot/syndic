import { I18nText } from "@/components/i18n";
import { supabase } from "@/lib/supabase/server";
export async function SuspendedNotice() {
  const db = await supabase();
  const { data } = await db.rpc("syndic_my_suspended_spaces");
  const names = (data ?? []) as string[];
  if (!names.length) return null;
  return (
    <div role="alert" className="notice">
      <strong>{names.join(", ")}</strong> —{" "}
      <I18nText text="Espace suspendu : l’abonnement du syndic est terminé. L’accès sera rétabli dès son renouvellement." />
    </div>
  );
}
