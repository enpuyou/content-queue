"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import ContentItem from "./ContentItem";
import { contentAPI, listsAPI } from "@/lib/api";
import { ContentItem as ContentItemType, List } from "@/types";
import { useToast } from "@/contexts/ToastContext";
import { useProcessingPolling } from "@/hooks/useProcessingPolling";
import { useLists } from "@/contexts/ListsContext";

/**
 * Filter type matching the backend's boolean flags:
 * - 'all': Show everything (unread, read, non-archived)
 * - 'unread': is_read = false, is_archived = false
 * - 'read': is_read = true, is_archived = false
 * - 'archived': is_archived = true (regardless of read status)
 */
type FilterType = "all" | "unread" | "read" | "archived";

export default function ContentList() {
  // Toast context for showing success/error messages
  const { showToast } = useToast();
  const { incrementListCount, decrementListCount } = useLists();

  // Get URL search params to read filter from URL
  const searchParams = useSearchParams();

  // State for storing the content items from the backend
  const [contents, setContents] = useState<ContentItemType[]>([]);

  // Loading state - true while fetching data
  const [loading, setLoading] = useState(true);

  // Error state - stores error message if fetch fails
  const [error, setError] = useState<string | null>(null);

  // Available Lists for adding content to lists
  const [availableLists, setAvailableLists] = useState<
    Array<{ id: string; name: string }>
  >([]);

  // Current filter selection
  // read from URL query params or default to 'all'
  const filter = (searchParams.get("filter") as FilterType) || "all";

  // Pagination state - backend returns total count
  const [total, setTotal] = useState(0);

  /**
   * useEffect Hook - Runs when component mounts (empty dependency array [])
   * This is where we fetch data from the API on initial page load
   */
  useEffect(() => {
    fetchContents();
    fetchAvailableLists();
  }, [filter]); // Empty array = run once on mount

  /**
   * Polling hook - automatically updates items when processing completes
   * This runs continuously, checking items with status "pending" or "processing"
   */
  useProcessingPolling(contents, (updatedItem) => {
    // When an item finishes processing, update it in our state
    setContents((prevContents) =>
      prevContents.map((content) =>
        content.id === updatedItem.id ? updatedItem : content,
      ),
    );

    // Show a toast notification
    if (updatedItem.processing_status === "completed") {
      showToast(
        `"${updatedItem.title || "Article"}" finished processing`,
        "success",
      );
    } else if (updatedItem.processing_status === "failed") {
      showToast(
        `Failed to process "${updatedItem.title || "Article"}"`,
        "error",
      );
    }
  });

  /**
   * Fetches content from the backend API
   * Uses the contentAPI.getAll() helper from lib/api.ts
   * Backend returns: { items: ContentItem[], total: number, skip: number, limit: number }
   */
  const fetchContents = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call the backend API - this returns the paginated response
      const response = await contentAPI.getAll();

      // Backend returns { items, total, skip, limit }
      setContents(response.items);
      setTotal(response.total);
    } catch (err) {
      console.error("Failed to fetch contents:", err);
      setError("Failed to load your content. Please try again.");
    } finally {
      // Always run this, whether success or error
      setLoading(false);
    }
  };

  /**
   * Fetches available lists for adding content items to lists
   * Uses the listsAPI.getAll() helper from lib/api.ts
   */
  const fetchAvailableLists = async () => {
    try {
      const lists: List[] = await listsAPI.getAll();
      // Map to simpler format for dropdown
      setAvailableLists(
        lists.map((list) => ({ id: list.id, name: list.name })),
      );
    } catch (err) {
      console.error("Failed to fetch available lists:", err);
      // Silently fail - user can still use other features
    }
  };

  /**
   * Handles marking an item as read/unread or archived
   * Uses optimistic updates: update UI immediately, revert if API call fails
   */
  const handleStatusChange = async (
    id: string,
    updates: { is_read?: boolean; is_archived?: boolean },
  ) => {
    // Save the old state in case we need to revert
    const previousContents = [...contents];

    try {
      // OPTIMISTIC UPDATE: Update UI immediately for better UX
      setContents(
        contents.map((content) =>
          content.id === id ? { ...content, ...updates } : content,
        ),
      );

      // Call the backend to persist the change
      await contentAPI.update(id, updates);
      showToast("Updated successfully", "success");
    } catch (err) {
      console.error("Failed to update content:", err);
      // REVERT on error: restore previous state
      setContents(previousContents);
      setError("Failed to update item. Please try again.");
    }
  };

  /**
   * Handles deleting a content item
   * Also uses optimistic updates for instant feedback
   */
  const handleDelete = async (id: string) => {
    const previousContents = [...contents];

    try {
      // Remove from UI immediately
      setContents(contents.filter((content) => content.id !== id));
      setTotal(total - 1);

      // Call backend to soft delete
      await contentAPI.delete(id);
      showToast("Article deleted successfully", "success");
    } catch (err) {
      console.error("Failed to delete content:", err);
      // Restore on error
      setContents(previousContents);
      setTotal(total + 1);
      showToast("Failed to delete article", "error");
      setError("Failed to delete item. Please try again.");
    }
  };

  /**
   * Handles adding a content item to a list
   */
  const handleAddToList = async (contentId: string, listId: string) => {
    try {
      // Optimistic update - increment count immediately
      incrementListCount(listId);

      await listsAPI.addContent(listId, [contentId]);
      showToast("Added to list successfully", "success");
    } catch (err) {
      console.error("Failed to add to list:", err);
      // Revert on error - decrement count back
      decrementListCount(listId);
      showToast("Failed to add to list", "error");
    }
  };

  /**
   * Client-side filtering based on backend's boolean flags
   * Backend uses is_read and is_archived, not a status enum
   */
  const filteredContents = contents.filter((content) => {
    switch (filter) {
      case "unread":
        return !content.is_read && !content.is_archived;
      case "read":
        return content.is_read && !content.is_archived;
      case "archived":
        return content.is_archived;
      default: // 'all'
        return !content.is_archived; // Show all non-archived items
    }
  });

  /**
   * Helper function to count items by filter type
   * Used to show counts in the filter buttons like "Unread (5)"
   */
  const getCount = (filterType: FilterType): number => {
    switch (filterType) {
      case "unread":
        return contents.filter((c) => !c.is_read && !c.is_archived).length;
      case "read":
        return contents.filter((c) => c.is_read && !c.is_archived).length;
      case "archived":
        return contents.filter((c) => c.is_archived).length;
      default:
        return contents.filter((c) => !c.is_archived).length;
    }
  };

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">Loading your queue...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error message - shown at top if something went wrong */}
      {error && (
        <div className="text-[var(--color-text-secondary)] border-l-2 border-red-400 pl-4 bg-transparent py-3 flex justify-between items-center mb-4">
          <span className="text-sm">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter buttons - action style */}
      <div className="flex gap-1 pb-4 border-b border-[var(--color-border)] overflow-x-auto">
        {(["all", "unread", "read", "archived"] as const).map((filterType) => (
          <Link
            key={filterType}
            href={
              filterType === "all"
                ? "/dashboard"
                : `/dashboard?filter=${filterType}`
            }
            className={`no-underline text-xs px-2 py-1 rounded-none border whitespace-nowrap transition-colors ${
              filter === filterType
                ? "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-accent)]"
                : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[var(--color-accent)]"
            }`}
          >
            {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            {filterType !== "all" && ` (${getCount(filterType)})`}
          </Link>
        ))}
      </div>

      {/* Total count display */}
      <div className="text-xs text-[var(--color-text-faint)] uppercase tracking-wider mb-4">
        Showing {filteredContents.length} of {total} items
      </div>

      {/* Content items list */}
      {filteredContents.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-text-muted)]">
          <p className="text-sm">
            {filter === "all"
              ? "No content yet. Add your first article above!"
              : `No ${filter} items.`}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-border-subtle)]">
          {filteredContents.map((content) => (
            <ContentItem
              key={content.id}
              content={content}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              availableLists={availableLists}
              onAddToList={(listId) => handleAddToList(content.id, listId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
