/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { contentAPI, listsAPI } from "@/lib/api";
import { ContentItem } from "@/types";
import { useToast } from "@/contexts/ToastContext";
import { useLists } from "@/contexts/ListsContext";

interface AddContentToListModalProps {
  isOpen: boolean;
  listId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddContentToListModal({
  isOpen,
  listId,
  onClose,
  onSuccess,
}: AddContentToListModalProps) {
  const { showToast } = useToast();
  const { incrementListCount, decrementListCount } = useLists();
  const [allContent, setAllContent] = useState<ContentItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all user's content when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAllContent();
      setSelectedIds(new Set());
      setSearchQuery("");
    }
  }, [isOpen]);

  const fetchAllContent = async () => {
    try {
      setFetching(true);
      const data = await contentAPI.getAll();
      setAllContent(data.items || []);
    } catch (error) {
      console.error("Failed to fetch content:", error);
      showToast("Failed to load content", "error");
    } finally {
      setFetching(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) {
      showToast("Please select at least one item", "error");
      return;
    }

    const itemCount = selectedIds.size;

    try {
      setLoading(true);
      // Optimistic update - increment count by number of items being added
      for (let i = 0; i < itemCount; i++) {
        incrementListCount(listId);
      }

      await listsAPI.addContent(listId, Array.from(selectedIds));
      showToast(`Added ${itemCount} item(s) to list`, "success");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to add content to list:", error);
      // Revert on error - decrement count back
      for (let i = 0; i < itemCount; i++) {
        decrementListCount(listId);
      }
      showToast("Failed to add content to list", "error");
    } finally {
      setLoading(false);
    }
  };

  // Filter content by search query
  const filteredContent = allContent.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.title?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.original_url.toLowerCase().includes(query)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Add Content to List
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Search input */}
          <input
            type="text"
            placeholder="Search your content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6">
          {fetching ? (
            <div className="text-center py-8 text-gray-500">
              Loading content...
            </div>
          ) : filteredContent.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery
                ? "No content matches your search"
                : "No content available"}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredContent.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleToggleSelect(item.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedIds.has(item.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className="flex-shrink-0 mt-1">
                      <div
                        className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                          selectedIds.has(item.id)
                            ? "bg-blue-600 border-blue-600"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedIds.has(item.id) && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Thumbnail */}
                    {item.thumbnail_url && (
                      <img
                        src={item.thumbnail_url}
                        alt=""
                        className="w-16 h-16 object-cover rounded flex-shrink-0"
                      />
                    )}

                    {/* Content info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 line-clamp-1">
                        {item.title || "Untitled"}
                      </h3>
                      {item.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        {item.reading_time_minutes && (
                          <span>{item.reading_time_minutes} min read</span>
                        )}
                        {item.is_read && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">
                            Read
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""}{" "}
              selected
            </span>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || selectedIds.size === 0}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Adding..." : `Add to List`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
