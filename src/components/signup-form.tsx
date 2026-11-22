"use client";
import { useActionState, useState } from "react";
import { CircleAlert } from "lucide-react";
import { I18nText, translate, useLocale } from "@/components/i18n";
import { Submit } from "@/components/submit";
import { signUpAction, type SignUpState } from "@/app/actions";
import { plans } from "@/lib/plans";
const labels: Record<string, string> = {
  first_name: "Prénom",
  last_name: "Nom",
  phone: "Téléphone",
  email: "Adresse e-mail",
  password: "Mot de passe",
  confirmation: "Confirmer le mot de passe",
  organization: "Nom du syndic / de la société",
};
export function SignUpForm({ syndic: initialSyndic, next }: { syndic: boolean; next?: string }) {
  const locale = useLocale();
  const [state, action] = useActionState<SignUpState, FormData>(signUpAction, null);
  const [syndic, setSyndic] = useState(initialSyndic);
  const errors = state?.errors ?? {};
  const values = state?.values ?? {};
  const problems = Object.keys(errors);
  // One field: label, input, and its error in red just below.
  const field = (
    name: string,
    props: React.InputHTMLAttributes<HTMLInputElement>,
    note?: string,
  ) => (
    <label className={errors[name] ? "has-error" : undefined}>
      <I18nText text={labels[name]} />
      <input
        name={name}
        defaultValue={values[name] ?? ""}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
        {...props}
      />
      {errors[name] ? (
        <span className="field-error" id={`${name}-error`}>
          <CircleAlert size={14} /> {translate(errors[name], locale)}
        </span>
      ) : (
        note && (
          <span className="form-note">
            <I18nText text={note} />
          </span>
        )
      )}
    </label>
  );
  return (
    // noValidate: the server checks every field and lists all the problems at once.
    <form action={action} className="form" noValidate key={JSON.stringify(values)}>
      {problems.length > 0 && (
        <div className="error-summary" role="alert">
          <strong>
            <I18nText text={problems.length > 1 ? "Corrigez les champs suivants :" : "Corrigez le champ suivant :"} />
          </strong>
          <ul>
            {problems.map((name) => (
              <li key={name}>{translate(errors[name], locale)}</li>
            ))}
          </ul>
        </div>
      )}
      {next && <input type="hidden" name="next" value={next} />}
      {field("first_name", { autoComplete: "given-name", maxLength: 80 })}
      {field("last_name", { autoComplete: "family-name", maxLength: 80 })}
      {field("phone", { type: "tel", inputMode: "numeric", autoComplete: "tel", maxLength: 14, placeholder: "0612345678" }, "10 chiffres, par exemple 0612345678")}
      {field("email", { type: "email", autoComplete: "email", maxLength: 254 })}
      {field("password", { type: "password", autoComplete: "new-password", maxLength: 128 }, "12 caractères minimum")}
      {field("confirmation", { type: "password", autoComplete: "new-password", maxLength: 128 })}
      {next && (
        <label>
          <I18nText text="Appartement (facultatif)" />
          <input name="apartment" maxLength={60} placeholder="A-12" defaultValue={values.apartment ?? ""} />
        </label>
      )}
      {!next && (
        <label className="checkbox-row">
          <input type="checkbox" name="syndic" checked={syndic} onChange={(event) => setSyndic(event.target.checked)} />
          <I18nText text="Je suis syndic (gestionnaire de résidence)" />
        </label>
      )}
      {syndic && !next && (
        <>
          <p className="form-note">
            <I18nText text="Les comptes syndic sont validés par notre équipe avant activation. Vous commencez par un essai gratuit d’un mois." />
          </p>
          {field("organization", { maxLength: 120 })}
          <fieldset className="plan-choice">
            <legend>
              <I18nText text="Plan souhaité" />
            </legend>
            {plans.map((plan, index) => (
              <label key={plan.id}>
                <input type="radio" name="plan" value={plan.id} defaultChecked={values.plan ? values.plan === plan.id : index === 0} />
                <span>
                  <I18nText text={plan.name} />
                  {" · "}
                  <I18nText text={plan.price} />
                </span>
              </label>
            ))}
          </fieldset>
        </>
      )}
      <Submit>
        <I18nText text="Créer mon compte" />
      </Submit>
    </form>
  );
}
