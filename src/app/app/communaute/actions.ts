"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { signedIn } from "@/lib/access";
function result(message: string): never {
  revalidatePath("/app/communaute");
  redirect("/app/communaute?message=" + encodeURIComponent(message));
}
export async function inviteResident(form: FormData) {
  const { db } = await signedIn();
  const input = z
    .object({ unit_id: z.uuid(), email: z.email() })
    .safeParse(Object.fromEntries(form));
  if (!input.success) result("Vérifiez le lot et l’adresse e-mail.");
  const { error } = await db.rpc("syndic_invite_resident", {
    target_unit: input.data.unit_id,
    resident_email: input.data.email,
  });
  if (error) result("Invitation refusée. Vérifiez vos droits sur ce lot.");
  result(
    "Invitation créée pour 7 jours. Transmettez au résident l’adresse de l’espace résident ; aucun e-mail automatique n’a été envoyé.",
  );
}
export async function revokeInvitation(form: FormData) {
  const { db } = await signedIn();
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) result("Invitation invalide.");
  const { error } = await db.rpc("syndic_revoke_invitation", {
    target: id.data,
  });
  if (error) result("Révocation refusée.");
  result("Invitation et accès associé révoqués.");
}
export async function publishPost(form: FormData) {
  const { db } = await signedIn();
  const input = z
    .object({
      residence_id: z.uuid(),
      title: z.string().trim().min(3).max(160),
      body: z.string().trim().min(3).max(5000),
    })
    .safeParse(Object.fromEntries(form));
  if (!input.success) result("Vérifiez la résidence, le titre et le texte.");
  const { error } = await db.rpc("syndic_publish_post", {
    target_residence: input.data.residence_id,
    post_title: input.data.title,
    post_body: input.data.body,
  });
  if (error) result("Publication refusée. Vérifiez vos droits.");
  result("Annonce publiée aux résidents de cette résidence.");
}
