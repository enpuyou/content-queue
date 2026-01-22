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
      <div className="min-h-screen bg-[var(--color-bg-primary)]">
        {/* Navigation Header */}
        <nav className="sticky top-0 z-40 bg-[var(--color-bg-primary)] border-b border-[var(--color-border)] mb-6">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link
                href="/dashboard"
                className="font-serif text-2xl font-normal text-[var(--color-text-primary)]"
              >
                Content Queue
              </Link>

              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] px-3 py-2 rounded-none text-sm transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/lists"
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] px-3 py-2 rounded-none text-sm transition-colors border-b-2 border-[var(--color-accent)]"
                >
                  Lists
                </Link>
                <button
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                  onClick={logout}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-[var(--color-text-muted)]">Loading your lists...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Navigation Header */}
      <nav className="sticky top-0 z-40 bg-[var(--color-bg-primary)] border-b border-[var(--color-border)] mb-6">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              href="/dashboard"
              className="font-serif text-2xl font-normal text-[var(--color-text-primary)]"
            >
              Content Queue
            </Link>

            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] px-3 py-2 rounded-none text-sm transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/lists"
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] px-3 py-2 rounded-none text-sm transition-colors border-b-2 border-[var(--color-accent)]"
              >
                Lists
              </Link>
              <button
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                onClick={logout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 py-6">
          <div>
            <h1 className="font-serif text-3xl font-normal text-[var(--color-text-primary)]">My Lists</h1>
            <p className="text-[var(--color-text-secondary)] mt-2 text-sm">
              Organize your reading queue into collections
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="text-sm px-4 py-2 rounded-none bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors whitespace-nowrap ml-4"
          >
            + Create List
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="border-l-4 border-red-600 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 rounded-none mb-6">
            {error}
          </div>
        )}

        {/* Empty state */}
        {lists.length === 0 && !loading && (
          <div className="text-center py-12 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] rounded-none">
            <h3 className="font-serif text-xl font-normal text-[var(--color-text-primary)] mb-2">
              No lists yet
            </h3>
            <p className="text-[var(--color-text-secondary)] mb-6">
              Create your first list to organize your content
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-6 py-2 text-sm rounded-none bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              Create Your First List
            </button>
          </div>
        )}

        {/* Lists as vertical divider layout */}
        {lists.length > 0 && (
          <div className="divide-y divide-[var(--color-border)]">
            {lists.map((list, index) => (
              <div
                key={list.id}
                className={`py-6 hover:bg-[var(--color-bg-secondary)] transition-colors cursor-pointer group ${
                  index === 0 ? "" : ""
                }`}
                onClick={() => handleListClick(list.id)}
              >
                {/* List header with name and shared badge */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-serif text-lg font-normal text-[var(--color-text-primary)]">
                      {list.name}
                    </h3>
                    {/* Description if available */}
                    {list.description && (
                      <p className="text-[var(--color-text-secondary)] text-sm mt-1 line-clamp-2">
                        {list.description}
                      </p>
                    )}
                  </div>
                  {list.is_shared && (
                    <span className="text-xs px-2 py-1 rounded-none border border-[var(--color-border)] text-[var(--color-text-muted)] ml-4 whitespace-nowrap">
                      Shared
                    </span>
                  )}
                </div>

                {/* Content count and actions */}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {listCounts[list.id] ?? list.content_count}{" "}
                    {(listCounts[list.id] ?? list.content_count) === 1
                      ? "item"
                      : "items"}
                  </span>

                  {/* Action buttons - visible on hover */}
                  <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingList(list);
                      }}
                      className="text-xs px-2 py-1 rounded-none bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingList(list);
                      }}
                      className="text-xs px-2 py-1 rounded-none bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
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
