"use server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { signedIn } from "@/lib/access";
import { provisionClient } from "@/lib/provision";
const BUCKET = "syndic-channel-photos";
const types: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
function back(residence: string, text?: string, anchor?: string): never {
  revalidatePath("/discussion");
  redirect(`/discussion?r=${residence}` + (text ? "&message=" + encodeURIComponent(text) : "") + (anchor ? "#m-" + anchor : ""));
}
function residenceOf(form: FormData) {
  const r = z.uuid().safeParse(form.get("residence"));
  if (!r.success) redirect("/discussion");
  return r.data;
}
export async function postMessage(form: FormData) {
  const residence = residenceOf(form);
  const { db } = await signedIn();
  const parent = z.uuid().safeParse(form.get("parent"));
  const body = z.string().max(4000).safeParse(form.get("body") ?? "");
  if (!body.success) back(residence, "Message trop long (4000 caractères maximum).");
  const file = form.get("photo");
  let photo: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > 5 * 1024 * 1024 || !types[file.type]) back(residence, "Photo : PNG, JPG, WEBP ou GIF de 5 Mo maximum.");
    const { data: perms } = await db.rpc("syndic_channel_permissions", { target_residence: residence });
    if (!perms?.can_photo) back(residence, "Vous n’êtes pas autorisé à partager des photos.");
    photo = `${residence}/${randomUUID()}.${types[file.type]}`;
    let uploaded = false;
    try {
      const { error } = await provisionClient().storage.from(BUCKET).upload(photo, file, { contentType: file.type });
      uploaded = !error;
    } catch {}
    if (!uploaded) back(residence, "Envoi de la photo impossible.");
  }
  if (!body.data.trim() && !photo) back(residence, "Écrivez un message ou ajoutez une photo.");
  const { data: id, error } = await db.rpc("syndic_channel_post", {
    target_residence: residence,
    parent: parent.success ? parent.data : null,
    message_body: body.data,
    photo,
  });
  if (error) {
    if (photo) await provisionClient().storage.from(BUCKET).remove([photo]).catch(() => {});
    back(residence, "Message refusé : vous n’êtes peut-être pas autorisé à écrire, ou vous envoyez trop vite.");
  }
  back(residence, undefined, parent.success ? parent.data : (id as string));
}
export async function createPoll(form: FormData) {
  const residence = residenceOf(form);
  const { db } = await signedIn();
  const question = z.string().trim().min(3).max(300).safeParse(form.get("question"));
  const options = form.getAll("option").map((o) => String(o).trim()).filter(Boolean);
  if (!question.success || options.length < 2 || options.length > 6 || options.some((o) => o.length > 120))
    back(residence, "Un sondage demande une question et entre 2 et 6 réponses.");
  const { data: id, error } = await db.rpc("syndic_channel_create_poll", {
    target_residence: residence,
    poll_question: question.data,
    poll_options: options,
    allow_multiple: form.get("multiple") === "on",
  });
  if (error) back(residence, "Sondage refusé : vous n’êtes pas autorisé à lancer des sondages.");
  back(residence, undefined, id as string);
}
export async function vote(form: FormData) {
  const residence = residenceOf(form);
  const { db } = await signedIn();
  const poll = z.uuid().safeParse(form.get("poll"));
  const choices = form.getAll("choice").map(Number).filter((n) => Number.isInteger(n));
  if (!poll.success || !choices.length) back(residence, "Choisissez une réponse.");
  const { error } = await db.rpc("syndic_channel_vote", { target_poll: poll.data, choices });
  back(residence, error ? "Vote impossible : sondage clos." : undefined, String(form.get("message") ?? ""));
}
export async function closePoll(form: FormData) {
  const residence = residenceOf(form);
  const { db } = await signedIn();
  const poll = z.uuid().safeParse(form.get("poll"));
  if (!poll.success) back(residence);
  const { error } = await db.rpc("syndic_channel_close_poll", { target_poll: poll.data });
  back(residence, error ? "Action refusée." : "Sondage clôturé.", String(form.get("message") ?? ""));
}
export async function deleteMessage(form: FormData) {
  const residence = residenceOf(form);
  const { db } = await signedIn();
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) back(residence);
  const { data: photo, error } = await db.rpc("syndic_channel_delete", { target_message: id.data });
  if (!error && typeof photo === "string" && photo)
    await provisionClient().storage.from(BUCKET).remove([photo]).catch(() => {});
  back(residence, error ? "Suppression refusée." : "Message supprimé.");
}
