"use client";
import { useState } from "react";
import { ArrowUpDown, Droplets, Flame, ShieldCheck, Sparkles, Trees, Wrench, Zap, History } from "lucide-react";
import { I18nText, translate, useLocale } from "@/components/i18n";
// The usual building expenses, one click away.
export const frequentPresets = [
  { key: "electricite", label: "Électricité", icon: Zap, color: "#d97706" },
  { key: "eau", label: "Eau", icon: Droplets, color: "#0284c7" },
  { key: "securite", label: "Sécurité / gardiennage", icon: ShieldCheck, color: "#4f46e5" },
  { key: "nettoyage", label: "Nettoyage", icon: Sparkles, color: "#0d9488" },
  { key: "ascenseur", label: "Ascenseur", icon: ArrowUpDown, color: "#475569" },
  { key: "jardinage", label: "Jardinage", icon: Trees, color: "#16a34a" },
  { key: "entretien", label: "Entretien et réparations", icon: Wrench, color: "#9333ea" },
  { key: "gaz", label: "Gaz", icon: Flame, color: "#dc2626" },
] as const;
export type RecentExpense = { residence: string; title: string; amount: number };
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
// Shortcut chips: fill the title and reuse the last amount used for that expense in that residence.
export function FrequentExpenses({ recent }: { recent: RecentExpense[] }) {
  const locale = useLocale();
  const [picked, setPicked] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  // Titles the syndic used at least twice and that are not one of the presets.
  const presetNames = new Set(frequentPresets.flatMap((p) => [norm(p.label), norm(translate(p.label, locale))]));
  const counts = new Map<string, { title: string; n: number }>();
  for (const r of recent) {
    const k = norm(r.title);
    if (presetNames.has(k)) continue;
    const c = counts.get(k);
    counts.set(k, { title: c?.title ?? r.title, n: (c?.n ?? 0) + 1 });
  }
  const habits = [...counts.values()].filter((c) => c.n >= 2).sort((a, b) => b.n - a.n).slice(0, 6);
  function apply(event: React.MouseEvent<HTMLButtonElement>, title: string, aliases: string[] = []) {
    const form = event.currentTarget.closest("form");
    if (!form) return;
    const titleInput = form.querySelector<HTMLInputElement>('input[name="title"]');
    const amountInput = form.querySelector<HTMLInputElement>('input[name="amount"]');
    const residenceField = form.querySelector<HTMLInputElement | HTMLSelectElement>('[name="target"], [name="residence_id"]');
    if (titleInput) titleInput.value = title;
    const keys = new Set([norm(title), ...aliases.map(norm)]);
    const last = recent.find((r) => keys.has(norm(r.title)) && (!residenceField || r.residence === residenceField.value));
    if (amountInput) {
      amountInput.value = last ? (last.amount / 100).toFixed(2) : "";
      (last ? form.querySelector<HTMLInputElement>('input[name="date"]') : amountInput)?.focus();
    }
    setPicked(norm(title));
    setHint(last ? translate("Montant de la dernière fois repris. Modifiez-le si besoin.", locale) : "");
  }
  return (
    <div className="frequent">
      <span className="small frequent-label">
        <I18nText text="Dépenses fréquentes" />
      </span>
      <div className="frequent-chips">
        {frequentPresets.map(({ key, label, icon: Icon, color }) => {
          const title = translate(label, locale);
          return (
            <button
              key={key}
              type="button"
              className={"frequent-chip" + (picked === norm(title) ? " active" : "")}
              style={{ ["--c" as string]: color }}
              onClick={(e) => apply(e, title, [label])}
            >
              <Icon size={16} />
              {title}
            </button>
          );
        })}
        {habits.map((h) => (
          <button
            key={h.title}
            type="button"
            className={"frequent-chip" + (picked === norm(h.title) ? " active" : "")}
            style={{ ["--c" as string]: "#64748b" }}
            onClick={(e) => apply(e, h.title)}
            title={translate("Utilisée souvent", locale)}
          >
            <History size={16} />
            {h.title}
          </button>
        ))}
      </div>
      {hint && <span className="small frequent-hint">{hint}</span>}
    </div>
  );
}
