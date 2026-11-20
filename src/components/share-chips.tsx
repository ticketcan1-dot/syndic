"use client";
import { useState } from "react";
import { Check, CircleAlert, Clock3, Wallet, X } from "lucide-react";
import { I18nText, translate, useLocale } from "@/components/i18n";
import { Submit } from "@/components/submit";
export type ChipShare = {
  charge_id: string;
  label: string;
  sublabel: string;
  state: "paid" | "claimed" | "partial" | "due";
  amountText: string;
  remainingText: string;
  remaining: number;
};
const stateLabels: Record<string, string> = { paid: "Réglé", claimed: "À confirmer", partial: "Reste", due: "À régler" };
// One chip per apartment/person. For the syndic, a click opens the payment form for that share.
export function ShareChips({
  shares,
  canManage,
  action,
  back,
  today,
  expenseId,
}: {
  shares: ChipShare[];
  canManage: boolean;
  action: (form: FormData) => Promise<void>;
  back?: string;
  today: string;
  expenseId?: string;
}) {
  const locale = useLocale();
  const [open, setOpen] = useState<string | null>(null);
  const selected = shares.find((s) => s.charge_id === open);
  return (
    <>
      <div className="expense-shares">
        {shares.map((s) => {
          const clickable = canManage && s.remaining > 0;
          const Icon = s.state === "paid" ? Check : s.state === "claimed" ? Clock3 : s.state === "partial" ? Wallet : CircleAlert;
          const content = (
            <>
              <Icon size={13} />
              <strong>{s.label}</strong>
              {s.sublabel && <span className="chip-sub">{s.sublabel}</span>}
              <span>{s.state === "partial" ? s.remainingText : s.amountText}</span>
              <em>
                <I18nText text={stateLabels[s.state]} />
              </em>
            </>
          );
          return clickable ? (
            <button
              key={s.charge_id}
              type="button"
              className={"share-chip clickable " + s.state + (open === s.charge_id ? " active" : "")}
              onClick={() => setOpen(open === s.charge_id ? null : s.charge_id)}
              aria-expanded={open === s.charge_id}
              title={translate("Enregistrer un règlement", locale)}
            >
              {content}
            </button>
          ) : (
            <span key={s.charge_id} className={"share-chip " + s.state}>
              {content}
            </span>
          );
        })}
      </div>
      {canManage && shares.some((s) => s.remaining > 0) && !selected && (
        <p className="small chip-hint">
          <I18nText text="Cliquez sur un appartement pour enregistrer son règlement." />
        </p>
      )}
      {selected && (
        <form action={action} className="chip-pay" key={selected.charge_id}>
          {back && <input type="hidden" name="back" value={back} />}
          {expenseId && <input type="hidden" name="expense" value={expenseId} />}
          <input type="hidden" name="charge" value={selected.charge_id} />
          <div className="chip-pay-head">
            <strong>
              <I18nText text="Règlement de" /> {selected.label}
              {selected.sublabel && <> · {selected.sublabel}</>}
            </strong>
            <button type="button" className="icon-ghost" onClick={() => setOpen(null)} aria-label={translate("Fermer", locale)}>
              <X size={16} />
            </button>
          </div>
          <p className="small">
            <I18nText text="Reste à payer :" /> <strong>{selected.remainingText}</strong>
          </p>
          <div className="chip-pay-fields">
            <label>
              <I18nText text="Montant reçu (MAD)" />
              <input name="amount" inputMode="decimal" defaultValue={(selected.remaining / 100).toFixed(2)} required />
            </label>
            <label>
              <I18nText text="Date de réception" />
              <input name="date" type="date" max={today} defaultValue={today} required />
            </label>
            <label>
              <I18nText text="Référence (facultatif)" />
              <input name="reference" maxLength={160} placeholder={translate("Espèces, n° de virement…", locale)} />
            </label>
          </div>
          <Submit>
            <I18nText text="Enregistrer le règlement" />
          </Submit>
        </form>
      )}
    </>
  );
}
