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
export async function inviteToApartment(form: FormData) {
  const residence = residenceOf(form);
  const { db } = await signedIn();
  const unit = z.uuid().safeParse(form.get("unit_id"));
  if (!unit.success) back(residence, "Choisissez un appartement.");
  const { error } = await db.rpc("syndic_create_join_link", { target_unit: unit.data });
  back(residence, error ? "Création du lien refusée." : "Lien d’invitation créé : copiez-le et envoyez-le à l’habitant.");
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
export async function decideRequest(form: FormData) {
  const residence = residenceOf(form);
  const { db } = await signedIn();
  const id = z.uuid().safeParse(form.get("id"));
  const approve = form.get("decision") === "approve";
  if (!id.success) back(residence, "Demande invalide.");
  const { error } = await db.rpc("syndic_decide_join_request", { target: id.data, approve });
  back(residence, error ? "Décision refusée. Vérifiez vos droits." : approve ? "Demande approuvée : l’habitant a maintenant accès à son logement." : "Demande refusée.");
}
export async function moderate(form: FormData) {
  const residence = residenceOf(form);
  const { db } = await signedIn();
  const input = z
    .object({ unit: z.uuid(), user: z.uuid(), task: z.enum(["block", "unblock", "remove"]) })
    .safeParse(Object.fromEntries(form));
  if (!input.success) back(residence, "Action invalide.");
  const v = input.data;
  const { error } =
    v.task === "remove"
      ? await db.rpc("syndic_remove_resident", { target_unit: v.unit, target_user: v.user })
      : await db.rpc("syndic_set_resident_blocked", { target_unit: v.unit, target_user: v.user, blocked: v.task === "block" });
  back(residence, error ? "Action refusée. Vérifiez vos droits." : v.task === "remove" ? "Utilisateur supprimé de votre espace." : v.task === "block" ? "Utilisateur bloqué." : "Utilisateur débloqué.");
}
