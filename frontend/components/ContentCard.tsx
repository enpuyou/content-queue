/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ContentItem as ContentItemType } from "@/types";
import StatusIndicator from "./StatusIndicator";
import MobileActionsMenu from "./MobileActionsMenu";
import ConfirmModal from "./ConfirmModal";
import { contentAPI } from "@/lib/api";
import RetroLoader from "./RetroLoader";

interface ContentCardProps {
  content: ContentItemType;
  onStatusChange: (
    id: string,
    updates: { is_read?: boolean; is_archived?: boolean },
  ) => void;
  onDelete: (id: string) => void;
  onUpdate?: (updatedContent: ContentItemType) => void;
  onRemoveFromList?: () => void;
  availableLists?: Array<{ id: string; name: string }>;
  onAddToList?: (listId: string) => void;
  returnPath?: string; // Path to return to when clicking back from reader
  isRemoving?: boolean;
}

export default function ContentCard({
  content,
  onStatusChange,
  onDelete,
  onUpdate,
  onRemoveFromList,
  availableLists,
  onAddToList,
  returnPath,
  isRemoving = false,
}: ContentCardProps) {
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAddTag = async () => {
    if (!tagInput.trim()) return;

    try {
      const updatedTags = [...(content.tags || []), tagInput.trim()];
      const updated = await contentAPI.update(content.id, {
        tags: updatedTags,
      });
      if (onUpdate) {
        onUpdate(updated);
      }
      setTagInput("");
    } catch (error) {
      console.error("Failed to add tag:", error);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    try {
      const updatedTags = (content.tags || []).filter((t) => t !== tagToRemove);
      const updated = await contentAPI.update(content.id, {
        tags: updatedTags,
      });
      if (onUpdate) {
        onUpdate(updated);
      }
    } catch (error) {
      console.error("Failed to remove tag:", error);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on action buttons or links
    if (
      (e.target as HTMLElement).closest("button") ||
      (e.target as HTMLElement).closest("a")
    ) {
      return;
    }
    // Save scroll position and return path before navigating
    sessionStorage.setItem("contentListScrollPos", window.scrollY.toString());
    if (returnPath) {
      sessionStorage.setItem("readerReturnPath", returnPath);
    }
    router.push(`/content/${content.id}`);
  };

  // Show processing states with helpful messages
  const isProcessing =
    content.processing_status === "pending" ||
    content.processing_status === "processing";
  const hasFailed = content.processing_status === "failed";

  // Check if content was added within last 10 minutes
  const isJustAdded = () => {
    if (!mounted) return false;
    const now = new Date();
    const createdAt = new Date(content.created_at);
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    return diffMinutes < 10;
  };

  return (
    <div
      onClick={handleCardClick}
      className="block p-4 border border-[var(--color-border)] transition-colors hover:border-[var(--color-accent)] cursor-pointer bg-[var(--color-bg-primary)] relative"
    >
      {/* Retro Removing Overlay */}
      {isRemoving && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-[var(--color-bg-primary)]/90 font-mono text-sm text-[var(--color-accent)]">
          <span className="animate-pulse">Removing...</span>
          <span className="inline-block w-2.5 h-4 bg-[var(--color-accent)] ml-1 animate-pulse"></span>
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        {content.thumbnail_url && (
          <img
            src={content.thumbnail_url}
            alt=""
            className="w-20 h-20 object-cover flex-shrink-0 opacity-80"
          />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Processing Status Badge */}
          {isProcessing && (
            <div className="flex items-center gap-2 mb-2">
              <RetroLoader
                text={
                  content.processing_status === "pending"
                    ? "Finding your article"
                    : "Preparing your article"
                }
                className="text-xs text-[var(--color-text-muted)] italic"
              />
            </div>
          )}

          {/* Status and metadata */}
          {!isProcessing && (
            <div className="flex items-center gap-2 mb-2 text-xs text-[var(--color-text-muted)]">
              {hasFailed ? (
                <>
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></span>
                  <span className="text-xs px-2 py-0.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                    Failed to extract
                  </span>
                </>
              ) : (
                <StatusIndicator readingStatus={content.reading_status} />
              )}
              {isJustAdded() ? (
                <span>Just now</span>
              ) : (
                <span>
                  {mounted
                    ? new Date(content.created_at).toLocaleDateString()
                    : new Date(content.created_at).toISOString().split("T")[0]}
                </span>
              )}
              {content.reading_time_minutes && (
                <>
                  <span>·</span>
                  <span>{content.reading_time_minutes} min read</span>
                </>
              )}
            </div>
          )}

          {/* Title */}
          <h3 className="font-serif text-lg font-medium text-[var(--color-text-primary)] mb-1 line-clamp-2">
            {(() => {
              // Show helpful title based on state
              if (content.title) {
                return content.title;
              }
              if (hasFailed) {
                return "We couldn't load your article";
              }
              return "Untitled";
            })()}
          </h3>

          {/* Description */}
          {/* Description / Failed link */}
          {content.description && !isProcessing && !hasFailed ? (
            <p className="text-sm text-[var(--color-text-muted)] line-clamp-2 mb-2">
              {content.description}
            </p>
          ) : isProcessing ? null : hasFailed ? (
            <p className="text-sm text-[var(--color-text-muted)] line-clamp-2 mb-2">
              <a
                href={content.original_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-accent)] hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                View original
              </a>
            </p>
          ) : null}

          {/* Tags */}
          {content.tags && content.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {content.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="text-xs text-[var(--color-text-muted)] border-b border-[var(--color-border)] pb-0.5 flex items-center gap-1"
                >
                  {tag}
                  {isEditingTags && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveTag(tag);
                      }}
                      className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] ml-1"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
              {content.tags.length > 3 && (
                <span className="text-xs text-[var(--color-text-faint)]">
                  +{content.tags.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Tag editing UI */}
          {isEditingTags && (
            <div className="mb-2 flex items-center gap-2 flex-wrap">
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
                className="px-2 py-1 text-xs border border-[var(--color-border)] bg-transparent focus:outline-none focus:border-[var(--color-accent)] flex-1 min-w-[100px]"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddTag();
                }}
                className="text-xs px-2 py-1 bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]"
              >
                Add
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingTags(false);
                  setTagInput("");
                }}
                className="text-xs px-2 py-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                Done
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-2">
            <div className="text-xs text-[var(--color-text-faint)]">
              {new Date(content.created_at).toLocaleDateString()}
            </div>
            <MobileActionsMenu
              onRead={() =>
                onStatusChange(content.id, { is_read: !content.is_read })
              }
              onArchive={() =>
                onStatusChange(content.id, {
                  is_archived: !content.is_archived,
                })
              }
              onAddTag={() => setIsEditingTags(true)}
              onDelete={() => setShowDeleteModal(true)}
              onAddToList={
                availableLists && availableLists.length > 0 && onAddToList
                  ? (listId) => onAddToList(listId)
                  : undefined
              }
              onRemoveFromList={onRemoveFromList}
              isRead={content.is_read}
              isArchived={content.is_archived}
              availableLists={availableLists}
            />
          </div>
        </div>
      </div>
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Article"
        message="This action cannot be undone."
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
