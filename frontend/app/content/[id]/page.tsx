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

      // Persist to backend
      await contentAPI.update(contentId, updates);
    } catch (err) {
      console.error("Failed to update content:", err);
      // Revert on error
      setContent(previousContent);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 mb-2">Loading article...</div>
          <div className="text-sm text-gray-400">
            Preparing your reading experience
          </div>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Article Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            {error || "This article could not be loaded."}
          </p>
          <a
            href="/dashboard"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <Reader content={content} onStatusChange={handleStatusChange} />;
}
