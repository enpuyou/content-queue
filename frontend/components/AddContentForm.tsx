"use client";

import { useState } from "react";
import { contentAPI } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

interface AddContentFormProps {
  onContentAdded: () => void;
}

export default function AddContentForm({
  onContentAdded,
}: AddContentFormProps) {
  const { showToast } = useToast();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await contentAPI.create({ url });

      // Reset form
      setUrl("");

      // Show success toast
      showToast("Article added successfully!", "success");

      // Notify parent component
      onContentAdded();
    } catch (err) {
      // Extract the actual error message from the Error object
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to add content. Please try again.";

      setError(errorMessage);
      showToast(errorMessage, "error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="text-[var(--color-text-secondary)] border-l-2 border-red-400 pl-4 bg-transparent py-3">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="url"
          className="block text-xs font-medium text-[var(--color-text-muted)] mb-2 uppercase tracking-wider"
        >
          URL *
        </label>
        <input
          type="url"
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/article"
          required
          className="w-full px-0 py-2 border-0 border-b border-[var(--color-border)] bg-transparent rounded-none focus:outline-none focus:border-[var(--color-accent)] placeholder-[var(--color-text-faint)]"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[var(--color-accent)] text-white py-2 px-4 rounded-none hover:bg-[var(--color-accent-hover)] focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[var(--color-accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Adding..." : "Add to Queue"}
      </button>
    </form>
  );
}
