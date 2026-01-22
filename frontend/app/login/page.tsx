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
          <p className="mt-2 text-center text-[var(--color-text-secondary)]">
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="border-l-4 border-red-600 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 rounded-none">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[var(--color-text-primary)]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] rounded-none focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] text-[var(--color-text-primary)]"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[var(--color-text-primary)]"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] rounded-none focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] text-[var(--color-text-primary)]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 rounded-none text-sm font-medium text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>

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
