"use client";

import { useState } from "react";
import { highlightsAPI } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

interface Highlight {
  id: string;
  text: string;
  start_offset: number;
  end_offset: number;
  color: string;
  note?: string;
}

interface HighlightsPanelProps {
  highlights: Highlight[];
  onHighlightClick: (highlight: Highlight) => void;
  onHighlightDeleted: () => void;
  onHighlightUpdated: () => void;
}

const colorClasses: Record<string, string> = {
  yellow: "bg-yellow-200",
  green: "bg-green-200",
  blue: "bg-blue-200",
  pink: "bg-pink-200",
  purple: "bg-purple-200",
};

const colorOptions = [
  { name: "yellow", bg: "bg-yellow-200" },
  { name: "green", bg: "bg-green-200" },
  { name: "blue", bg: "bg-blue-200" },
  { name: "pink", bg: "bg-pink-200" },
  { name: "purple", bg: "bg-purple-200" },
];

export default function HighlightsPanel({
  highlights,
  onHighlightClick,
  onHighlightDeleted,
  onHighlightUpdated,
}: HighlightsPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editColor, setEditColor] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleStartEdit = (highlight: Highlight) => {
    setEditingId(highlight.id);
    setEditNote(highlight.note || "");
    setEditColor(highlight.color);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditNote("");
    setEditColor("");
  };

  const handleSaveEdit = async (highlightId: string) => {
    try {
      await highlightsAPI.update(highlightId, {
        note: editNote || undefined,
        color: editColor,
      });
      showToast("Highlight updated", "success");
      onHighlightUpdated();
      setEditingId(null);
      setEditNote("");
      setEditColor("");
    } catch (error) {
      console.error("Error updating highlight:", error);
      showToast("Failed to update highlight", "error");
    }
  };

  const handleDelete = async (highlightId: string) => {
    if (!confirm("Are you sure you want to delete this highlight?")) {
      return;
    }

    try {
      setIsDeleting(highlightId);
      await highlightsAPI.delete(highlightId);
      showToast("Highlight deleted", "success");
      onHighlightDeleted();
    } catch (error) {
      console.error("Error deleting highlight:", error);
      showToast("Failed to delete highlight", "error");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleCopyAllHighlights = async () => {
    const markdown = highlights
      .map((h) => {
        const noteSection = h.note ? `\n\n${h.note}` : "";
        return `> ${h.text}${noteSection}\n\n---`;
      })
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(markdown);
      showToast("Copied to clipboard", "success");
    } catch (error) {
      console.error("Failed to copy highlights:", error);
      showToast("Failed to copy", "error");
    }
  };

  if (highlights.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        No highlights yet. Select text to create a highlight.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">
          Highlights ({highlights.length})
        </h3>
        <button
          onClick={handleCopyAllHighlights}
          className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
          title="Copy all highlights as Markdown"
          aria-label="Copy all highlights"
        >
          Copy All
        </button>
      </div>

      {/* Highlights List */}
      <div className="flex-1 overflow-y-auto">
        {highlights.map((highlight) => {
          const isEditing = editingId === highlight.id;
          const isBeingDeleted = isDeleting === highlight.id;

          return (
            <div
              key={highlight.id}
              className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors"
              role="listitem"
            >
              {/* Highlighted Text */}
              <div
                className={`${colorClasses[isEditing ? editColor : highlight.color]} p-2 rounded mb-2 cursor-pointer text-sm outline-none focus:ring-2 focus:ring-blue-400`}
                onClick={() => !isEditing && onHighlightClick(highlight)}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && !isEditing) {
                    e.preventDefault();
                    onHighlightClick(highlight);
                  }
                }}
                role="button"
                tabIndex={0}
                title="Click to scroll to this highlight"
                aria-label={`Go to highlight: ${highlight.text}`}
              >
                {highlight.text.length > 150
                  ? `${highlight.text.substring(0, 150)}...`
                  : highlight.text}
              </div>

              {/* Note Section */}
              {isEditing ? (
                <div className="space-y-2 mb-2">
                  {/* Color Picker */}
                  <div className="flex gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => setEditColor(color.name)}
                        className={`w-6 h-6 rounded border-2 transition-all ${color.bg} ${
                          editColor === color.name
                            ? "border-gray-900 scale-110"
                            : "border-gray-300 opacity-60 hover:opacity-100"
                        }`}
                        title={color.name}
                        aria-label={`Select color ${color.name}`}
                      />
                    ))}
                  </div>

                  {/* Note Input */}
                  <textarea
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="Add a note..."
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                    rows={3}
                    aria-label="Edit note"
                  />
                </div>
              ) : (
                highlight.note && (
                  <div className="text-xs text-gray-600 italic mb-2 pl-2 border-l-2 border-gray-300">
                    {highlight.note}
                  </div>
                )
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => handleSaveEdit(highlight.id)}
                      className="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                      aria-label="Save"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      aria-label="Cancel"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleStartEdit(highlight)}
                      className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      aria-label="Edit"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(highlight.id)}
                      disabled={isBeingDeleted}
                      className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Delete"
                    >
                      {isBeingDeleted ? "Deleting..." : "Delete"}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
