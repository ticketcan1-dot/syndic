"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { platformAdmin } from "@/lib/access";
export async function setSubscription(form: FormData) {
  const { db } = await platformAdmin();
  const input = z
    .object({
      organization_id: z.uuid(),
      plan: z.enum(["essentiel", "pro", "business"]),
      status: z.enum([
        "trialing",
        "active",
        "past_due",
        "canceled",
        "expired",
        "suspended",
      ]),
      end_date: z.iso.date(),
      reason: z.string().trim().min(5).max(500),
    })
    .safeParse(Object.fromEntries(form));
  if (!input.success)
    redirect("/admin?message=Vérifiez%20les%20champs%20et%20le%20motif.");
  const v = input.data;
  const { error } = await db.rpc("syndic_set_subscription", {
    target: v.organization_id,
    selected_plan: v.plan,
    selected_status: v.status,
    end_date: `${v.end_date}T23:59:59Z`,
    reason: v.reason,
  });
  if (error)
    redirect(
      "/admin?message=Modification%20refusée.%20Vérifiez%20la%20date%20de%20fin.",
    );
  revalidatePath("/admin");
  redirect("/admin?message=Abonnement%20mis%20à%20jour%20et%20historisé.");
}
