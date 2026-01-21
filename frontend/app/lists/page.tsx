"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { listsAPI } from "@/lib/api";
import ListModal from "@/components/ListModal";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLists } from "@/contexts/ListsContext";
import Link from "next/link";

// Type for list with content count (from backend)
interface ListWithCount {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
  content_count: number;
}

export default function ListsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { logout } = useAuth();
  const { listCounts, setListCount } = useLists();

  const [lists, setLists] = useState<ListWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<ListWithCount | null>(null);
  const [deletingList, setDeletingList] = useState<ListWithCount | null>(null);

  // Fetch lists on component mount
  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listsAPI.getAll();
      setLists(data);

      // Populate the context with current counts
      data.forEach((list: ListWithCount) => {
        setListCount(list.id, list.content_count);
      });
    } catch (err) {
      console.error("Failed to fetch lists:", err);
      setError("Failed to load lists. Please try again.");
      showToast("Failed to load lists", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleListClick = (listId: string) => {
    router.push(`/lists/${listId}`);
  };

  const handleDeleteList = async (listId: string) => {
    try {
      await listsAPI.delete(listId);
      showToast("List deleted successfully", "success");
      setDeletingList(null);
      fetchLists(); // Refresh the list
    } catch (err) {
      console.error("Failed to delete list:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete list";
      showToast(errorMessage, "error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Navigation Header */}
        <nav className="bg-white shadow-sm mb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link
                href="/dashboard"
                className="text-2xl font-bold text-gray-900"
              >
                Content Queue
              </Link>

              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  href="/lists"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Lists
                </Link>
                <button
                  className="text-gray-600 hover:text-gray-900"
                  onClick={logout}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-6xl mx-auto p-6">
          <div className="text-center py-12">
            <div className="text-gray-500">Loading your lists...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              href="/dashboard"
              className="text-2xl font-bold text-gray-900"
            >
              Content Queue
            </Link>

            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/lists"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Lists
              </Link>
              <button
                className="text-gray-600 hover:text-gray-900"
                onClick={logout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Lists</h1>
            <p className="text-gray-600 mt-1">
              Organize your reading queue into collections
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            + Create New List
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Empty state */}
        {lists.length === 0 && !loading && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No lists yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first list to organize your content
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Your First List
            </button>
          </div>
        )}

        {/* Lists grid */}
        {lists.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lists.map((list) => (
              <div
                key={list.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleListClick(list.id)}
              >
                {/* List header */}
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {list.name}
                  </h3>
                  {list.is_shared && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Shared
                    </span>
                  )}
                </div>

                {/* Description */}
                {list.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {list.description}
                  </p>
                )}

                {/* Content count */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-sm text-gray-500">
                    {listCounts[list.id] ?? list.content_count}{" "}
                    {(listCounts[list.id] ?? list.content_count) === 1
                      ? "item"
                      : "items"}
                  </span>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingList(list);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingList(list);
                      }}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit List Modal */}
      <ListModal
        isOpen={isCreateModalOpen || editingList !== null}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingList(null);
        }}
        onSuccess={() => {
          fetchLists();
        }}
        list={editingList || undefined}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deletingList !== null}
        title="Delete List"
        message={`Are you sure you want to delete "${deletingList?.name}"? This will not delete the content items, just the list itself.`}
        confirmText="Delete List"
        cancelText="Cancel"
        danger={true}
        onConfirm={() => {
          if (deletingList) {
            handleDeleteList(deletingList.id);
          }
        }}
        onCancel={() => setDeletingList(null)}
      />
    </div>
  );
}
