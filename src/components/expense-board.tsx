import { CalendarDays, Check, Clock3 } from "lucide-react";
import { I18nText } from "@/components/i18n";
import { LocalizedInput } from "@/components/i18n-input";
import { PendingButton, Submit } from "@/components/submit";
import type { Expense, Share } from "@/lib/expenses";
import { claimPayment, decideClaim, recordPayment, remindUnpaid } from "@/app/operations/expense-actions";
import { ShareChips, type ChipShare } from "@/components/share-chips";
import { ShareLabelToggle } from "@/components/share-label-toggle";
const methods: Record<string, string> = {
  virement: "Virement",
  especes: "Espèces",
  cheque: "Chèque",
  autre: "Autre",
};
function shareState(s: Share) {
  if (s.paid >= s.amount) return "paid";
  if (s.claims.some((c) => c.status === "pending")) return "claimed";
  if (s.paid > 0) return "partial";
  return "due";
}
export function ExpenseBoard({
  expenses,
  locale,
  back,
  labelMode = "unit",
  openId,
}: {
  expenses: Expense[];
  locale: string;
  back?: string;
  labelMode?: "unit" | "name";
  openId?: string;
}) {
  const mad = (cents: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: "MAD", maximumFractionDigits: 2 }).format(cents / 100);
  const today = new Date().toISOString().slice(0, 10);
  const monthName = (key: string) => {
    const label = new Date(key + "-01T12:00:00").toLocaleDateString(locale, { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };
  // Expenses grouped by month of their due date (most recent first).
  const months: { key: string; items: Expense[] }[] = [];
  for (const e of expenses) {
    const key = e.due_date.slice(0, 7);
    const group = months.find((m) => m.key === key);
    if (group) group.items.push(e);
    else months.push({ key, items: [e] });
  }
  months.sort((a, b) => b.key.localeCompare(a.key));
  if (!expenses.length)
    return (
      <p className="empty">
        <I18nText text="Aucune dépense pour le moment." />
      </p>
    );
  return (
    <div className="expense-list">
      {expenses.some((e) => e.can_manage) && <ShareLabelToggle mode={labelMode} />}
      {months.map((month, monthIndex) => {
        const monthTotal = month.items.reduce((s, e) => s + e.shares.reduce((t, x) => t + x.amount, 0), 0);
        const monthPaid = month.items.reduce((s, e) => s + e.shares.reduce((t, x) => t + Math.min(x.paid, x.amount), 0), 0);
        const toConfirm = month.items.reduce((s, e) => s + e.shares.reduce((t, x) => t + x.claims.filter((c) => c.status === "pending").length, 0), 0);
        return (
          <details key={month.key} className="expense-month" open={monthIndex === 0 || month.items.some((e) => e.id === openId)}>
            <summary>
              <span className="month-name">{monthName(month.key)}</span>
              <span className="month-meta">
                {month.items.length} <I18nText text="dépense(s)" /> · {mad(monthPaid)} / {mad(monthTotal)}
                {toConfirm > 0 && (
                  <span className="status-pill warn">
                    {toConfirm} <I18nText text="à confirmer" />
                  </span>
                )}
              </span>
            </summary>
            <div className="expense-month-list">
      {month.items.map((e) => {
        const backField = (
          <>
            {back && <input type="hidden" name="back" value={back} />}
            <input type="hidden" name="expense" value={e.id} />
          </>
        );
        const paid = e.shares.reduce((s, x) => s + Math.min(x.paid, x.amount), 0);
        const total = e.shares.reduce((s, x) => s + x.amount, 0);
        const percent = total ? Math.round((paid / total) * 100) : 0;
        const pendingClaims = e.shares.flatMap((s) => s.claims.filter((c) => c.status === "pending").map((c) => ({ ...c, unit: s.unit })));
        const unpaid = e.shares.filter((s) => s.paid < s.amount);
        const overdue = e.due_date < today && unpaid.length > 0;
        return (
          <details key={e.id} id={"e-" + e.id} className="expense-card" open={openId === e.id}>
            <summary className="expense-summary">
            <header className="expense-head">
              <div>
                <h3>{e.title}</h3>
                <p className="small">
                  {e.residence && <>{e.residence} · </>}
                  <CalendarDays size={13} /> <I18nText text="Échéance" /> {new Date(e.due_date).toLocaleDateString(locale)}
                  {overdue && (
                    <span className="status-pill danger" style={{ marginInlineStart: 8 }}>
                      <I18nText text="En retard" />
                    </span>
                  )}
                </p>
              </div>
              <div className="expense-total">
                <strong>{mad(total)}</strong>
                {!e.can_manage && (
                  <span className="small">
                    <I18nText text="Ma part sur" /> {mad(e.amount)}
                  </span>
                )}
                <span className="small">
                  {mad(paid)} <I18nText text="réglés" />
                </span>
              </div>
            </header>
            <div className="expense-progress" aria-label={`${percent}%`}>
              <span style={{ width: `${percent}%` }} />
            </div>
            <div className="expense-peek small">
              <span>
                {e.shares.filter((x) => x.paid >= x.amount).length}/{e.shares.length} <I18nText text="réglé(s)" />
              </span>
              {pendingClaims.length > 0 && (
                <span className="status-pill warn">
                  {pendingClaims.length} <I18nText text="à confirmer" />
                </span>
              )}
              <span className="expense-toggle" aria-hidden="true" />
            </div>
            </summary>
            <ShareChips
              canManage={e.can_manage}
              action={recordPayment}
              back={back}
              expenseId={e.id}
              today={today}
              shares={e.shares.map((x) => {
                const byName = e.can_manage && labelMode === "name" && x.names.length > 0;
                return {
                  charge_id: x.charge_id,
                  label: byName ? x.names.join(", ") : x.unit,
                  sublabel: byName ? x.unit : "",
                  state: shareState(x) as ChipShare["state"],
                  amountText: mad(x.amount),
                  remainingText: mad(Math.max(x.amount - x.paid, 0)),
                  remaining: Math.max(x.amount - x.paid, 0),
                };
              })}
            />

            {/* Resident: pay my share */}
            {!e.can_manage &&
              e.shares.map((s) => {
                const remaining = s.amount - s.paid;
                const pending = s.claims.find((c) => c.status === "pending");
                const refused = s.claims.find((c) => c.status === "rejected");
                return (
                  <div key={s.charge_id} className="expense-mine">
                    {pending ? (
                      <p className="notice">
                        <Clock3 size={15} /> <I18nText text="Règlement envoyé le" /> {new Date(pending.paid_on).toLocaleDateString(locale)} ({mad(pending.amount_cents)}) —{" "}
                        <I18nText text="en attente de confirmation par votre syndic." />
                      </p>
                    ) : remaining > 0 ? (
                      <details className="expense-pay">
                        <summary className="button primary">
                          <I18nText text="Régler ma part" /> · {mad(remaining)}
                        </summary>
                        {refused?.decision_note && (
                          <p className="small">
                            <I18nText text="Dernier règlement refusé :" /> {refused.decision_note}
                          </p>
                        )}
                        <form action={claimPayment} className="form">
                          {backField}
                          <input type="hidden" name="charge" value={s.charge_id} />
                          <label>
                            <I18nText text="Montant payé (MAD)" />
                            <LocalizedInput name="amount" inputMode="decimal" defaultValue={(remaining / 100).toFixed(2)} required />
                          </label>
                          <label>
                            <I18nText text="Date du paiement" />
                            <LocalizedInput name="date" type="date" max={today} defaultValue={today} required />
                          </label>
                          <label>
                            <I18nText text="Mode de paiement" />
                            <select name="method" defaultValue="virement">
                              {Object.entries(methods).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <I18nText text="Référence (facultatif)" />
                            <LocalizedInput name="reference" maxLength={160} placeholder="N° de virement, reçu…" />
                          </label>
                          <label>
                            <I18nText text="Message pour le syndic (facultatif)" />
                            <LocalizedInput name="note" maxLength={500} />
                          </label>
                          <Submit>
                            <I18nText text="Envoyer le règlement" />
                          </Submit>
                        </form>
                      </details>
                    ) : (
                      <p className="small expense-done">
                        <Check size={15} /> <I18nText text="Votre part est réglée." />
                      </p>
                    )}
                  </div>
                );
              })}

            {/* Syndic: confirm declared payments, record a payment, remind */}
            {e.can_manage && pendingClaims.length > 0 && (
              <div className="expense-claims">
                <strong>
                  <I18nText text="Règlements à confirmer" /> ({pendingClaims.length})
                </strong>
                {pendingClaims.map((c) => (
                  <div key={c.id} className="claim-row">
                    <div>
                      <strong>{c.unit}</strong> · {mad(c.amount_cents)} · <I18nText text={methods[c.method] ?? c.method} /> ·{" "}
                      {new Date(c.paid_on).toLocaleDateString(locale)}
                      {c.reference && <> · {c.reference}</>}
                      {c.note && <p className="small">« {c.note} »</p>}
                    </div>
                    <div className="row-actions">
                      <form action={decideClaim}>
                        {backField}
                        <input type="hidden" name="claim" value={c.id} />
                        <input type="hidden" name="decision" value="approve" />
                        <Submit>
                          <I18nText text="Confirmer" />
                        </Submit>
                      </form>
                      <form action={decideClaim} className="row-actions">
                        {backField}
                        <input type="hidden" name="claim" value={c.id} />
                        <input type="hidden" name="decision" value="reject" />
                        <LocalizedInput name="reason" maxLength={500} placeholder="Motif (facultatif)" />
                        <PendingButton className="button outline logout">
                          <I18nText text="Refuser" />
                        </PendingButton>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {e.can_manage && unpaid.length > 0 && (
              <div className="expense-tools">
                <form action={remindUnpaid}>
                  {backField}
                  {unpaid.map((s) => (
                    <input key={s.charge_id} type="hidden" name="charge" value={s.charge_id} />
                  ))}
                  <PendingButton className="button outline">
                    <I18nText text="Relancer les impayés" /> ({unpaid.length})
                  </PendingButton>
                </form>
              </div>
            )}
          </details>
        );
      })}
            </div>
          </details>
        );
      })}
    </div>
  );
}
