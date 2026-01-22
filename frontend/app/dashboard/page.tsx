import { Suspense } from "react";
import DashboardClient from "./DashboardClient";

// Force dynamic rendering - required for useSearchParams()
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
          <div className="text-[var(--color-text-muted)]">
            Loading dashboard...
          </div>
        </div>
      }
    >
      <DashboardClient />
    </Suspense>
  );
}
