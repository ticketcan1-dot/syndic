"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { signedIn } from "@/lib/access";
function back(id: string, text: string): never {
  revalidatePath("/app/residences/" + id);
  redirect("/app/residences/" + id + "?message=" + encodeURIComponent(text));
}
function residenceOf(form: FormData) {
  const id = z.uuid().safeParse(form.get("residence_id"));
  if (!id.success) redirect("/app/residences");
  return id.data;
}
export async function addApartment(form: FormData) {
  const residence = residenceOf(form);
  const { db } = await signedIn();
  const label = z.string().trim().min(1).max(60).safeParse(form.get("label"));
  if (!label.success) back(residence, "Indiquez le numéro de l’appartement.");
  const { error } = await db.from("syndic_units").insert({
    residence_id: residence,
    label: label.data,
    kind: "apartment",
    share: 1,
  });
  back(residence, error ? "Création refusée ou appartement déjà existant." : "Appartement ajouté.");
}
export async function addExpense(form: FormData) {
  const residence = residenceOf(form);
  const { db } = await signedIn();
  const input = z
    .object({
      title: z.string().trim().min(3).max(160),
      amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
      date: z.iso.date(),
    })
    .safeParse(Object.fromEntries(form));
  const units = z.array(z.uuid()).min(1).safeParse(form.getAll("units"));
  if (!input.success || !units.success)
    back(residence, "Vérifiez le titre, le montant, la date et les appartements.");
  const { error } = await db.rpc("syndic_create_expense", {
    target_residence: residence,
    expense_title: input.data.title,
    total_cents: Math.round(Number(input.data.amount) * 100),
    deadline: input.data.date,
    selected_units: units.data,
  });
  back(residence, error ? "Dépense refusée. Vérifiez vos droits et votre abonnement." : "Dépense ajoutée et répartie entre les appartements.");
}
export async function createResidenceLink(form: FormData) {
  const residence = residenceOf(form);
  const { db } = await signedIn();
  const { error } = await db.rpc("syndic_create_residence_link", { target_residence: residence });
  back(residence, error ? "Création du lien refusée." : "Lien de la résidence créé : envoyez-le à tous vos habitants.");
}
export async function revokeResidenceLink(form: FormData) {
  const residence = residenceOf(form);
  const { db } = await signedIn();
  const token = z.uuid().safeParse(form.get("token"));
  if (!token.success) back(residence, "Lien invalide.");
  const { error } = await db.rpc("syndic_revoke_residence_link", { token: token.data });
  back(residence, error ? "Révocation refusée." : "Lien désactivé.");
}
export async function decideMember(form: FormData) {
  const residence = residenceOf(form);
  const { db } = await signedIn();
  const user = z.uuid().safeParse(form.get("user"));
  const approve = form.get("decision") === "approve";
  if (!user.success) back(residence, "Demande invalide.");
  const { error } = await db.rpc("syndic_decide_member", { target_residence: residence, target_user: user.data, approve });
  back(residence, error ? "Décision refusée. Vérifiez vos droits." : approve ? "Habitant approuvé. Vous pouvez modifier ses informations et ses appartements." : "Demande refusée.");
}
export async function updateMember(form: FormData) {
  const residence = residenceOf(form);
  const { db } = await signedIn();
  const input = z
    .object({
      user: z.uuid(),
      name: z.string().trim().max(160),
      phone: z.string().trim().max(24),
      apartments: z.string().max(1000),
    })
    .safeParse({ user: form.get("user"), name: form.get("name") ?? "", phone: form.get("phone") ?? "", apartments: form.get("apartments") ?? "" });
  if (!input.success) back(residence, "Vérifiez les informations de l’habitant.");
  const apartments = input.data.apartments.split(",").map((a) => a.trim()).filter(Boolean);
  if (apartments.some((a) => a.length > 60)) back(residence, "Un numéro d’appartement est trop long.");
  const { error } = await db.rpc("syndic_update_member", {
    target_residence: residence,
    target_user: input.data.user,
    member_name: input.data.name,
    member_phone: input.data.phone,
    apartments,
  });
  back(residence, error ? "Modification refusée." : "Informations de l’habitant enregistrées.");
}
export async function moderateMember(form: FormData) {
  const residence = residenceOf(form);
  const { db } = await signedIn();
  const input = z.object({ user: z.uuid(), task: z.enum(["block", "unblock", "remove"]) }).safeParse(Object.fromEntries(form));
  if (!input.success) back(residence, "Action invalide.");
  const v = input.data;
  const { error } =
    v.task === "remove"
      ? await db.rpc("syndic_remove_member", { target_residence: residence, target_user: v.user })
      : await db.rpc("syndic_set_member_blocked", { target_residence: residence, target_user: v.user, blocked: v.task === "block" });
  back(residence, error ? "Action refusée. Vérifiez vos droits." : v.task === "remove" ? "Utilisateur supprimé de votre espace." : v.task === "block" ? "Utilisateur bloqué." : "Utilisateur débloqué.");
}
