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
          <p className="mt-4 text-lg text-[var(--color-text-secondary)]">
            Your personal content aggregation and reading queue
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/login"
            className="block w-full bg-[var(--color-accent)] text-white py-3 px-6 rounded-none hover:bg-[var(--color-accent-hover)] transition-colors font-medium"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="block w-full bg-[var(--color-bg-secondary)] text-[var(--color-accent)] py-3 px-6 rounded-none border border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)] transition-colors font-medium"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
