"use client";
import { createContext, useContext } from "react";
import type { Locale } from "@/lib/locale";
import { catalog } from "@/lib/translations";
const LocaleContext = createContext<Locale>("fr");
export function LanguageProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}
export function useLocale() {
  return useContext(LocaleContext);
}
export function translate(text: string, locale: Locale) {
  if (locale === "fr") return text;
  return catalog[text]?.[locale] ?? text;
}
export function I18nText({ text }: { text: string }) {
  return <>{translate(text, useLocale())} </>;
}
export function SystemNotification({ text }: { text: string }) {
  const locale = useLocale();
  const prefixes = ["Nouvelle cotisation : ", "Nouvelle réunion : ", "Réunion dans les prochaines 24 heures : ", "Incident déclaré : ", "Suivi de votre incident : ", "Nouveau compte syndic à approuver : ", "Nouveau virement à vérifier : ", "Règlement déclaré : ", "Nouvelle réponse : ", "Nouveau sondage : "];
  const prefix = prefixes.find((value) => text.startsWith(value));
  return <>{prefix ? translate(prefix.trim(), locale) + " " + text.slice(prefix.length) : translate(text, locale)}</>;
}
