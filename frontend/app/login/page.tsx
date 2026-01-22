"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      setError(error.response?.data?.detail || error.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)]">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full space-y-8 p-8">
        <div>
          <h2 className="font-serif text-3xl font-normal text-center text-[var(--color-text-primary)]">
            sedi
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="border-l-4 border-red-600 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 rounded-none">
              {error}
            </div>
          )}

          <div>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="block w-full px-3 py-2 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] rounded-none hover:bg-[var(--color-bg-tertiary)] focus:outline-none focus:border-[var(--color-accent)] placeholder-[var(--color-text-muted)] transition-all"
            />
          </div>

          <div>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="block w-full px-3 py-2 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] rounded-none hover:bg-[var(--color-bg-tertiary)] focus:outline-none focus:border-[var(--color-accent)] placeholder-[var(--color-text-muted)] transition-all"
            />
          </div>

          <div className="flex justify-center">
            <button
              type="submit"
              disabled={isLoading}
              className="text-xs px-2 py-1 rounded-none bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </div>

          <p className="text-center text-sm text-[var(--color-text-secondary)]">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
            >
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
