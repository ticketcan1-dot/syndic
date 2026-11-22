import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase/server", () => ({ supabase: async () => ({ auth: {} }) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(url); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, delete: () => {} }) }));
import { signUp } from "../src/app/actions";
const token = "9d9a6143-7ddf-4d19-bd13-ac2b0734e930";
function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
}
describe("sign-up from an invitation link", () => {
  it("keeps the invitation link when the form has to be corrected", async () => {
    const error = await signUp(
      form({ next: `/rejoindre/${token}`, first_name: "Ayoub", last_name: "Test", phone: "0612345678", email: "a@b.com", password: "court", confirmation: "court" }),
    ).catch((e: Error) => e.message);
    const url = new URL(String(error), "https://x.test");
    expect(url.pathname).toBe("/inscription");
    expect(url.searchParams.get("next")).toBe(`/rejoindre/${token}`);
    expect(url.searchParams.get("message")).toBe("Le mot de passe doit contenir au moins 12 caractères.");
  });
});
describe("sign-up form checks", () => {
  it("lists every invalid field at once and keeps the typed values", async () => {
    const { signUpAction } = await import("../src/app/actions");
    const state = await signUpAction(
      null,
      form({ first_name: "A", last_name: "Benali", phone: "06 12 34", email: "pas-un-email", password: "court", confirmation: "court" }),
    );
    expect(Object.keys(state!.errors).sort()).toEqual(["email", "first_name", "password", "phone"]);
    expect(state!.values.last_name).toBe("Benali");
    expect(state!.values.password).toBe("");
  });
  it("accepts a 10-digit phone written with spaces and rejects 9 or 11 digits", async () => {
    const { normalizePhone } = await import("../src/lib/validation");
    expect(normalizePhone("06 12 34 56 78")).toBe("0612345678");
    expect(normalizePhone("061234567")).toBeNull();
    expect(normalizePhone("06123456789")).toBeNull();
  });
});
