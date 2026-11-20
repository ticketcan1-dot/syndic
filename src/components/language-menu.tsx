"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useLocale } from "@/components/i18n";
import type { Locale } from "@/lib/locale";
function Flag({ code }: { code: Locale }) {
  const id = useId().replace(/:/g, "");
  if (code === "fr")
    return (
      <svg viewBox="0 0 30 20" className="flag" aria-hidden="true">
        <rect width="10" height="20" fill="#002395" />
        <rect x="10" width="10" height="20" fill="#fff" />
        <rect x="20" width="10" height="20" fill="#ed2939" />
      </svg>
    );
  if (code === "ar")
    return (
      <svg viewBox="0 0 30 20" className="flag" aria-hidden="true">
        <rect width="30" height="20" fill="#c1272d" />
        <path d="M15.00,5.70 L17.70,14.02 L10.63,8.88 L19.37,8.88 L12.30,14.02 Z" fill="none" stroke="#006233" strokeWidth="0.9" strokeLinejoin="round" />
      </svg>
    );
  return (
    <svg viewBox="0 0 60 30" className="flag" aria-hidden="true">
      <clipPath id={`s${id}`}>
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id={`t${id}`}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath={`url(#s${id})`}>
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#t${id})`} stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}
const languages: { code: Locale; name: string }[] = [
  { code: "fr", name: "Français" },
  { code: "ar", name: "العربية" },
  { code: "en", name: "English" },
];
// Flag button that opens the language list (used in the app header, next to the bell).
export function LanguageMenu({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  const choose = (code: Locale) => {
    setOpen(false);
    if (code === locale) return;
    document.cookie = `syndic_locale=${code};path=/;max-age=31536000;samesite=lax;secure`;
    window.location.reload();
  };
  const current = languages.find((l) => l.code === locale) ?? languages[0];
  return (
    <div className={"lang-menu " + className} ref={box}>
      <button
        type="button"
        className="icon-button lang-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${current.name}`}
        title={current.name}
        onClick={() => setOpen(!open)}
      >
        <Flag code={current.code} />
      </button>
      {open && (
        <ul className="lang-list" role="listbox" aria-label="Language">
          {languages.map((l) => (
            <li key={l.code}>
              <button type="button" role="option" aria-selected={l.code === locale} onClick={() => choose(l.code)}>
                <Flag code={l.code} />
                <span>{l.name}</span>
                {l.code === locale && <Check size={15} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
