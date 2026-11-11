import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { I18nText } from "@/components/i18n";
import { LocalizedInput } from "@/components/i18n-input";
import { Notice } from "@/components/notice";
import { Submit } from "@/components/submit";
import { ShareLink } from "@/components/share-link";
import { signedIn } from "@/lib/access";
import { intlLocale as getIntlLocale } from "@/lib/locale-server";
import { addApartment, inviteToApartment, addExpense, decideRequest, moderate } from "./actions";
export const dynamic = "force-dynamic";
type Person = { unit_id: string; user_id: string; residence_id: string; unit: string; email: string; name: string; phone: string; blocked: boolean; revoked: boolean };
type Request = { id: string; unit_id: string; residence_id: string; unit: string; email: string; name: string; phone: string };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; tab?: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const query = await searchParams;
  const tab = query.tab ?? "habitants";
  const intlLocale = await getIntlLocale();
  const { db } = await signedIn();
  const { data: residence } = await db.from("syndic_residences").select("id,name,address,city").eq("id", id).maybeSingle();
  if (!residence) notFound();
  const [units, links, expenses, peopleResult] = await Promise.all([
    db.from("syndic_units").select("id,label").eq("residence_id", id).order("label"),
    db.from("syndic_join_links").select("id,unit_id,expires_at,used_by,revoked_at").order("created_at", { ascending: false }),
    db.from("syndic_expense_entries").select("id,title,amount_cents,due_date,syndic_charge_entries(amount_cents,syndic_payment_entries(amount_cents))").eq("residence_id", id).order("due_date", { ascending: false }),
    db.rpc("syndic_manager_people"),
  ]);
  const unitList = units.data ?? [];
  const unitIds = new Set(unitList.map((u) => u.id));
  const people = (peopleResult.data ?? { residents: [], requests: [] }) as { residents: Person[]; requests: Request[] };
  const residents = people.residents.filter((p) => p.residence_id === id);
  const requests = people.requests.filter((p) => p.residence_id === id);
  const openLinks = (links.data ?? []).filter((l) => unitIds.has(l.unit_id) && !l.used_by && !l.revoked_at && new Date(l.expires_at) > new Date());
  const fmt = (c: number) => (c / 100).toLocaleString(intlLocale, { maximumFractionDigits: 2 }) + " DH";
  const tabs = [
    ["habitants", "Habitants"],
    ["appartements", "Appartements"],
    ["depenses", "Dépenses"],
  ];
  const hidden = <input type="hidden" name="residence_id" value={id} />;
  return (
    <>
      <div className="page-heading">
        <div>
          <Link href="/app/residences" className="text-link small">
            <I18nText text="← Mes immeubles" />
          </Link>
          <h1>{residence.name}</h1>
          <p>
            {residence.address} · {residence.city}
          </p>
        </div>
      </div>
      <Notice message={query.message} error={Boolean(units.error || expenses.error || peopleResult.error)} />
      <div className="stats">
        <div className="card"><p><I18nText text="Appartements" /></p><div className="stat-number">{unitList.length}</div></div>
        <div className="card"><p><I18nText text="Habitants" /></p><div className="stat-number">{residents.filter((r) => !r.revoked).length}</div></div>
        <div className="card"><p><I18nText text="Demandes en attente" /></p><div className="stat-number">{requests.length}</div></div>
      </div>
      <nav className="residence-tabs" style={{ margin: "20px 0" }}>
        {tabs.map(([key, label]) => (
          <Link key={key} href={`/app/residences/${id}?tab=${key}`} className={tab === key ? "selected" : ""} aria-current={tab === key ? "page" : undefined}>
            <I18nText text={label} />
          </Link>
        ))}
      </nav>
      {tab === "habitants" && (
        <>
          <section className="card" style={{ marginBottom: 20 }}>
            <h2><I18nText text="Inviter un habitant par lien" /></h2>
            {unitList.length ? (
              <form action={inviteToApartment} className="form">
                {hidden}
                <label>
                  <I18nText text="Appartement" />
                  <select name="unit_id">
                    {unitList.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
                  </select>
                </label>
                <Submit><I18nText text="Créer un lien d’invitation" /></Submit>
              </form>
            ) : (
              <p><Link className="text-link" href={`/app/residences/${id}?tab=appartements`}><I18nText text="Ajoutez d’abord un appartement." /></Link></p>
            )}
            {openLinks.map((l) => (
              <div key={l.id} className="list-row">
                <strong>{unitList.find((u) => u.id === l.unit_id)?.label}</strong>
                <ShareLink url={`${process.env.NEXT_PUBLIC_SITE_URL}/rejoindre/${l.id}`} />
              </div>
            ))}
          </section>
          <section className="card" style={{ marginBottom: 20 }}>
            <h2><I18nText text="Demandes d’adhésion" /></h2>
            {!requests.length && <p><I18nText text="Aucune demande en attente." /></p>}
            {requests.map((r) => (
              <article key={r.id} className="list-row">
                <div>
                  <strong>{r.name || r.email}</strong>
                  <p className="small">{r.email} {r.phone ? "· " + r.phone : ""} · {r.unit}</p>
                </div>
                <div className="row-actions">
                  {(["approve", "reject"] as const).map((d) => (
                    <form key={d} action={decideRequest}>
                      {hidden}
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="decision" value={d} />
                      <Submit><I18nText text={d === "approve" ? "Approuver" : "Refuser"} /></Submit>
                    </form>
                  ))}
                </div>
              </article>
            ))}
          </section>
          <section className="card">
            <h2><I18nText text="Habitants de l’immeuble" /></h2>
            {!residents.length && <p><I18nText text="Aucun habitant pour le moment." /></p>}
            {residents.map((r) => (
              <article key={r.unit_id + r.user_id} className="list-row">
                <div>
                  <strong>{r.name || r.email}</strong>
                  <p className="small">{r.email} {r.phone ? "· " + r.phone : ""}</p>
                  <p className="small">
                    {r.unit} ·{" "}
                    <span className={"status-pill " + (r.blocked || r.revoked ? "danger" : "ok")}>
                      <I18nText text={r.blocked ? "Bloqué" : r.revoked ? "Révoqué" : "Actif"} />
                    </span>
                  </p>
                </div>
                <div className="row-actions">
                  {(r.blocked || !r.revoked) && (
                    <form action={moderate}>
                      {hidden}
                      <input type="hidden" name="unit" value={r.unit_id} />
                      <input type="hidden" name="user" value={r.user_id} />
                      <input type="hidden" name="task" value={r.blocked ? "unblock" : "block"} />
                      <Submit><I18nText text={r.blocked ? "Débloquer" : "Bloquer"} /></Submit>
                    </form>
                  )}
                  <form action={moderate}>
                    {hidden}
                    <input type="hidden" name="unit" value={r.unit_id} />
                    <input type="hidden" name="user" value={r.user_id} />
                    <input type="hidden" name="task" value="remove" />
                    <Submit><I18nText text="Supprimer" /></Submit>
                  </form>
                </div>
              </article>
            ))}
          </section>
        </>
      )}
      {tab === "appartements" && (
        <div className="split">
          <section className="card">
            <h2><I18nText text="Appartements" /></h2>
            {!unitList.length && <p><I18nText text="Aucun appartement pour le moment." /></p>}
            {unitList.map((u) => {
              const count = residents.filter((r) => r.unit_id === u.id && !r.revoked).length;
              return (
                <div key={u.id} className="list-row">
                  <strong>{u.label}</strong>
                  <span className="small">{count} <I18nText text="habitant(s)" /></span>
                </div>
              );
            })}
          </section>
          <section className="card">
            <h2><I18nText text="Ajouter un appartement" /></h2>
            <form action={addApartment} className="form">
              {hidden}
              <label>
                <I18nText text="Appartement" />
                <LocalizedInput name="label" placeholder="A-101" maxLength={60} required />
              </label>
              <Submit><I18nText text="Ajouter l’appartement" /></Submit>
            </form>
          </section>
        </div>
      )}
      {tab === "depenses" && (
        <div className="split">
          <section className="card">
            <h2><I18nText text="Dépenses de l’immeuble" /></h2>
            {!expenses.data?.length && <p><I18nText text="Aucune dépense enregistrée." /></p>}
            {expenses.data?.map((e) => {
              const charges = (e.syndic_charge_entries ?? []) as { amount_cents: number; syndic_payment_entries: { amount_cents: number }[] }[];
              const paid = charges.reduce((sum, c) => sum + (c.syndic_payment_entries ?? []).reduce((s, p) => s + p.amount_cents, 0), 0);
              return (
                <div key={e.id} className="list-row">
                  <div>
                    <strong>{e.title}</strong>
                    <p className="small">
                      <I18nText text="Échéance" /> {new Date(e.due_date).toLocaleDateString(intlLocale)} · {charges.length} <I18nText text="appartement(s)" />
                    </p>
                  </div>
                  <div style={{ textAlign: "end" }}>
                    <strong>{fmt(e.amount_cents)}</strong>
                    <p className="small"><I18nText text="Réglé" /> : {fmt(paid)}</p>
                  </div>
                </div>
              );
            })}
            <Link className="text-link small" href="/operations?view=expenses"><I18nText text="Enregistrer les règlements" /></Link>
          </section>
          <section className="card">
            <h2><I18nText text="Ajouter une dépense" /></h2>
            {unitList.length ? (
              <form action={addExpense} className="form">
                {hidden}
                <label><I18nText text="Titre" /><LocalizedInput name="title" minLength={3} maxLength={160} required placeholder="Nettoyage des escaliers" /></label>
                <label><I18nText text="Montant total (DH)" /><LocalizedInput name="amount" inputMode="decimal" pattern="\d+(\.\d{1,2})?" required /></label>
                <label><I18nText text="Échéance" /><LocalizedInput name="date" type="date" required /></label>
                <fieldset className="plan-choice">
                  <legend><I18nText text="Répartir entre" /></legend>
                  {unitList.map((u) => (
                    <label key={u.id}><input type="checkbox" name="units" value={u.id} defaultChecked /> {u.label}</label>
                  ))}
                </fieldset>
                <Submit><I18nText text="Ajouter la dépense" /></Submit>
              </form>
            ) : (
              <p><I18nText text="Ajoutez d’abord un appartement." /></p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
