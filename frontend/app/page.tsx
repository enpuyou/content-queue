"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-accent)] mx-auto"></div>
          <p className="mt-4 text-[var(--color-text-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)]">
      <div className="max-w-md w-full text-center space-y-8 p-8">
        <div>
          <h1 className="font-serif text-4xl font-normal text-[var(--color-text-primary)]">
            sedi
          </h1>
          <p className="mt-4 text-md text-[var(--color-text-secondary)]">
            Content aggregation and reading queue
          </p>
        </div>

        <div className="flex justify-center gap-4">
          <Link
            href="/login"
            className="text-xs px-2 py-1 rounded-none bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="text-xs px-2 py-1 rounded-none bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
