/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ContentItem as ContentItemType } from "@/types";
import ConfirmModal from "./ConfirmModal";
import StatusIndicator from "./StatusIndicator";
import { contentAPI } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

/**
 * Props for ContentItem component
 *
 * onStatusChange: Called when user clicks read/unread or archive/unarchive
 *   - Receives the item id and an object with the fields to update
 *   - Example: onStatusChange('123', { is_read: true })
 *
 * onDelete: Called when user clicks delete button
 */
interface ContentItemProps {
  content: ContentItemType;
  onStatusChange: (
    id: string,
    updates: { is_read?: boolean; is_archived?: boolean },
  ) => void;
  onDelete: (id: string) => void;
  // Called when content is updated (e.g., tags change)
  onUpdate?: (updatedContent: ContentItemType) => void;
  // Optional: for list detail page
  onRemoveFromList?: () => void;
  // Optional: for adding to lists
  availableLists?: Array<{ id: string; name: string }>;
  onAddToList?: (listId: string) => void;
}

export default function ContentItem({
  content,
  onStatusChange,
  onDelete,
  onUpdate,
  onRemoveFromList,
  availableLists,
  onAddToList,
}: ContentItemProps) {
  /**
   * Hydration fix: Only render relative dates on the client side
   * Server and client would calculate different "now" times, causing mismatch
   */
  const [mounted, setMounted] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showListDropdown, setShowListDropdown] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * Format relative date (Today, Yesterday, X days ago, or full date)
   * This is a common pattern - you'll see this in many apps
   */
  const formatDate = (dateString: string) => {
    // Before hydration, show a stable format to avoid mismatch
    if (!mounted) {
      return new Date(dateString).toISOString().split("T")[0];
    }

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toISOString().split("T")[0];
  };

  /**
   * Handle adding/removing tags
   */
  const handleUpdateTags = async (newTags: string[]) => {
    try {
      const updatedContent = await contentAPI.update(content.id, {
        tags: newTags,
      });
      showToast("Tags updated successfully", "success");
      // Notify parent component of the update
      if (onUpdate) {
        onUpdate(updatedContent);
      }
    } catch (error) {
      console.error("Failed to update tags:", error);
      showToast("Failed to update tags", "error");
    }
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;

    const currentTags = content.tags || [];
    if (currentTags.includes(tagInput.trim())) {
      showToast("Tag already exists", "error");
      return;
    }

    const newTags = [...currentTags, tagInput.trim()];
    handleUpdateTags(newTags);
    setTagInput("");
    setIsEditingTags(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = content.tags || [];
    const newTags = currentTags.filter((tag) => tag !== tagToRemove);
    handleUpdateTags(newTags);
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.tagName === "BUTTON" ||
      target.tagName === "INPUT" ||
      target.tagName === "A" ||
      target.closest("button") ||
      target.closest("input") ||
      target.closest("a")
    ) {
      return;
    }
    // Save scroll position before navigating
    sessionStorage.setItem("contentListScrollPos", window.scrollY.toString());
    // Navigate to reader using Next.js router (preserves cache)
    router.push(`/content/${content.id}`);
  };

  return (
    <div
      onClick={handleContainerClick}
      className="group py-6 px-4 border-b border-[var(--color-border-subtle)] last:border-b-0 transition-all duration-300 cursor-pointer hover:bg-[var(--color-bg-secondary)]"
    >
      <div className="flex items-start gap-4">
        {/* Left side: Content info */}
        <div className="flex-1 min-w-0">
          {/* Metadata: status, date, reading time */}
          <div className="flex items-center gap-3 mb-2 text-xs text-[var(--color-text-muted)]">
            <StatusIndicator readingStatus={content.reading_status} />
            <span className="tracking-wide">
              {formatDate(content.created_at)}
            </span>
            {content.reading_time_minutes && (
              <>
                <span>·</span>
                <span>{content.reading_time_minutes} min read</span>
              </>
            )}
          </div>

          {/* Title - clickable, links to reader view */}
          <Link
            href={`/content/${content.id}`}
            className="block mb-2"
            onClick={() => {
              sessionStorage.setItem(
                "contentListScrollPos",
                window.scrollY.toString(),
              );
            }}
          >
            <h3 className="font-serif text-xl font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors">
              {content.title || "Untitled"}
            </h3>
          </Link>

          {/* Description (if available from metadata extraction) */}
          {content.description && (
            <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-3 leading-relaxed">
              {content.description}
            </p>
          )}

          {/* Tags - display and edit */}
          {content.tags && content.tags.length > 0 && (
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              {content.tags.map((tag, index) => (
                <span
                  key={index}
                  className="text-xs text-[var(--color-text-muted)] border-b border-[var(--color-border)] pb-0.5 flex items-center gap-1"
                >
                  {tag}
                  {isEditingTags && (
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] ml-1"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}

              {/* Tag Input - only show when editing */}
              {isEditingTags && (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Add tag..."
                    className="px-2 py-0.5 text-xs border-0 border-b border-[var(--color-border)] bg-transparent rounded-none focus:outline-none focus:border-[var(--color-accent)]"
                    autoFocus
                  />
                  <button
                    onClick={handleAddTag}
                    className="text-xs px-2 py-0.5 bg-[var(--color-accent)] text-white rounded-none hover:bg-[var(--color-accent-hover)]"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingTags(false);
                      setTagInput("");
                    }}
                    className="text-xs px-2 py-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tag Input for items with no tags - only show when editing */}
          {(!content.tags || content.tags.length === 0) && isEditingTags && (
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add tag..."
                  className="px-2 py-0.5 text-xs border-0 border-b border-[var(--color-border)] bg-transparent rounded-none focus:outline-none focus:border-[var(--color-accent)]"
                  autoFocus
                />
                <button
                  onClick={handleAddTag}
                  className="text-xs px-2 py-0.5 bg-[var(--color-accent)] text-white rounded-none hover:bg-[var(--color-accent-hover)]"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setIsEditingTags(false);
                    setTagInput("");
                  }}
                  className="text-xs px-2 py-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Action buttons - appear on hover */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap">
            {/* Mark as read/unread */}
            <button
              onClick={() =>
                onStatusChange(content.id, { is_read: !content.is_read })
              }
              className="text-xs px-2 py-1 rounded-none bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
              title={content.is_read ? "Mark as unread" : "Mark as read"}
            >
              {content.is_read ? "Unread" : "Read"}
            </button>

            {/* Archive/Unarchive */}
            <button
              onClick={() =>
                onStatusChange(content.id, {
                  is_archived: !content.is_archived,
                })
              }
              className="text-xs px-2 py-1 rounded-none bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
              title={content.is_archived ? "Unarchive" : "Archive"}
            >
              {content.is_archived ? "Unarchive" : "Archive"}
            </button>

            {/* Add to list - with dropdown */}
            {availableLists && availableLists.length > 0 && onAddToList && (
              <div className="relative">
                <button
                  onClick={() => setShowListDropdown(!showListDropdown)}
                  className="text-xs px-2 py-1 rounded-none bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
                  title="Add to list"
                >
                  + List
                </button>

                {/* List dropdown */}
                {showListDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowListDropdown(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-none shadow-lg z-20 max-h-60 overflow-y-auto">
                      <div className="py-1">
                        {availableLists.map((list) => (
                          <button
                            key={list.id}
                            onClick={() => {
                              onAddToList(list.id);
                              setShowListDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
                          >
                            {list.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Add Tag button */}
            <button
              onClick={() => setIsEditingTags(true)}
              className="text-xs px-2 py-1 rounded-none bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
              title="Add tag"
            >
              + Tag
            </button>

            {/* Remove from list (only show when in a list detail page) */}
            {onRemoveFromList && (
              <button
                onClick={onRemoveFromList}
                className="text-xs px-2 py-1 rounded-none bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
                title="Remove from list"
              >
                Remove
              </button>
            )}

            {/* Delete */}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="text-xs px-2 py-1 rounded-none bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              title="Delete"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Right side: Thumbnail (if available) - right-aligned, smaller */}
        {content.thumbnail_url && (
          <div className="flex-shrink-0 hidden sm:block">
            <img
              src={content.thumbnail_url}
              alt={content.title || "thumbnail"}
              className="w-20 h-20 object-cover opacity-80 hover:opacity-100 transition-opacity"
            />
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Article"
        message="Are you sure you want to delete this article? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        danger={true}
        onConfirm={async () => {
          setShowDeleteModal(false);
          onDelete(content.id);
        }}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
