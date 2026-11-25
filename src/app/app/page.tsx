import { I18nText } from "@/components/i18n";
import Link from "next/link";
import { Building2, ChevronRight, Clock3, CreditCard, Grid2X2, MessageCircle, Plus, Users, Wallet } from "lucide-react";
import { workspace } from "@/lib/data";
import { loadExpenses } from "@/lib/expenses";
import { signedIn } from "@/lib/access";
import { intlLocale as getIntlLocale } from "@/lib/locale-server";
import { Notice } from "@/components/notice";
export default async function Page({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const locale = await getIntlLocale();
  const { db, user } = await signedIn();
  const [data, board] = await Promise.all([workspace(), loadExpenses(db)]);
  const managed = board.expenses.filter((e) => e.can_manage);
  const shares = managed.flatMap((e) => e.shares);
  const due = shares.reduce((s, x) => s + Math.max(x.amount - x.paid, 0), 0);
  const toConfirm = shares.reduce((s, x) => s + x.claims.filter((c) => c.status === "pending").length, 0);
  const residents = new Set(Object.values(board.unitNames).flat()).size;
  const mad = (cents: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: "MAD", maximumFractionDigits: 0 }).format(cents / 100);
  const firstName = typeof user.user_metadata?.first_name === "string" ? user.user_metadata.first_name : "";
  const stats = [
    { icon: Building2, label: "Immeubles", value: String(data.residences.length), tone: "green" },
    { icon: Grid2X2, label: "Appartements", value: String(data.units.length), tone: "blue" },
    { icon: Users, label: "Habitants", value: String(residents), tone: "violet" },
    { icon: Wallet, label: "Reste à encaisser", value: mad(due), tone: "amber" },
  ];
  const actions = [
    { href: "/operations?view=expenses#nouvelle-depense", icon: Plus, label: "Nouvelle dépense", note: "Eau, électricité, sécurité…" },
    { href: "/operations?view=expenses", icon: Wallet, label: "Qui doit quoi ?", note: "Règlements et relances" },
    { href: "/discussion", icon: MessageCircle, label: "Discussion", note: "Annonces, photos, sondages" },
    { href: "/abonnement", icon: CreditCard, label: "Mon abonnement", note: "Plan et paiements" },
  ];
  return (
    <>
      <div className="dash-hero">
        <div>
          <span className="eyebrow">
            <I18nText text="Votre espace de gestion" />
          </span>
          <h1>
            <I18nText text="Bonjour" />
            {firstName ? ` ${firstName}` : ""} 👋
          </h1>
          <p>
            <I18nText text="Voici l’essentiel de vos copropriétés aujourd’hui." />
          </p>
        </div>
        <Link href="/app/residences" className="button primary">
          <Plus size={17} /> <I18nText text="Ajouter un immeuble" />
        </Link>
      </div>
      <Notice error={data.error} message={(await searchParams).message} />
      {toConfirm > 0 && (
        <Link href="/operations?view=expenses" className="dash-alert">
          <Clock3 size={18} />
          <span>
            <strong>{toConfirm}</strong> <I18nText text="règlement(s) d’habitants à confirmer" />
          </span>
          <ChevronRight size={18} />
        </Link>
      )}
      <div className="dash-stats">
        {stats.map(({ icon: Icon, label, value, tone }) => (
          <div className={"card dash-stat " + tone} key={label}>
            <span className="dash-icon">
              <Icon size={20} />
            </span>
            <div>
              <p>
                <I18nText text={label} />
              </p>
              <strong>{data.error ? "—" : value}</strong>
            </div>
          </div>
        ))}
      </div>
      <div className="dash-grid">
        <section className="card">
          <div className="dash-section-head">
            <h2>
              <I18nText text="Mes immeubles" />
            </h2>
            <Link href="/app/residences" className="text-link small">
              <I18nText text="Tout voir" />
            </Link>
          </div>
          {data.residences.length ? (
            <div className="dash-buildings">
              {data.residences.map((r) => {
                const units = data.units.filter((u) => u.residence_id === r.id).length;
                const left = managed
                  .filter((e) => e.residence_id === r.id)
                  .flatMap((e) => e.shares)
                  .reduce((s, x) => s + Math.max(x.amount - x.paid, 0), 0);
                return (
                  <Link key={r.id} href={`/app/residences/${r.id}`} className="dash-building">
                    <span className="dash-icon green">
                      <Building2 size={20} />
                    </span>
                    <span className="dash-building-text">
                      <strong>{r.name}</strong>
                      <small>
                        {r.city} · {units} <I18nText text="appartement(s)" />
                        {left > 0 && (
                          <>
                            {" · "}
                            <I18nText text="reste" /> {mad(left)}
                          </>
                        )}
                      </small>
                    </span>
                    <ChevronRight size={18} />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <Building2 size={34} />
              <p>
                <I18nText text="Ajoutez votre premier immeuble pour inviter vos habitants et partager les dépenses." />
              </p>
              <Link href="/app/residences" className="button primary">
                <I18nText text="Ajouter un immeuble" />
              </Link>
            </div>
          )}
        </section>
        <section className="card">
          <h2>
            <I18nText text="Actions rapides" />
          </h2>
          <div className="dash-actions">
            {actions.map(({ href, icon: Icon, label, note }) => (
              <Link key={href} href={href} className="dash-action">
                <span className="dash-icon green">
                  <Icon size={18} />
                </span>
                <span>
                  <strong>
                    <I18nText text={label} />
                  </strong>
                  <small>
                    <I18nText text={note} />
                  </small>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <div className="section-note">
        <strong>
          <I18nText text="Votre parcours de démarrage" />
        </strong>
        <p style={{ margin: "8px 0 0" }}>
          <I18nText text="1. Ajoutez un immeuble → 2. Ajoutez ses appartements → 3. Envoyez un lien d’invitation à chaque habitant → 4. Approuvez leurs demandes" />
        </p>
      </div>
    </>
  );
}
