import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, Clock3, LogOut, Mail, MessageCircle, Phone, Building2, XCircle, Home } from "lucide-react";
import { I18nText } from "@/components/i18n";
import { LocalizedInput } from "@/components/i18n-input";
import { Brand } from "@/components/brand";
import { Notice } from "@/components/notice";
import { Submit } from "@/components/submit";
import { signedIn } from "@/lib/access";
import { intlLocale as getIntlLocale } from "@/lib/locale-server";
import { signOut, requestSyndicAccount } from "@/app/actions";
import { contact, plans, planLabels } from "@/lib/plans";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { db, user } = await signedIn();
  const { data: status } = await db.rpc("syndic_my_status");
  if (status?.member) redirect("/app");
  const intlLocale = await getIntlLocale();
  const { data: request } = await db
    .from("syndic_account_requests")
    .select("organization_name,desired_plan,status,created_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const pending = request?.status === "pending";
  const rejected = request?.status === "rejected";
  const steps = [
    ["Compte créé", "done"],
    ["Vérification par notre équipe", pending ? "current" : rejected ? "failed" : "todo"],
    ["Accès à votre espace syndic", "todo"],
  ] as const;
  return (
    <main className="auth-shell">
      <section className="card auth-card waiting-card">
        <div className="waiting-top">
          <Brand />
          <span className={"status-pill " + (rejected ? "danger" : pending ? "warn" : "")}>
            <I18nText text={pending ? "En attente" : rejected ? "Refusée" : "Compte syndic"} />
          </span>
        </div>
        <Notice message={(await searchParams).message} />
        <div className={"waiting-icon " + (rejected ? "danger" : pending ? "warn" : "")}>
          {pending ? <Clock3 size={30} /> : rejected ? <XCircle size={30} /> : <Building2 size={30} />}
        </div>
        <span className="eyebrow">
          <I18nText text="Compte syndic" />
        </span>
        <h1>
          <I18nText
            text={
              pending
                ? "Votre compte attend l’approbation"
                : rejected
                  ? "Demande non validée"
                  : "Demander un compte syndic"
            }
          />
        </h1>
        <p className="waiting-lead">
          <I18nText
            text={
              pending
                ? "Notre équipe vérifie votre demande. Vous pourrez accéder à votre espace syndic dès sa validation, avec un essai gratuit d’un mois."
                : rejected
                  ? "Votre demande de compte syndic n’a pas été acceptée. Contactez-nous ou envoyez une nouvelle demande."
                  : "Indiquez le nom de votre syndic pour gérer vos immeubles et vos habitants."
            }
          />
        </p>
        {request && (
          <dl className="waiting-summary">
            <div>
              <dt><I18nText text="Syndic" /></dt>
              <dd>{request.organization_name}</dd>
            </div>
            <div>
              <dt><I18nText text="Plan souhaité" /></dt>
              <dd><I18nText text={planLabels[request.desired_plan] ?? request.desired_plan} /></dd>
            </div>
            <div>
              <dt><I18nText text="Demande envoyée le" /></dt>
              <dd>{new Date(request.created_at).toLocaleDateString(intlLocale)}</dd>
            </div>
          </dl>
        )}
        {request && (
          <ol className="waiting-steps">
            {steps.map(([label, state], index) => (
              <li key={label} className={state}>
                <span className="dot">
                  {state === "done" ? <Check size={14} /> : state === "failed" ? <XCircle size={14} /> : index + 1}
                </span>
                <I18nText text={label} />
              </li>
            ))}
          </ol>
        )}
        {(!request || rejected) && (
          <form action={requestSyndicAccount} className="form" style={{ marginTop: 22 }}>
            <label>
              <I18nText text="Nom du syndic / de la société" />
              <LocalizedInput name="organization" required minLength={2} maxLength={120} />
            </label>
            <label>
              <I18nText text="Téléphone" />
              <LocalizedInput
                name="phone"
                type="tel"
                required
                maxLength={24}
                defaultValue={typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone : ""}
              />
            </label>
            <label>
              <I18nText text="Plan souhaité" />
              <select name="plan" defaultValue="essai">
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} · {plan.price}
                  </option>
                ))}
              </select>
            </label>
            <Submit>
              <I18nText text="Envoyer la demande" />
            </Submit>
          </form>
        )}
        <div className="waiting-help">
          <strong>
            <I18nText text="Besoin d’aide ?" />
          </strong>
          <div className="waiting-contacts">
            <a className="button whatsapp" href={contact.whatsapp} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={17} />
              <I18nText text="WhatsApp" />
            </a>
            <a className="button outline" href={`tel:${contact.phoneIntl}`}>
              <Phone size={17} />
              {contact.phone}
            </a>
            <a className="button outline" href={`mailto:${contact.email}`}>
              <Mail size={17} />
              <I18nText text="E-mail" />
            </a>
          </div>
        </div>
        <div className="waiting-actions">
          <Link href="/resident" className="button outline">
            <Home size={17} />
            <I18nText text="Mon espace résident" />
          </Link>
          <form action={signOut}>
            <button className="button outline logout">
              <LogOut size={17} />
              <I18nText text="Se déconnecter" />
            </button>
          </form>
        </div>
        <p className="small waiting-account">{user.email}</p>
      </section>
    </main>
  );
}
