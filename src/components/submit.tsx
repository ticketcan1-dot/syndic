"use client";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { I18nText } from "@/components/i18n";
// Submit button: shows a spinner and is disabled while the form is being sent.
export function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <span className="spinner light" aria-hidden="true" />
          <I18nText text="En cours…" />
        </>
      ) : (
        children
      )}
    </Button>
  );
}
// Same behaviour for buttons with a custom style (outline, danger…).
export function PendingButton({ className, children }: { className: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} aria-busy={pending}>
      {pending ? <span className="spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
