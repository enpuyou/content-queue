"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { listsAPI, contentAPI } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import ContentItem from "@/components/ContentItem";
import ContentCard from "@/components/ContentCard";
import AddContentToListModal from "@/components/AddContentToListModal";
import { ContentItem as ContentItemType } from "@/types";
import { useLists } from "@/contexts/ListsContext";
import Navbar from "@/components/Navbar";

// Type for list details
interface ListDetail {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export default function ListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { decrementListCount, incrementListCount } = useLists();

  const listId = params.id as string;

  const [list, setList] = useState<ListDetail | null>(null);
  const [contents, setContents] = useState<ContentItemType[]>([]);
  const [isAddContentModalOpen, setIsAddContentModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchListAndContent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch list details and content in parallel
      const [listData, contentData] = await Promise.all([
        listsAPI.getById(listId),
        listsAPI.getContent(listId),
      ]);

      setList(listData);
      setContents(contentData);
    } catch (err) {
      console.error("Failed to fetch list:", err);
      setError(
        "Failed to load list. It may not exist or you may not have access.",
      );
      showToast("Failed to load list", "error");
    } finally {
      setLoading(false);
    }
  }, [listId, showToast]);

  // Fetch list details and content
  useEffect(() => {
    fetchListAndContent();
  }, [fetchListAndContent]);

  const handleRemoveFromList = async (contentId: string) => {
    const previousContents = [...contents];

    try {
      // Optimistic update - remove from UI immediately
      setContents(contents.filter((c) => c.id !== contentId));
      // Also decrement the count in the lists context
      decrementListCount(listId);

      // Call API to remove from list
      await listsAPI.removeContent(listId, [contentId]);
      showToast("Removed from list", "success");
    } catch (err) {
      console.error("Failed to remove from list:", err);
      // Revert on error
      setContents(previousContents);
      // Increment count back on error (undo the decrement)
      incrementListCount(listId);
      showToast("Failed to remove from list", "error");
    }
  };

  const handleStatusChange = async (
    id: string,
    updates: {
      is_read?: boolean;
      is_archived?: boolean;
      read_position?: number;
    },
  ) => {
    const previousContents = [...contents];

    try {
      // Optimistic update
      setContents(
        contents.map((content) =>
          content.id === id ? { ...content, ...updates } : content,
        ),
      );

      await contentAPI.update(id, updates);
      showToast("Updated successfully", "success");
    } catch (err) {
      console.error("Failed to update content:", err);
      setContents(previousContents);
      showToast("Failed to update", "error");
    }
  };

  const handleDelete = async (id: string) => {
    const previousContents = [...contents];

    try {
      // Remove from UI
      setContents(contents.filter((content) => content.id !== id));

      await contentAPI.delete(id);
      showToast("Article deleted successfully", "success");
    } catch (err) {
      console.error("Failed to delete content:", err);
      setContents(previousContents);
      showToast("Failed to delete article", "error");
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <div className="text-[var(--color-text-muted)]">Loading list...</div>
        </div>
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <h2 className="font-serif text-2xl font-normal text-[var(--color-text-primary)] mb-4">
            List Not Found
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-6">
            {error || "This list could not be loaded."}
          </p>
          <button
            onClick={() => router.push("/lists")}
            className="px-6 py-2 text-sm rounded-none bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            Back to Lists
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="space-y-4">
          {/* Back button */}
          <button
            onClick={() => router.push("/lists")}
            className="text-xs px-2 py-1 rounded-none border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors"
          >
            ← Back
          </button>

          {/* Title and Add Content button */}
          <div className="flex justify-between items-start pb-4 border-b border-[var(--color-border)]">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="font-serif text-3xl font-normal text-[var(--color-text-primary)]">
                  {list.name}
                </h1>
                {list.is_shared && (
                  <span className="text-xs px-2 py-1 rounded-none border border-[var(--color-border)] text-[var(--color-text-muted)]">
                    Shared
                  </span>
                )}
              </div>
              {list.description && (
                <p className="text-[var(--color-text-secondary)] text-sm mt-1">
                  {list.description}
                </p>
              )}
              <p className="text-xs text-[var(--color-text-muted)] mt-2">
                {contents.length} {contents.length === 1 ? "item" : "items"}
              </p>
            </div>

            {/* Add Content button */}
            <button
              onClick={() => setIsAddContentModalOpen(true)}
              className="text-xs px-2 py-1 rounded-none border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors whitespace-nowrap"
            >
              + Add Content
            </button>
          </div>
        </div>

        {/* Empty state */}
        {contents.length === 0 && (
          <div className="text-center py-12 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] rounded-none">
            <h3 className="font-serif text-xl font-normal text-[var(--color-text-primary)] mb-2">
              No content yet
            </h3>
            <button
              onClick={() => setIsAddContentModalOpen(true)}
              className="text-xs px-2 py-1 rounded-none border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors whitespace-nowrap"
            >
              Add Your First Item
            </button>
          </div>
        )}

        {/* Content list */}
        {contents.length > 0 && (
          <>
            {/* Mobile: Card layout */}
            <div className="sm:hidden grid gap-4">
              {contents.map((content) => (
                <ContentCard
                  key={content.id}
                  content={content}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  onRemoveFromList={() => handleRemoveFromList(content.id)}
                  returnPath={`/lists/${listId}`}
                />
              ))}
            </div>

            {/* Desktop: List layout */}
            <div className="hidden sm:block divide-y divide-[var(--color-border-subtle)]">
              {contents.map((content) => (
                <ContentItem
                  key={content.id}
                  content={content}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  onRemoveFromList={() => handleRemoveFromList(content.id)}
                  returnPath={`/lists/${listId}`}
                />
              ))}
            </div>
          </>
        )}
        {/* Add Content Modal */}
        <AddContentToListModal
          isOpen={isAddContentModalOpen}
          listId={listId}
          onClose={() => setIsAddContentModalOpen(false)}
          onSuccess={() => {
            fetchListAndContent(); // Refresh the list content
          }}
        />
      </div>
    </div>
  );
}
