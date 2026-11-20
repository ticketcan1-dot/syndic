import { PageSkeleton } from "@/components/page-skeleton";
export default function Loading() {
  return (
    <div className="skeleton-shell">
      <PageSkeleton cards={0} rows={5} />
    </div>
  );
}
