"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { listsAPI, contentAPI } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import ContentItem from "@/components/ContentItem";
import AddContentToListModal from "@/components/AddContentToListModal";
import { ContentItem as ContentItemType } from "@/types";

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

  const listId = params.id as string;

  const [list, setList] = useState<ListDetail | null>(null);
  const [contents, setContents] = useState<ContentItemType[]>([]);
  const [isAddContentModalOpen, setIsAddContentModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch list details and content
  useEffect(() => {
    fetchListAndContent();
  }, [listId]);

  const fetchListAndContent = async () => {
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
  };

  const handleRemoveFromList = async (contentId: string) => {
    const previousContents = [...contents];

    try {
      // Optimistic update - remove from UI immediately
      setContents(contents.filter((c) => c.id !== contentId));

      // Call API to remove from list
      await listsAPI.removeContent(listId, [contentId]);
      showToast("Removed from list", "success");
    } catch (err) {
      console.error("Failed to remove from list:", err);
      // Revert on error
      setContents(previousContents);
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
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-gray-500">Loading list...</div>
        </div>
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            List Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            {error || "This list could not be loaded."}
          </p>
          <button
            onClick={() => router.push("/lists")}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Lists
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        {/* Back button */}
        <button
          onClick={() => router.push("/lists")}
          className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
        >
          ← Back to Lists
        </button>

        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{list.name}</h1>
              {list.is_shared && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Shared
                </span>
              )}
            </div>
            {list.description && (
              <p className="text-gray-600 mt-2">{list.description}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              {contents.length} {contents.length === 1 ? "item" : "items"}
            </p>
          </div>

          {/* Add Content button - will implement in next step */}
          <button
            onClick={() => setIsAddContentModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            + Add Content
          </button>
        </div>
      </div>

      {/* Empty state */}
      {contents.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No content yet
          </h3>
          <p className="text-gray-600 mb-6">
            Add articles to this list to get started
          </p>
          <button
            onClick={() => setIsAddContentModalOpen(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Your First Item
          </button>
        </div>
      )}

      {/* Content list */}
      {contents.length > 0 && (
        <div className="space-y-4">
          {contents.map((content) => (
            <ContentItem
              key={content.id}
              content={content}
              onStatusChange={(updates) =>
                handleStatusChange(content.id, updates)
              }
              onDelete={handleDelete}
              onRemoveFromList={() => handleRemoveFromList(content.id)}
            />
          ))}
        </div>
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
  );
}
