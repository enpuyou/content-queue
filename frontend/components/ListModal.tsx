"use client";

import { useState, useEffect } from "react";
import { listsAPI } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

interface ListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  // If editing, pass the list data. If creating, leave undefined
  list?: {
    id: string;
    name: string;
    description: string | null;
    is_shared: boolean;
  };
}

export default function ListModal({
  isOpen,
  onClose,
  onSuccess,
  list,
}: ListModalProps) {
  const { showToast } = useToast();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Determine if we're editing or creating
  const isEditing = !!list;

  // Populate form when editing
  useEffect(() => {
    if (list) {
      setName(list.name);
      setDescription(list.description || "");
      setIsShared(list.is_shared);
    } else {
      // Reset form when creating new list
      setName("");
      setDescription("");
      setIsShared(false);
    }
    setError("");
  }, [list, isOpen]);

  // Close modal and prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!name.trim()) {
      setError("List name is required");
      return;
    }

    setLoading(true);

    try {
      if (isEditing && list) {
        // Update existing list
        await listsAPI.update(list.id, {
          name: name.trim(),
          description: description.trim() || undefined,
        });
        showToast("List updated successfully", "success");
      } else {
        // Create new list
        await listsAPI.create({
          name: name.trim(),
          description: description.trim() || undefined,
          is_shared: isShared,
        });
        showToast("List created successfully", "success");
      }

      // Close modal and notify parent to refresh
      onClose();
      onSuccess();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save list";
      setError(errorMessage);
      showToast(errorMessage, "error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditing ? "Edit List" : "Create New List"}
            </h2>
            <p className="text-gray-600 mt-1">
              {isEditing
                ? "Update the details of your list"
                : "Organize your content into a custom collection"}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                List Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Web Development, Reading List"
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Description field */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description (optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this list about?"
                rows={3}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              />
            </div>

            {/* Shared checkbox - only show when creating */}
            {!isEditing && (
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="is_shared"
                  checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
                  disabled={loading}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <label
                  htmlFor="is_shared"
                  className="ml-2 block text-sm text-gray-700"
                >
                  <span className="font-medium">Make this list shared</span>
                  <span className="block text-gray-500 text-xs mt-0.5">
                    Others can view this list (future feature)
                  </span>
                </label>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? "Saving..."
                  : isEditing
                    ? "Update List"
                    : "Create List"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
