import { z } from "zod";
export const credentials = z.object({
  email: z.email(),
  password: z.string().min(12).max(128),
});
export const organizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
});
export const residenceSchema = z.object({
  organization_id: z.uuid(),
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().min(4).max(300),
  city: z.string().trim().min(2).max(80),
});
export const unitSchema = z.object({
  residence_id: z.uuid(),
  label: z.string().trim().min(1).max(60),
  kind: z.enum(["apartment", "shop", "parking"]),
  share: z.coerce.number().positive().max(1000000),
});
export const signUpSchema = z.object({
  first_name: z.string().trim().min(2).max(80),
  last_name: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .transform((v) => v.replace(/[\s.()-]/g, ""))
    .pipe(z.string().regex(/^\d{10}$/)),
  email: z.email(),
  password: z.string().min(12).max(128),
  organization: z.string().trim().min(1).max(120),
  plan: z.enum(["essai", "standard", "entreprise"]),
});
// Exactly 10 digits (spaces, dots and dashes are ignored), e.g. 0612345678.
export function normalizePhone(value: string) {
  const digits = value.replace(/[\s.()-]/g, "");
  return /^\d{10}$/.test(digits) ? digits : null;
}
export const signUpMessages: Record<string, string> = {
  first_name: "Prénom : 2 caractères minimum.",
  last_name: "Nom : 2 caractères minimum.",
  phone: "Le numéro de téléphone doit contenir exactement 10 chiffres (exemple : 0612345678).",
  email: "Adresse e-mail invalide.",
  password: "Le mot de passe doit contenir au moins 12 caractères.",
  confirmation: "Les deux mots de passe ne correspondent pas.",
  organization: "Nom du syndic : 2 caractères minimum.",
};
// All the problems of the sign-up form at once (field name -> message).
export function signUpErrors(values: Record<string, string>, isSyndic: boolean) {
  const errors: Record<string, string> = {};
  if (values.first_name.trim().length < 2 || values.first_name.trim().length > 80) errors.first_name = signUpMessages.first_name;
  if (values.last_name.trim().length < 2 || values.last_name.trim().length > 80) errors.last_name = signUpMessages.last_name;
  if (!normalizePhone(values.phone)) errors.phone = signUpMessages.phone;
  if (!z.email().safeParse(values.email.trim()).success) errors.email = signUpMessages.email;
  if (values.password.length < 12 || values.password.length > 128) errors.password = signUpMessages.password;
  else if (values.password !== values.confirmation) errors.confirmation = signUpMessages.confirmation;
  if (isSyndic && (values.organization.trim().length < 2 || values.organization.trim().length > 120)) errors.organization = signUpMessages.organization;
  return errors;
}
