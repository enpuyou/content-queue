"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ContentItem from "./ContentItem";
import ContentCard from "./ContentCard";
import RetroLoader from "./RetroLoader";
import { contentAPI, listsAPI } from "@/lib/api";
import { ContentItem as ContentItemType, List } from "@/types";
import { useProcessingPolling } from "@/hooks/useProcessingPolling";
import { useLists } from "@/contexts/ListsContext";
import { useHotkeys } from "@/hooks/useHotkeys";
import { FilterDropdownContent } from "./FilterDropdownContent";

/**
 * Filter type matching the reading status values:
 * - 'all': Show everything (unread, in_progress, read, non-archived)
 * - 'unread': reading_status = 'unread'
 * - 'in_progress': reading_status = 'in_progress'
 * - 'read': reading_status = 'read'
 * - 'archived': is_archived = true (regardless of reading status)
 */
type FilterType = "all" | "unread" | "in_progress" | "read" | "archived";

const CACHE_KEY = "contentListCache";
const CACHE_DURATION = 30000; // 30 seconds

export interface ContentListRef {
  addNewItem: (item: ContentItemType) => void;
}

const ContentList = forwardRef<ContentListRef>((props, ref) => {
  // Toast context for showing success/error messages
  const { incrementListCount, decrementListCount } = useLists();

  // Get URL search params to read filter from URL
  const searchParams = useSearchParams();

  // Helper to get cached data from sessionStorage
  const getCachedData = () => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      const data = JSON.parse(cached);
      const now = Date.now();
      if (data.timestamp && now - data.timestamp < CACHE_DURATION) {
        return data;
      }
      // Cache expired
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    } catch {
      return null;
    }
  };

  // Helper to set cached data in sessionStorage
  const setCachedData = (items: ContentItemType[], total: number) => {
    try {
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          items,
          total,
          timestamp: Date.now(),
        }),
      );
    } catch {
      // Silently fail if sessionStorage is full
    }
  };

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

  // Filter dropdown state
  const [filterOpen, setFilterOpen] = useState(false);

  // Tag filter state
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<
    Array<{ tag: string; count: number }>
  >([]);

  /**
   * Expose method to parent component for adding new items optimistically
   */
  useImperativeHandle(ref, () => ({
    addNewItem: (newItem: ContentItemType) => {
      // Add to the beginning of the list (most recent first)
      setContents((prev) => [newItem, ...prev]);
      setTotal((prev) => prev + 1);

      // Clear cache so next fetch is fresh
      sessionStorage.removeItem(CACHE_KEY);
    },
  }));

  /**
   * useEffect Hook - Runs when component mounts (empty dependency array [])
   * This is where we fetch data from the API on initial page load
   */

  useEffect(() => {
    fetchContents();
    fetchAvailableLists();
    fetchAvailableTags();
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard navigation state
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const router = useRouter();

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [filter, contents]);

  // Handle hotkeys
  useHotkeys({
    j: () => {
      setSelectedIndex((prev) => {
        const next = Math.min(prev + 1, filteredContents.length - 1);
        scrollToIndex(next);
        return next;
      });
    },
    k: () => {
      setSelectedIndex((prev) => {
        const next = Math.max(prev - 1, 0);
        scrollToIndex(next);
        return next;
      });
    },
    enter: () => {
      if (selectedIndex >= 0 && selectedIndex < filteredContents.length) {
        const item = filteredContents[selectedIndex];
        // Match click logic
        sessionStorage.setItem(
          "contentListScrollPos",
          window.scrollY.toString(),
        );
        router.push(`/content/${item.id}`);
      }
    },
  });

  const scrollToIndex = (index: number) => {
    // Simple logic to scroll element into view if needed
    // We rely on ID matching logic or just heuristics
    // Since we don't hold refsArray easily (without refactoring), we use DOM selector
    if (index < 0) return;
    setTimeout(() => {
      const el = document.getElementById(`content-item-${index}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 0);
  };

  /**
   * Restore scroll position when navigating back
   * Scroll position is saved by ContentItem when user clicks to navigate
   */
  useEffect(() => {
    // Disable browser's automatic scroll restoration
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // Restore scroll position on mount
    const savedScrollPos = sessionStorage.getItem("contentListScrollPos");
    if (savedScrollPos) {
      const scrollY = parseInt(savedScrollPos, 10);

      // Immediate scroll
      window.scrollTo(0, scrollY);

      // Delayed fallback to ensure it works after DOM renders
      setTimeout(() => {
        window.scrollTo(0, scrollY);
        sessionStorage.removeItem("contentListScrollPos");
      }, 100);
    }
  }, []); // Only run on mount

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
      // Toast removed
    } else if (updatedItem.processing_status === "failed") {
      // Toast removed
    }
  });

  /**
   * Fetches content from the backend API
   * Uses the contentAPI.getAll() helper from lib/api.ts
   * Backend returns: { items: ContentItem[], total: number, skip: number, limit: number }
   *
   * Now includes caching to avoid unnecessary refetches on navigation
   */
  const fetchContents = async () => {
    try {
      // Check if we have fresh cached data
      const cachedData = getCachedData();
      if (cachedData) {
        // Use cached data
        setContents(cachedData.items);
        setTotal(cachedData.total);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      // Call the backend API - this returns the paginated response
      const response = await contentAPI.getAll();

      // Backend returns { items, total, skip, limit }
      setContents(response.items);
      setTotal(response.total);

      // Update cache
      setCachedData(response.items, response.total);
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
   * Fetches available tags for filtering
   * Uses the contentAPI.getTags() helper from lib/api.ts
   */
  const fetchAvailableTags = async () => {
    try {
      const tags = await contentAPI.getTags();
      setAvailableTags(tags);
    } catch (err) {
      console.error("Failed to fetch available tags:", err);
      // Silently fail - tag filtering still works without counts
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
      setContents((prevContents) =>
        prevContents.map((content) =>
          content.id === id ? { ...content, ...updates } : content,
        ),
      );

      // Call the backend to persist the change - get the updated item
      const updatedContent = await contentAPI.update(id, updates);

      // Update with the backend response to ensure reading_status is correct
      setContents((prevContents) => {
        const updated = prevContents.map((content) =>
          content.id === id ? updatedContent : content,
        );
        // Update cache
        setCachedData(updated, total);
        return updated;
      });
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
    } catch (err) {
      console.error("Failed to delete content:", err);
      // Restore on error
      setContents(previousContents);
      setTotal(total + 1);
      setError("Failed to delete item. Please try again.");
    }
  };

  /**
   * Handles updating a content item
   * Updates the item in the contents list when properties change
   */
  const handleUpdate = (updatedContent: ContentItemType) => {
    setContents((prevContents) => {
      const updated = prevContents.map((content) =>
        content.id === updatedContent.id ? updatedContent : content,
      );
      // Update cache
      setCachedData(updated, total);
      return updated;
    });
    // Refresh tags to show new ones or update counts
    fetchAvailableTags();
  };

  /**
   * Handles adding a content item to a list
   */
  const handleAddToList = async (contentId: string, listId: string) => {
    try {
      // Optimistic update - increment count immediately
      incrementListCount(listId);

      await listsAPI.addContent(listId, [contentId]);
    } catch (err) {
      console.error("Failed to add to list:", err);
      // Revert on error - decrement count back
      decrementListCount(listId);
    }
  };

  /**
   * Client-side filtering based on reading_status and optional tag
   * Uses reading_status computed field from backend and tags array
   */
  const filteredContents = (
    contents && Array.isArray(contents) ? contents : []
  ).filter((content) => {
    // First filter by reading status
    let matchesStatus = false;
    switch (filter) {
      case "unread":
        matchesStatus = content.reading_status === "unread";
        break;
      case "in_progress":
        matchesStatus = content.reading_status === "in_progress";
        break;
      case "read":
        matchesStatus = content.reading_status === "read";
        break;
      case "archived":
        matchesStatus = content.reading_status === "archived";
        break;
      default: // 'all'
        matchesStatus = content.reading_status !== "archived"; // Show all non-archived items
    }

    // Then filter by tag if any are selected
    if (!matchesStatus) return false;
    if (selectedTags.length > 0) {
      // Show content that has AT LEAST ONE of the selected tags matching (OR logic)
      return (content.tags || []).some((tag) => selectedTags.includes(tag));
    }
    return true;
  });

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

      {/* Contextual Filter Row */}
      <div className="flex items-baseline pl-0 gap-1.5 text-xs text-[var(--color-text-faint)] uppercase tracking-wider mb-4 relative z-20">
        <span>Showing</span>

        <div className="relative inline-block">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="compact-touch font-medium text-[var(--color-text-primary)] border-b border-dotted border-[var(--color-text-secondary)] hover:border-[var(--color-text-primary)] hover:border-solid transition-all flex items-center gap-1 pb-0.5"
          >
            <span className="flex items-center gap-1 lowercase">
              {filter.replace("_", " ")}
              {selectedTags.length > 0 && (
                <>
                  <span className="text-[var(--color-text-muted)]">•</span>
                  <span className="text-[var(--color-accent)]">
                    {selectedTags.map((t) => `#${t}`).join(", ")}
                  </span>
                </>
              )}
            </span>
            <svg
              className={`w-3 h-3 transition-transform ${filterOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="square"
                strokeLinejoin="miter"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {filterOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setFilterOpen(false)}
              />
              <div className="absolute left-0 top-full mt-1 w-64 bg-[var(--color-bg-primary)] border border-[var(--color-border)] shadow-lg z-20 flex flex-col">
                <FilterDropdownContent
                  currentFilter={filter}
                  currentTags={selectedTags}
                  availableTags={availableTags}
                  onSelectFilter={() => setFilterOpen(false)}
                  onToggleTag={(tag) => {
                    setSelectedTags((prev) => {
                      if (prev.includes(tag)) {
                        return prev.filter((t) => t !== tag);
                      }
                      if (prev.length >= 3) return prev;
                      return [...prev, tag];
                    });
                  }}
                  onClearTags={() => setSelectedTags([])}
                />
              </div>
            </>
          )}
        </div>

        <span>
          ({filteredContents.length} / {total} items)
        </span>
      </div>

      {/* Content items list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RetroLoader
            text="Finding your articles"
            className="text-sm text-[var(--color-accent)]"
          />
        </div>
      ) : filteredContents.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-text-muted)]">
          <p className="text-sm">
            {filter === "all"
              ? "No content yet. Add your first article above!"
              : `No ${filter} items.`}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: Card layout */}
          <div className="sm:hidden grid gap-4">
            {filteredContents.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                availableLists={availableLists}
                onAddToList={(listId) => handleAddToList(content.id, listId)}
              />
            ))}
          </div>

          {/* Desktop: List layout */}
          <div className="hidden sm:block divide-y divide-[var(--color-border-subtle)]">
            {filteredContents.map((content, idx) => (
              <ContentItem
                key={content.id}
                id={`content-item-${idx}`}
                isSelected={idx === selectedIndex}
                content={content}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                availableLists={availableLists}
                onAddToList={(listId) => handleAddToList(content.id, listId)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
});

ContentList.displayName = "ContentList";

export default ContentList;
