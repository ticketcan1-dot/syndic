"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { signedIn } from "@/lib/access";
const money = z
  .string()
  .trim()
  .regex(/^\d+([.,]\d{1,2})?$/)
  .transform((v) => Math.round(Number(v.replace(",", ".")) * 100))
  .pipe(z.number().int().positive().max(10000000000));
function backTo(form: FormData) {
  const back = String(form.get("back") ?? "");
  return /^\/app\/residences\/[0-9a-f-]{36}$/i.test(back) ? back + "?tab=depenses" : "/operations?view=expenses";
}
function done(form: FormData, text: string): never {
  revalidatePath("/operations");
  const back = backTo(form);
  // Reopen the expense card the action was made from.
  const expense = z.uuid().safeParse(form.get("expense"));
  const open = expense.success ? `&open=${expense.data}#e-${expense.data}` : "";
  redirect(back + (back.includes("?") ? "&" : "?") + "message=" + encodeURIComponent(text) + open);
}
export async function claimPayment(form: FormData) {
  const { db } = await signedIn();
  const input = z
    .object({
      charge: z.uuid(),
      amount: money,
      date: z.iso.date(),
      method: z.enum(["virement", "especes", "cheque", "autre"]),
      reference: z.string().trim().max(160).default(""),
      note: z.string().trim().max(500).default(""),
    })
    .safeParse({
      charge: form.get("charge"),
      amount: form.get("amount"),
      date: form.get("date"),
      method: form.get("method"),
      reference: form.get("reference") ?? "",
      note: form.get("note") ?? "",
    });
  if (!input.success) done(form, "Vérifiez le montant, la date et le mode de règlement.");
  const v = input.data;
  const { error } = await db.rpc("syndic_claim_payment", {
    target_charge: v.charge,
    paid_cents: v.amount,
    payment_date: v.date,
    payment_method: v.method,
    payment_reference: v.reference,
    claim_note: v.note,
  });
  done(form, error ? "Déclaration refusée : montant supérieur au reste à payer, date future ou trop de déclarations en attente." : "Règlement envoyé. Votre syndic doit le confirmer.");
}
export async function decideClaim(form: FormData) {
  const { db } = await signedIn();
  const input = z
    .object({ claim: z.uuid(), decision: z.enum(["approve", "reject"]), reason: z.string().trim().max(500).default("") })
    .safeParse({ claim: form.get("claim"), decision: form.get("decision"), reason: form.get("reason") ?? "" });
  if (!input.success) done(form, "Action invalide.");
  const approve = input.data.decision === "approve";
  const { error } = await db.rpc("syndic_decide_payment_claim", { target: input.data.claim, approve, reason: input.data.reason });
  done(form, error ? "Décision impossible : déjà traitée ou montant supérieur au reste à payer." : approve ? "Règlement confirmé." : "Règlement refusé.");
}
export async function recordPayment(form: FormData) {
  const { db } = await signedIn();
  const input = z
    .object({ charge: z.uuid(), amount: money, date: z.iso.date(), reference: z.string().trim().max(150).default("") })
    .safeParse({ charge: form.get("charge"), amount: form.get("amount"), date: form.get("date"), reference: form.get("reference") ?? "" });
  if (!input.success) done(form, "Vérifiez le montant et la date.");
  const v = input.data;
  // The reference is optional for the syndic; a unique one is generated when left empty or too short.
  const suffix = Math.random().toString(36).slice(2, 6);
  v.reference = v.reference.length >= 3 ? v.reference : `Reçu le ${v.date} #${suffix}`;
  const { error } = await db.rpc("syndic_record_payment", { target_charge: v.charge, paid_cents: v.amount, payment_reference: v.reference, payment_date: v.date });
  done(form, error ? "Enregistrement refusé : vérifiez le montant restant et la date." : "Règlement enregistré.");
}
export async function remindUnpaid(form: FormData) {
  const { db } = await signedIn();
  const charges = z.array(z.uuid()).min(1).max(200).safeParse(form.getAll("charge"));
  if (!charges.success) done(form, "Aucun impayé à relancer.");
  let sent = 0;
  for (const charge of charges.data) {
    const { error } = await db.rpc("syndic_remind_charge", { target_charge: charge });
    if (!error) sent++;
  }
  done(form, sent ? `Rappel envoyé (${sent}).` : "Rappel impossible.");
}
