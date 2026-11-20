"use client";
import { useRouter } from "next/navigation";
import { I18nText } from "@/components/i18n";
// Syndic preference: show expense shares by apartment number or by resident name (remembered in a cookie).
export function ShareLabelToggle({ mode }: { mode: "unit" | "name" }) {
  const router = useRouter();
  const choose = (value: "unit" | "name") => {
    document.cookie = `syndic_share_label=${value};path=/;max-age=31536000;samesite=lax`;
    router.refresh();
  };
  return (
    <div className="label-toggle" role="group" aria-label="Affichage">
      <span className="small">
        <I18nText text="Afficher :" />
      </span>
      <button type="button" className={mode === "unit" ? "selected" : ""} aria-pressed={mode === "unit"} onClick={() => choose("unit")}>
        <I18nText text="N° d’appartement" />
      </button>
      <button type="button" className={mode === "name" ? "selected" : ""} aria-pressed={mode === "name"} onClick={() => choose("name")}>
        <I18nText text="Nom de la personne" />
      </button>
    </div>
  );
}
