"use client";
import { I18nText } from "@/components/i18n";
// "Select all" checkbox for the checkboxes named `name` in the same fieldset.
export function SelectAll({ name }: { name: string }) {
  return (
    <label className="unit-pick select-all">
      <input
        type="checkbox"
        onChange={(event) => {
          const box = event.currentTarget.closest("fieldset");
          box?.querySelectorAll<HTMLInputElement>(`input[name="${name}"], input[name="members"]`).forEach((input) => {
            input.checked = event.currentTarget.checked;
          });
        }}
      />
      <I18nText text="Tout sélectionner" />
    </label>
  );
}
