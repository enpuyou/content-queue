"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ContentItem as ContentItemType } from "@/types";
import ConfirmModal from "./ConfirmModal";
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
   * Get a display-friendly status based on is_read and is_archived
   * Returns both the label and color classes for the badge
   */
  const getStatusDisplay = () => {
    if (content.is_archived) {
      return { label: "Archived", colors: "bg-gray-100 text-gray-800" };
    }
    if (content.is_read) {
      return { label: "Read", colors: "bg-green-100 text-green-800" };
    }
    return { label: "Unread", colors: "bg-blue-100 text-blue-800" };
  };

  /**
   * Get processing status badge (when content is being extracted)
   * Shows: pending, processing, completed, or failed
   */
  const getProcessingBadge = () => {
    if (content.processing_status === "completed") return null;

    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-purple-100 text-purple-800",
      failed: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${colors[content.processing_status] || "bg-gray-100"}
        ${content.processing_status === "processing" ? "animate-pulse" : ""}
        ${content.processing_status === "pending" ? "animate-pulse" : ""}`}
      >
        {content.processing_status}
      </span>
    );
  };

  /**
   * Handle adding/removing tags
   */
  const handleUpdateTags = async (newTags: string[]) => {
    try {
      await contentAPI.update(content.id, { tags: newTags } as any);
      showToast("Tags updated successfully", "success");
      // The parent component should re-fetch to show updated tags
      window.location.reload(); // Simple solution for now
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

  const status = getStatusDisplay();

  return (
    <div className="group border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
      <div className="flex items-start gap-4">
        {/* Left side: Content info */}
        <div className="flex-1 min-w-0">
          {/* Status badges, date, and inline action icons */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${status.colors}`}
            >
              {status.label}
            </span>
            {getProcessingBadge()}
            <span className="text-xs text-gray-500">
              {formatDate(content.created_at)}
            </span>

            {/* Reading time - only show if available */}
            {content.reading_time_minutes && (
              <span className="text-xs text-gray-500">
                · {content.reading_time_minutes} min read
              </span>
            )}

            {/* Tags - display and edit */}
            {(content.tags && content.tags.length > 0) || isEditingTags ? (
              <>
                <span className="text-xs text-gray-400">·</span>
                {content.tags &&
                  content.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1"
                    >
                      {tag}
                      {isEditingTags && (
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="text-red-500 hover:text-red-700 ml-1"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}

                {/* Tag Input */}
                {isEditingTags && (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="Add tag..."
                      className="px-2 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      onClick={handleAddTag}
                      className="text-xs px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingTags(false);
                        setTagInput("");
                      }}
                      className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Done
                    </button>
                  </div>
                )}
              </>
            ) : null}

            {/* Edit Tags Button - show when not editing */}
            {!isEditingTags && (
              <button
                onClick={() => setIsEditingTags(true)}
                className="text-xs text-blue-600 hover:text-blue-800 px-2 py-0.5"
              >
                + Tag
              </button>
            )}

            {/* Inline action icons - appear on card hover */}
            <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Mark as read/unread */}
              <button
                onClick={() => onStatusChange(content.id, { is_read: !content.is_read })}
                className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                title={content.is_read ? "Mark as unread" : "Mark as read"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>

              {/* Archive/Unarchive */}
              <button
                onClick={() => onStatusChange(content.id, { is_archived: !content.is_archived })}
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title={content.is_archived ? "Unarchive" : "Archive"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </button>

              {/* Add to list - with dropdown */}
              {availableLists && availableLists.length > 0 && onAddToList && (
                <div className="relative">
                  <button
                    onClick={() => setShowListDropdown(!showListDropdown)}
                    className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                    title="Add to list"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>

                  {/* List dropdown */}
                  {showListDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowListDropdown(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
                        <div className="py-1">
                          {availableLists.map((list) => (
                            <button
                              key={list.id}
                              onClick={() => {
                                onAddToList(list.id);
                                setShowListDropdown(false);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
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

              {/* Remove from list (only show when in a list detail page) */}
              {onRemoveFromList && (
                <button
                  onClick={onRemoveFromList}
                  className="p-1 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                  title="Remove from list"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {/* Delete */}
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Title - clickable, links to reader view */}
          <Link href={`/content/${content.id}`} className="block">
            <h3 className="text-lg font-semibold text-gray-900 mb-1 hover:text-blue-600 transition-colors">
              {content.title || "Untitled"}
            </h3>
          </Link>

          {/* Description (if available from metadata extraction) */}
          {content.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {content.description}
            </p>
          )}
        </div>

        {/* Right side: Thumbnail (if available) - aligned to top */}
        {content.thumbnail_url && (
          <div className="flex-shrink-0 hidden sm:block">
            <img
              src={content.thumbnail_url}
              alt=""
              className="w-24 h-24 object-cover rounded-md"
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
