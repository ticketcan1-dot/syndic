"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip } from "lucide-react";
import { I18nText, translate, useLocale } from "@/components/i18n";
import { attachmentAccept } from "@/lib/attachments";
import { uploadExpenseFiles } from "@/lib/upload-attachments";
export function AttachmentUploader({ expenseId, back }: { expenseId: string; back?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function send(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setMessage("");
    const result = await uploadExpenseFiles(expenseId, Array.from(files));
    setBusy(false);
    if (input.current) input.current.value = "";
    if (result.error) setMessage(translate(result.error, locale));
    const base = back ? `${back}?tab=depenses&` : "/operations?view=expenses&";
    router.push(`${base}open=${expenseId}#e-${expenseId}`);
    router.refresh();
  }
  return (
    <div className="attach-upload">
      <label className={"button outline" + (busy ? " busy" : "")} aria-busy={busy}>
        {busy ? <span className="spinner" aria-hidden="true" /> : <Paperclip size={16} />}
        <I18nText text={busy ? "Envoi en cours…" : "Ajouter une pièce jointe"} />
        <input ref={input} type="file" multiple accept={attachmentAccept} disabled={busy} onChange={(e) => send(e.target.files)} hidden />
      </label>
      <span className="small">
        <I18nText text="PDF, photos, Word ou Excel · 10 Mo maximum par fichier" />
      </span>
      {message && (
        <p className="small" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
