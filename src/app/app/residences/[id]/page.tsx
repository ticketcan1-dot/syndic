import Link from "next/link";
import { siteUrl } from "@/lib/site-url";
import { ExpenseBoard } from "@/components/expense-board";
import { loadExpenses } from "@/lib/expenses";
import { cookies } from "next/headers";
import { SelectAll } from "@/components/select-all";
import { ShareLabelToggle } from "@/components/share-label-toggle";
import { notFound } from "next/navigation";
import { z } from "zod";
import { I18nText } from "@/components/i18n";
import { LocalizedInput } from "@/components/i18n-input";
import { Notice } from "@/components/notice";
import { Submit } from "@/components/submit";
import { ShareLink } from "@/components/share-link";
import { signedIn } from "@/lib/access";
import { intlLocale as getIntlLocale } from "@/lib/locale-server";
import { addApartment, addExpense, createResidenceLink, revokeResidenceLink, decideMember, updateMember, moderateMember, setPermissions } from "./actions";
export const dynamic = "force-dynamic";
type Member = { user_id: string; email: string; status: string; name: string; phone: string; requested_apartment: string; blocked: boolean; apartments: string[]; can_post?: boolean; can_photo?: boolean; can_poll?: boolean };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; tab?: string; open?: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const query = await searchParams;
  const labelMode = (await cookies()).get("syndic_share_label")?.value === "name" ? "name" : "unit";
  const tab = query.tab ?? "habitants";
  const intlLocale = await getIntlLocale();
  const { db } = await signedIn();
  const site = await siteUrl();
  const [{ data: residence }, units, links, peopleResult, board] = await Promise.all([
    db.from("syndic_residences").select("id,name,address,city").eq("id", id).maybeSingle(),
    db.from("syndic_units").select("id,label").eq("residence_id", id).order("label"),
    db.from("syndic_residence_links").select("id,expires_at,revoked_at").eq("residence_id", id).is("revoked_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }),
    db.rpc("syndic_residence_people", { target_residence: id }),
    loadExpenses(db, id),
  ]);
  if (!residence) notFound();
  const unitList = units.data ?? [];
  const people = (peopleResult.data ?? []) as Member[];
  const residents = people.filter((p) => p.status === "approved");
  const requests = people.filter((p) => p.status === "pending");
  const openLinks = links.data ?? [];
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
          <Link href={`/discussion?r=${id}`} className="button outline" style={{ marginTop: 8 }}><I18nText text="Ouvrir la discussion" /></Link>
          <p>
            {residence.address} · {residence.city}
          </p>
        </div>
      </div>
      <Notice message={query.message} error={Boolean(units.error || board.error || peopleResult.error)} />
      <div className="stats">
        <div className="card"><p><I18nText text="Appartements" /></p><div className="stat-number">{unitList.length}</div></div>
        <div className="card"><p><I18nText text="Habitants" /></p><div className="stat-number">{residents.filter((r) => !r.blocked).length}</div></div>
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
            <h2><I18nText text="Lien d’invitation de la résidence" /></h2>
            <p className="small"><I18nText text="Un seul lien pour toute la résidence. Chaque habitant crée son compte (e-mail, mot de passe, nom, appartement facultatif), puis vous approuvez sa demande." /></p>
            {openLinks.map((l) => (
              <div key={l.id} className="share-block">
                <ShareLink url={`${site}/rejoindre/${l.id}`} residence={residence.name} />
                <div className="share-footer">
                  <span className="small"><I18nText text="Valable jusqu’au" /> {new Date(l.expires_at).toLocaleDateString(intlLocale)}</span>
                  <form action={revokeResidenceLink}>
                    {hidden}
                    <input type="hidden" name="token" value={l.id} />
                    <Submit><I18nText text="Désactiver" /></Submit>
                  </form>
                </div>
              </div>
            ))}
            {!openLinks.length && (
              <form action={createResidenceLink}>
                {hidden}
                <Submit><I18nText text="Créer le lien d’invitation" /></Submit>
              </form>
            )}
          </section>
          <section className="card" style={{ marginBottom: 20 }}>
            <h2><I18nText text="Demandes d’adhésion" /></h2>
            {!requests.length && <p><I18nText text="Aucune demande en attente." /></p>}
            {requests.map((r) => (
              <article key={r.user_id} className="list-row">
                <div>
                  <strong>{r.name || r.email}</strong>
                  <p className="small">{r.email} {r.phone ? "· " + r.phone : ""}</p>
                  <p className="small"><I18nText text="Appartement indiqué" /> : {r.requested_apartment || "—"}</p>
                </div>
                <div className="row-actions">
                  {(["approve", "reject"] as const).map((d) => (
                    <form key={d} action={decideMember}>
                      {hidden}
                      <input type="hidden" name="user" value={r.user_id} />
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
              <details key={r.user_id} className="list-row" style={{ display: "block" }}>
                <summary>
                  <strong>{r.name || r.email}</strong> · {r.apartments.length ? r.apartments.join(", ") : <I18nText text="Sans appartement" />}{" "}
                  <span className={"status-pill " + (r.blocked ? "danger" : "ok")}><I18nText text={r.blocked ? "Bloqué" : "Actif"} /></span>
                  {r.can_post === false && <span className="status-pill"><I18nText text="Lecture seule" /></span>}
                </summary>
                <p className="small">{r.email}</p>
                <form action={updateMember} className="form" style={{ marginTop: 12 }}>
                  {hidden}
                  <input type="hidden" name="user" value={r.user_id} />
                  <label><I18nText text="Nom" /><LocalizedInput name="name" maxLength={160} defaultValue={r.name} /></label>
                  <label><I18nText text="Téléphone" /><LocalizedInput name="phone" maxLength={24} defaultValue={r.phone} /></label>
                  <label>
                    <I18nText text="Appartements (séparés par des virgules, facultatif)" />
                    <LocalizedInput name="apartments" maxLength={1000} defaultValue={r.apartments.join(", ")} placeholder="A-12, B-3" />
                  </label>
                  <Submit><I18nText text="Enregistrer" /></Submit>
                </form>
                <form action={setPermissions} className="perm-form">
                  {hidden}
                  <input type="hidden" name="user" value={r.user_id} />
                  <strong className="small"><I18nText text="Autorisations dans la discussion" /></strong>
                  <label className="checkbox-row"><input type="checkbox" name="can_post" defaultChecked={r.can_post ?? true} /> <I18nText text="Peut écrire et répondre" /></label>
                  <label className="checkbox-row"><input type="checkbox" name="can_photo" defaultChecked={r.can_photo ?? true} /> <I18nText text="Peut partager des photos" /></label>
                  <label className="checkbox-row"><input type="checkbox" name="can_poll" defaultChecked={r.can_poll ?? false} /> <I18nText text="Peut lancer des sondages" /></label>
                  <Submit><I18nText text="Enregistrer les autorisations" /></Submit>
                </form>
                <div className="row-actions" style={{ marginTop: 12 }}>
                  <form action={moderateMember}>
                    {hidden}
                    <input type="hidden" name="user" value={r.user_id} />
                    <input type="hidden" name="task" value={r.blocked ? "unblock" : "block"} />
                    <Submit><I18nText text={r.blocked ? "Débloquer" : "Bloquer"} /></Submit>
                  </form>
                  <form action={moderateMember}>
                    {hidden}
                    <input type="hidden" name="user" value={r.user_id} />
                    <input type="hidden" name="task" value="remove" />
                    <Submit><I18nText text="Supprimer" /></Submit>
                  </form>
                </div>
              </details>
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
              const names = residents.filter((r) => r.apartments.some((a) => a.toLowerCase() === u.label.toLowerCase())).map((r) => r.name || r.email);
              return (
                <div key={u.id} className="list-row">
                  <strong>{u.label}</strong>
                  <span className="small">{names.length ? names.join(", ") : "—"}</span>
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
            <ExpenseBoard expenses={board.expenses} locale={intlLocale} back={`/app/residences/${id}`} labelMode={labelMode} openId={query.open} />
          </section>
          <section className="card">
            <h2><I18nText text="Ajouter une dépense" /></h2>
            {unitList.length ? (
              <form action={addExpense} className="form">
                {hidden}
                <label><I18nText text="Titre" /><LocalizedInput name="title" minLength={3} maxLength={160} required placeholder="Nettoyage des escaliers" /></label>
                <label><I18nText text="Montant total (DH)" /><LocalizedInput name="amount" inputMode="decimal" pattern="\d+(\.\d{1,2})?" required /></label>
                <label><I18nText text="Échéance" /><LocalizedInput name="date" type="date" required /></label>
                <fieldset className="unit-picker">
                  <legend><I18nText text="Répartir entre" /></legend>
                  <div className="unit-picker-tools">
                    <SelectAll name="units" />
                    <ShareLabelToggle mode={labelMode} />
                  </div>
                  <div className="unit-grid">
                    {unitList.map((u) => {
                      const names = residents.filter((r) => r.apartments.some((a) => a.toLowerCase() === u.label.toLowerCase())).map((r) => r.name || r.email);
                      const byName = labelMode === "name" && names.length > 0;
                      return (
                        <label key={u.id} className="unit-pick">
                          <input type="checkbox" name="units" value={u.id} defaultChecked />{" "}
                          <span>
                            <strong>{byName ? names.join(", ") : u.label}</strong>
                            {byName && <small>{u.label}</small>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
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
