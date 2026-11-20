import type { SupabaseClient } from "@supabase/supabase-js";
export type Claim = {
  id: string;
  amount_cents: number;
  paid_on: string;
  method: string;
  reference: string;
  note: string;
  status: string;
  decision_note: string;
  created_at: string;
};
export type Share = {
  charge_id: string;
  unit: string;
  amount: number;
  paid: number;
  claims: Claim[];
};
export type Expense = {
  id: string;
  title: string;
  due_date: string;
  amount: number;
  residence: string;
  residence_id: string;
  can_manage: boolean;
  shares: Share[];
};
type Context = {
  units: { id: string; label: string; residence: string; residence_id: string; can_manage: boolean }[];
};
// Expenses grouped with their shares (one per apartment), payments and declared payments.
export async function loadExpenses(db: SupabaseClient, residenceId?: string) {
  let expenseQuery = db.from("syndic_expense_entries").select("id,title,due_date,amount_cents,residence_id").order("due_date", { ascending: false });
  if (residenceId) expenseQuery = expenseQuery.eq("residence_id", residenceId);
  const [context, expenses, charges, payments, claims] = await Promise.all([
    db.rpc("syndic_operations_context"),
    expenseQuery,
    db.from("syndic_charge_entries").select("id,expense_id,unit_id,amount_cents"),
    db.from("syndic_payment_entries").select("charge_id,amount_cents"),
    db.from("syndic_payment_claims").select("id,charge_id,amount_cents,paid_on,method,reference,note,status,decision_note,created_at").order("created_at", { ascending: false }),
  ]);
  const units = ((context.data ?? { units: [] }) as Context).units;
  const list: Expense[] = (expenses.data ?? []).map((e) => {
    const firstUnit = units.find((u) => u.residence_id === e.residence_id);
    const shares = (charges.data ?? [])
      .filter((c) => c.expense_id === e.id)
      .map((c) => ({
        charge_id: c.id,
        unit: units.find((u) => u.id === c.unit_id)?.label ?? "—",
        amount: Number(c.amount_cents),
        paid: (payments.data ?? []).filter((p) => p.charge_id === c.id).reduce((s, p) => s + Number(p.amount_cents), 0),
        claims: (claims.data ?? []).filter((k) => k.charge_id === c.id).map((k) => ({ ...k, amount_cents: Number(k.amount_cents) })) as Claim[],
      }))
      .sort((a, b) => a.unit.localeCompare(b.unit, "fr", { numeric: true }));
    return {
      id: e.id,
      title: e.title,
      due_date: e.due_date,
      amount: Number(e.amount_cents),
      residence: firstUnit?.residence ?? "",
      residence_id: e.residence_id,
      can_manage: Boolean(firstUnit?.can_manage),
      shares,
    };
  });
  return {
    expenses: list.filter((e) => e.shares.length > 0),
    error: Boolean(context.error || expenses.error || charges.error || payments.error || claims.error),
  };
}
