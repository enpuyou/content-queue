"use client";

import { useState, useEffect, useCallback } from "react";
import { listsAPI } from "@/lib/api";
import ListModal from "@/components/ListModal";
import RetroLoader from "@/components/RetroLoader";
import ListBlockCard from "@/components/ListBlockCard";
import { useLists } from "@/contexts/ListsContext";
import Navbar from "@/components/Navbar";

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
  const { listCounts, setListCount } = useLists();

  const [lists, setLists] = useState<ListWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLists = lists.filter(
    (list) =>
      list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (list.description &&
        list.description.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<ListWithCount | null>(null);

  const fetchLists = useCallback(async () => {
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
    } finally {
      setLoading(false);
    }
  }, [setListCount]);

  // Fetch lists on component mount
  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const handleDeleteList = async (listId: string) => {
    try {
      await listsAPI.delete(listId);
      fetchLists();
    } catch (err) {
      console.error("Failed to delete list:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)]">
        <Navbar />

        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="text-[var(--color-text-muted)]">
              <RetroLoader text="Loading your lists" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="font-serif text-3xl font-normal text-[var(--color-text-primary)] mt-6">
                My Collections
              </h1>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="text-xs px-2 py-1 rounded-none border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors whitespace-nowrap"
            >
              + Create List
            </button>
          </div>
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
              className="text-xs px-2 py-1 rounded-none border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors"
            >
              + Create Your First List
            </button>
          </div>
        )}

        {/* Search */}
        {lists.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search lists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)] transition-colors rounded-none placeholder-[var(--color-text-muted)] text-[var(--color-text-primary)]"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        )}

        {/* Lists as block grid layout - square blocks */}
        {filteredLists.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLists.map((list) => (
              <ListBlockCard
                key={list.id}
                id={list.id}
                name={list.name}
                description={list.description}
                contentCount={listCounts[list.id] ?? list.content_count}
                isShared={list.is_shared}
                onEdit={() => setEditingList(list)}
                onDelete={() => handleDeleteList(list.id)}
              />
            ))}
          </div>
        ) : (
          lists.length > 0 && (
            <div className="text-center py-12 text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)]">
              No lists match "{searchQuery}"
            </div>
          )
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
    </div>
  );
}
