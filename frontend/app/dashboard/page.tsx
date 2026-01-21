import { Suspense } from "react";
import DashboardClient from "./DashboardClient";

// Force dynamic rendering - required for useSearchParams()
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-500">Loading dashboard...</div>
        </div>
      }
    >
      <DashboardClient />
    </Suspense>
  );
}
