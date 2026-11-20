import { I18nText } from "@/components/i18n";
// Placeholder shown instantly while a page loads its data.
export function PageSkeleton({ cards = 3, rows = 4 }: { cards?: number; rows?: number }) {
  return (
    <div className="skeleton-page" role="status" aria-live="polite">
      <span className="sr-only">
        <I18nText text="Chargement…" />
      </span>
      <div className="sk sk-eyebrow" />
      <div className="sk sk-title" />
      <div className="sk sk-text" />
      <div className="skeleton-cards">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="skeleton-card">
            <div className="sk sk-line short" />
            <div className="sk sk-number" />
          </div>
        ))}
      </div>
      <div className="skeleton-card">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="skeleton-row">
            <div className="sk sk-avatar" />
            <div style={{ flex: 1 }}>
              <div className="sk sk-line" />
              <div className="sk sk-line short" />
            </div>
          </div>
        ))}
      </div>
      <p className="skeleton-label">
        <span className="spinner" /> <I18nText text="Chargement de vos informations…" />
      </p>
    </div>
  );
}
