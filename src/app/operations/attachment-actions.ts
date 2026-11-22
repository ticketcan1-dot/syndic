"use server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { signedIn } from "@/lib/access";
import { provisionClient } from "@/lib/provision";
import { EXPENSE_BUCKET, MAX_ATTACHMENT_BYTES, attachmentTypes } from "@/lib/attachments";
const fileSchema = z.object({ name: z.string().trim().min(1).max(200), type: z.string().max(120), size: z.number().int().positive() });
// Step 1: the syndic asks for upload slots; the browser then sends the files straight to storage.
export async function prepareExpenseUploads(expenseId: string, files: { name: string; type: string; size: number }[]) {
  const { db } = await signedIn();
  const id = z.uuid().safeParse(expenseId);
  const list = z.array(fileSchema).min(1).max(10).safeParse(files);
  if (!id.success || !list.success) return { error: "Fichiers invalides (10 maximum)." };
  for (const f of list.data) {
    if (!attachmentTypes[f.type]) return { error: `Format non accepté : ${f.name}` };
    if (f.size > MAX_ATTACHMENT_BYTES) return { error: `Fichier trop lourd (10 Mo maximum) : ${f.name}` };
  }
  const { data: allowed } = await db.rpc("syndic_can_manage_expense", { target_expense: id.data });
  if (allowed !== true) return { error: "Vous ne pouvez pas modifier cette dépense." };
  try {
    const storage = provisionClient().storage.from(EXPENSE_BUCKET);
    const uploads = [];
    for (const f of list.data) {
      const path = `${id.data}/${randomUUID()}.${attachmentTypes[f.type]}`;
      const { data, error } = await storage.createSignedUploadUrl(path);
      if (error || !data) return { error: "Préparation de l’envoi impossible." };
      uploads.push({ path, token: data.token });
    }
    return { uploads };
  } catch {
    return { error: "Préparation de l’envoi impossible (configuration du serveur)." };
  }
}
// Step 2: once the files are in storage, they are attached to the expense.
export async function registerExpenseUploads(
  expenseId: string,
  items: { path: string; name: string; type: string; size: number }[],
) {
  const { db } = await signedIn();
  const id = z.uuid().safeParse(expenseId);
  if (!id.success) return { error: "Dépense invalide." };
  let saved = 0;
  for (const item of items.slice(0, 10)) {
    const { error } = await db.rpc("syndic_add_expense_attachment", {
      target_expense: id.data,
      path: item.path,
      original_name: item.name,
      mime: item.type,
      bytes: item.size,
    });
    if (!error) saved++;
  }
  revalidatePath("/operations");
  return { saved };
}
export async function removeExpenseAttachment(form: FormData) {
  const { db } = await signedIn();
  const id = z.uuid().safeParse(form.get("attachment"));
  const expense = z.uuid().safeParse(form.get("expense"));
  const backRaw = String(form.get("back") ?? "");
  const back = /^\/app\/residences\/[0-9a-f-]{36}$/i.test(backRaw) ? backRaw + "?tab=depenses" : "/operations?view=expenses";
  let ok = false;
  if (id.success) {
    const { data: path, error } = await db.rpc("syndic_remove_expense_attachment", { target: id.data });
    ok = !error;
    if (ok && typeof path === "string") await provisionClient().storage.from(EXPENSE_BUCKET).remove([path]).catch(() => {});
  }
  revalidatePath("/operations");
  const open = expense.success ? `&open=${expense.data}#e-${expense.data}` : "";
  redirect(back + (back.includes("?") ? "&" : "?") + "message=" + encodeURIComponent(ok ? "Pièce jointe supprimée." : "Suppression refusée.") + open);
}
// Expense creation returning its id, so that attachments can be sent right after.
type Member = { user_id: string; email: string; status: string; name: string; phone: string; blocked: boolean; apartments: string[] };
// Residents ticked in « Pour qui ? » who have no apartment yet get one in their name, so that they
// can receive their share of the expense. Returns the ids of those apartments.
async function unitsForMembers(db: Awaited<ReturnType<typeof signedIn>>["db"], residence: string, picked: string[]) {
  const users = picked.filter((p) => p.startsWith(residence + ":")).map((p) => p.slice(residence.length + 1));
  if (!users.length) return [];
  const { data } = await db.rpc("syndic_residence_people", { target_residence: residence });
  const people = (data ?? []) as Member[];
  const ids: string[] = [];
  for (const userId of users) {
    const m = people.find((p) => p.user_id === userId && p.status === "approved" && !p.blocked);
    if (!m) continue;
    const label = m.apartments[0] ?? ((m.name || m.email.split("@")[0]).trim().slice(0, 60) || "Habitant");
    if (!m.apartments.length) {
      const { error } = await db.rpc("syndic_update_member", {
        target_residence: residence,
        target_user: userId,
        member_name: m.name,
        member_phone: m.phone,
        apartments: [label],
      });
      if (error) continue;
    }
    const { data: unit } = await db.from("syndic_units").select("id").eq("residence_id", residence).ilike("label", label).limit(1).maybeSingle();
    if (unit) ids.push(unit.id);
  }
  return ids;
}
export async function createExpenseReturningId(form: FormData) {
  const { db } = await signedIn();
  const input = z
    .object({
      residence: z.uuid(),
      title: z.string().trim().min(3).max(160),
      amount: z
        .string()
        .trim()
        .regex(/^\d+([.,]\d{1,2})?$/)
        .transform((v) => Math.round(Number(v.replace(",", ".")) * 100))
        .pipe(z.number().int().positive().max(10000000000)),
      date: z.iso.date(),
      units: z.array(z.uuid()),
      members: z.array(z.string().max(80)),
    })
    .safeParse({
      residence: form.get("target") ?? form.get("residence_id"),
      title: form.get("title"),
      amount: form.get("amount"),
      date: form.get("date"),
      units: form.getAll("units"),
      members: form.getAll("members"),
    });
  if (!input.success) return { error: "Vérifiez le titre, le montant, la date et les appartements." };
  const v = input.data;
  if (!v.units.length && !v.members.length) return { error: "Choisissez au moins un appartement ou un habitant." };
  const extra = await unitsForMembers(db, v.residence, v.members);
  v.units = [...new Set([...v.units, ...extra])];
  if (!v.units.length) return { error: "Choisissez au moins un appartement ou un habitant." };
  const { data, error } = await db.rpc("syndic_create_expense", {
    target_residence: v.residence,
    expense_title: v.title,
    total_cents: v.amount,
    deadline: v.date,
    selected_units: v.units,
  });
  if (error || !data) return { error: "Dépense refusée. Vérifiez vos droits et votre abonnement." };
  revalidatePath("/operations");
  return { id: data as string };
}
