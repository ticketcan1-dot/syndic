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
