import { Suspense } from "react";
import CratesClient from "./CratesClient";
import RetroLoader from "@/components/RetroLoader";

export const dynamic = "force-dynamic";

export default function CratesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
          <div className="text-[var(--color-text-muted)]">
            <RetroLoader text="Loading crates" />
          </div>
        </div>
      }
    >
      <CratesClient />
    </Suspense>
  );
}
