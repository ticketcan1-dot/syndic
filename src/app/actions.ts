"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase/server";
import {
  credentials,
  organizationSchema,
  residenceSchema,
  unitSchema,
} from "@/lib/validation";
function message(path: string, text: string): never {
  redirect(`${path}?message=${encodeURIComponent(text)}`);
}
export async function signIn(form: FormData) {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  if (!email || !password)
    message("/connexion", "Renseignez votre e-mail et votre mot de passe.");
  const db = await supabase();
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error)
    message(
      "/connexion",
      "Connexion impossible. Vérifiez vos identifiants et la confirmation de votre adresse.",
    );
  redirect("/app");
}
export async function signUp(form: FormData) {
  const parsed = credentials.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    message(
      "/inscription",
      "Adresse valide et mot de passe de 12 caractères minimum requis.",
    );
  const db = await supabase();
  const { error } = await db.auth.signUp({
    ...parsed.data,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });
  if (error)
    message(
      "/inscription",
      "Inscription indisponible. Réessayez plus tard ou contactez le gestionnaire.",
    );
  message(
    "/connexion",
    "Consultez votre e-mail pour confirmer votre inscription.",
  );
}
export async function signOut() {
  const db = await supabase();
  await db.auth.signOut();
  redirect("/connexion");
}
export async function resetPassword(form: FormData) {
  const email = String(form.get("email") ?? "");
  if (!email.includes("@")) message("/connexion", "Indiquez votre e-mail.");
  const db = await supabase();
  await db.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/app/mot-de-passe`,
  });
  message(
    "/connexion",
    "Si ce compte existe, un lien de réinitialisation sera envoyé.",
  );
}
export async function updatePassword(form: FormData) {
  const password = String(form.get("password") ?? "");
  if (password.length < 12 || password.length > 128)
    message("/app/mot-de-passe", "Choisissez entre 12 et 128 caractères.");
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/connexion");
  const { error } = await db.auth.updateUser({ password });
  if (error)
    message(
      "/app/mot-de-passe",
      "Impossible de modifier le mot de passe. Recommencez la réinitialisation.",
    );
  message("/app", "Mot de passe mis à jour.");
}
async function authenticated() {
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/connexion");
  return { db, user };
}
export async function createOrganization(form: FormData) {
  const parsed = organizationSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    message("/app", "Le nom doit contenir entre 2 et 120 caractères.");
  const { db } = await authenticated();
  const { error } = await db.rpc("syndic_create_organization", {
    organization_name: parsed.data.name,
  });
  if (error)
    message(
      "/app",
      "Création impossible. Vérifiez que la migration SyndiConnect est installée.",
    );
  revalidatePath("/app");
  message("/app", "Organisation créée. Ajoutez votre première résidence.");
}
export async function createResidence(form: FormData) {
  const parsed = residenceSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    message(
      "/app/residences",
      "Vérifiez le nom, la ville, l’adresse et l’organisation.",
    );
  const { db } = await authenticated();
  const { error } = await db.from("syndic_residences").insert(parsed.data);
  if (error)
    message(
      "/app/residences",
      "Création refusée. Vérifiez vos droits sur cette organisation.",
    );
  revalidatePath("/app");
  message("/app/residences", "Résidence créée.");
}
export async function createUnit(form: FormData) {
  const parsed = unitSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    message(
      "/app/lots",
      "Vérifiez la résidence, le libellé et la quote-part positive.",
    );
  const { db } = await authenticated();
  const { error } = await db.from("syndic_units").insert(parsed.data);
  if (error)
    message(
      "/app/lots",
      "Création refusée : droits insuffisants ou libellé déjà utilisé dans cette résidence.",
    );
  revalidatePath("/app");
  message("/app/lots", "Lot créé.");
}
