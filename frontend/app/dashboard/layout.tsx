import { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">{children}</div>
  );
}
