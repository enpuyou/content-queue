"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Reader from "@/components/Reader";
import { contentAPI } from "@/lib/api";
import { ContentItem } from "@/types";

export default function ContentPage() {
  const params = useParams();
  const contentId = params.id as string;

  const [content, setContent] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await contentAPI.getById(contentId);
      setContent(data);
    } catch (err) {
      console.error("Failed to fetch content:", err);
      setError(
        "Failed to load article. It may not exist or you may not have access.",
      );
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleStatusChange = async (updates: {
    is_read?: boolean;
    is_archived?: boolean;
    read_position?: number;
  }) => {
    if (!content) return;

    const previousContent = { ...content };

    try {
      // Optimistic update
      setContent({ ...content, ...updates });

      // Persist to backend and get updated content with computed reading_status
      const updatedContent = await contentAPI.update(contentId, updates);

      // Update with the full response from backend
      setContent(updatedContent);

      // Update the cached content in sessionStorage so it reflects when navigating back
      try {
        const cachedData = sessionStorage.getItem("contentListCache");
        if (cachedData) {
          const cache = JSON.parse(cachedData);
          if (cache.items && Array.isArray(cache.items)) {
            cache.items = cache.items.map((item: ContentItem) =>
              item.id === contentId ? updatedContent : item,
            );
            sessionStorage.setItem("contentListCache", JSON.stringify(cache));
          }
        }
      } catch (cacheErr) {
        // Silently fail - cache update is not critical
        console.warn("Failed to update cache:", cacheErr);
      }
    } catch (err) {
      console.error("Failed to update content:", err);
      // Revert on error
      setContent(previousContent);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <div className="text-center font-mono">
          {/* Typewriter dots animation */}
          <div className="flex items-center justify-center gap-1 text-[var(--color-text-muted)]">
            <span className="inline-block animate-pulse">.</span>
            <span className="inline-block animate-pulse [animation-delay:0.3s]">
              .
            </span>
            <span className="inline-block animate-pulse [animation-delay:0.6s]">
              .
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h1 className="font-serif text-2xl font-normal text-[var(--color-text-primary)] mb-2">
            Article Not Found
          </h1>
          <p className="text-[var(--color-text-secondary)] mb-6">
            {error || "This article could not be loaded."}
          </p>
          <a
            href="/dashboard"
            className="inline-block bg-[var(--color-accent)] text-white px-6 py-2 hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <Reader content={content} onStatusChange={handleStatusChange} />;
}
