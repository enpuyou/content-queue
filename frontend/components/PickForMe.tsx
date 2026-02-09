"use client";

import { useState } from "react";
import { contentAPI } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function PickForMe() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handlePickForMe = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await contentAPI.getRecommended(0, 1);

      if (!data.items || data.items.length === 0) {
        setError("No recommendations available. Read some articles first.");
        return;
      }

      const item = data.items[0];
      router.push(`/content/${item.id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to pick article";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && (
        <div className="mb-2 text-xs text-red-500 px-2 py-1 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-600 dark:text-red-400 hover:underline"
          >
            ✕
          </button>
        </div>
      )}
      <button
        onClick={handlePickForMe}
        disabled={loading}
        className="w-full px-4 py-3 rounded font-serif text-[var(--color-accent)] border border-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Finding something..." : "Surprise me 🎲"}
      </button>
    </>
  );
}
