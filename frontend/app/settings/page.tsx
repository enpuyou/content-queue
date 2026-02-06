"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import SettingsCarousel from "@/components/SettingsCarousel";
import SettingsPreview from "@/components/SettingsPreview";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div
      className="min-h-screen bg-[var(--color-bg-primary)] flex flex-col"
      suppressHydrationWarning
    >
      <Navbar />

      <main className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 py-6 sm:px-6 lg:px-8">
        {/* Carousel Control Bar */}
        <div className="mb-6 py-4 border-b border-[var(--color-border)]">
          <SettingsCarousel />
        </div>

        {/* Preview - takes most of the space */}
        <div className="flex-1 min-h-[400px] mb-8">
          <SettingsPreview />
        </div>

        {/* Account & Email Section - compact at bottom */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-[var(--color-border)]">
          {/* Account Section */}
          {user && (
            <div className="flex items-center justify-between py-3 px-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    Account
                  </div>
                  <div className="text-sm text-[var(--color-text-primary)]">
                    {user.email}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs px-2 py-1 sm:px-3 sm:py-1.5 rounded-none border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-red-400 hover:text-red-500 transition-colors w-20"
              >
                Sign out
              </button>
            </div>
          )}

          {/* Save by Email - inline layout matching Account box */}
          <div className="flex items-center justify-between py-3 px-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-[var(--color-text-muted)]">
                Save by Email
              </div>
              <code className="text-xs sm:text-sm font-mono text-[var(--color-text-primary)] select-all block truncate">
                {user?.email_token
                  ? `save-${user.email_token}@sedi.app`
                  : "Loading..."}
              </code>
            </div>
            <button
              onClick={() => {
                if (user?.email_token) {
                  const email = `save-${user.email_token}@sedi.app`;
                  navigator.clipboard.writeText(email);
                }
              }}
              className="text-xs px-2 py-1 sm:px-3 sm:py-1.5 rounded-none border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)] transition-colors flex-shrink-0 w-20"
            >
              Copy
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
