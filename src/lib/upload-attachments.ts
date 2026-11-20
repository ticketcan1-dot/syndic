"use client";
import { createBrowserClient } from "@supabase/ssr";
import { prepareExpenseUploads, registerExpenseUploads } from "@/app/operations/attachment-actions";
import { EXPENSE_BUCKET } from "@/lib/attachments";
// Sends files directly from the browser to private storage (no server size limit), then records them.
export async function uploadExpenseFiles(expenseId: string, files: File[]) {
  if (!files.length) return { saved: 0 };
  const meta = files.map((f) => ({ name: f.name, type: f.type || "application/octet-stream", size: f.size }));
  const prepared = await prepareExpenseUploads(expenseId, meta);
  if ("error" in prepared && prepared.error) return { saved: 0, error: prepared.error };
  const uploads = "uploads" in prepared ? prepared.uploads ?? [] : [];
  const storage = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!).storage.from(EXPENSE_BUCKET);
  const done: { path: string; name: string; type: string; size: number }[] = [];
  for (let i = 0; i < uploads.length; i++) {
    const { error } = await storage.uploadToSignedUrl(uploads[i].path, uploads[i].token, files[i], { contentType: meta[i].type });
    if (!error) done.push({ path: uploads[i].path, ...meta[i] });
  }
  const result = await registerExpenseUploads(expenseId, done);
  const saved = "saved" in result ? (result.saved ?? 0) : 0;
  return { saved, error: saved < files.length ? "Certains fichiers n’ont pas pu être envoyés." : undefined };
}
