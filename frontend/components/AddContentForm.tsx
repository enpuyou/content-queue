"use client";

import { useState } from "react";
import { contentAPI } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { ContentItem } from "@/types";

interface AddContentFormProps {
  onContentAdded: (newItem: ContentItem) => void;
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
      // API returns the newly created content item
      const newItem = await contentAPI.create({ url });

      // Reset form
      setUrl("");

      // Show success toast
      showToast("Article added successfully!", "success");

      // Notify parent component with the new item
      onContentAdded(newItem);
    } catch (err) {
      // Extract the actual error message from the Error object
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to add content. Please try again.";

      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {error && (
        <div className="text-[var(--color-text-secondary)] border-l-2 border-red-400 pl-4 bg-transparent py-3">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="url"
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste article URL here..."
          required
          className="flex-1 px-3 py-2 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] rounded-none hover:bg-[var(--color-bg-tertiary)] focus:outline-none focus:border-[var(--color-accent)] placeholder-[var(--color-text-muted)] transition-all"
        />

        <button
          type="submit"
          disabled={loading}
          className="px-3 py-2 bg-[var(--color-accent)] text-white rounded-none hover:bg-[var(--color-accent-hover)] focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[var(--color-accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          title="Add to Queue"
        >
          {loading ? "..." : "→"}
        </button>
      </div>
    </form>
  );
}
