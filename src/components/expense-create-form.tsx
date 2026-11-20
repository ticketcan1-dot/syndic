"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip } from "lucide-react";
import { I18nText, translate, useLocale } from "@/components/i18n";
import { attachmentAccept } from "@/lib/attachments";
import { createExpenseReturningId } from "@/app/operations/attachment-actions";
import { uploadExpenseFiles } from "@/lib/upload-attachments";
// Expense creation form with attachments: the expense is created, then its files are uploaded.
export function ExpenseCreateForm({ children, back, submitLabel }: { children: React.ReactNode; back?: string; submitLabel: string }) {
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    data.delete("attachments");
    const created = await createExpenseReturningId(data);
    if (!("id" in created) || !created.id) {
      setBusy(false);
      setError(translate(created.error ?? "Dépense refusée.", locale));
      return;
    }
    const upload = files.length ? await uploadExpenseFiles(created.id, files) : { saved: 0 };
    const text = upload.error ? "Dépense créée, mais certaines pièces jointes n’ont pas pu être envoyées." : "Dépense ajoutée et répartie entre les appartements.";
    const base = back ? `${back}?tab=depenses&` : "/operations?view=expenses&";
    router.push(`${base}message=${encodeURIComponent(text)}&open=${created.id}#e-${created.id}`);
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="form">
      {children}
      <label className="attach-pick">
        <span>
          <Paperclip size={16} /> <I18nText text="Pièces jointes (facultatif)" />
        </span>
        <input type="file" name="attachments" multiple accept={attachmentAccept} onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 10))} />
        <span className="form-note">
          <I18nText text="Facture, devis, photo… PDF, images, Word ou Excel · 10 Mo maximum par fichier" />
        </span>
      </label>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <button className="button primary" disabled={busy} aria-busy={busy}>
        {busy && <span className="spinner light" aria-hidden="true" />}
        <I18nText text={busy ? "En cours…" : submitLabel} />
      </button>
    </form>
  );
}
