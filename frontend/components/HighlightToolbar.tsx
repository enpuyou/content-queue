"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import { highlightsAPI } from "@/lib/api";

interface HighlightToolbarProps {
  selection: {
    text: string;
    startOffset: number;
    endOffset: number;
    position: { x: number; y: number };
    existingHighlightId?: string;
    existingColor?: string;
    existingNote?: string;
  } | null;
  contentId: string;
  onClose: () => void;
  onHighlightCreated?: () => void;
}

const colors = [
  { name: "yellow", bg: "bg-yellow-200", hex: "#fef08a" },
  { name: "green", bg: "bg-green-200", hex: "#dcfce7" },
  { name: "blue", bg: "bg-blue-200", hex: "#bfdbfe" },
  { name: "pink", bg: "bg-pink-200", hex: "#fbcfe8" },
  { name: "purple", bg: "bg-purple-200", hex: "#e9d5ff" },
];

export default function HighlightToolbar({
  selection,
  contentId,
  onClose,
  onHighlightCreated,
}: HighlightToolbarProps) {
  const isEditing = !!selection?.existingHighlightId;
  const [selectedColor, setSelectedColor] = useState<string>("yellow");
  const [note, setNote] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const { showToast } = useToast();

  // Reset state when selection changes
  useEffect(() => {
    if (selection) {
      setSelectedColor(selection.existingColor || "yellow");
      setNote(selection.existingNote || "");
      setShowNoteInput(!!selection.existingNote);
    }
  }, [
    selection?.existingHighlightId,
    selection?.startOffset,
    selection?.endOffset,
  ]);

  console.log("HighlightToolbar render:", { hasSelection: !!selection });

  if (!selection) return null;

  console.log("HighlightToolbar showing with selection:", selection);

  const handleSaveHighlight = async () => {
    try {
      setIsLoading(true);

      if (isEditing && selection.existingHighlightId) {
        // Update existing highlight
        console.log("Updating highlight:", {
          highlightId: selection.existingHighlightId,
          color: selectedColor,
          note,
        });

        await highlightsAPI.update(selection.existingHighlightId, {
          color: selectedColor,
          note: note || undefined,
        });

        console.log("Highlight updated");
        showToast("Highlight updated", "success");
      } else {
        // Create new highlight
        console.log("Creating highlight:", {
          contentId,
          text: selection.text,
          start_offset: selection.startOffset,
          end_offset: selection.endOffset,
          color: selectedColor,
        });

        const result = await highlightsAPI.create(contentId, {
          text: selection.text,
          start_offset: selection.startOffset,
          end_offset: selection.endOffset,
          color: selectedColor,
          note: note || undefined,
        });

        console.log("Highlight created:", result);
        showToast("Highlight saved", "success");
      }

      onHighlightCreated?.();
      onClose();
    } catch (error) {
      console.error("Error saving highlight:", error);
      showToast(
        error instanceof Error ? error.message : "Failed to save highlight",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteHighlight = async () => {
    if (!selection.existingHighlightId) return;

    if (!confirm("Remove this highlight?")) return;

    try {
      setIsLoading(true);
      await highlightsAPI.delete(selection.existingHighlightId);
      showToast("Highlight removed", "success");
      onHighlightCreated?.();
      onClose();
    } catch (error) {
      console.error("Error deleting highlight:", error);
      showToast("Failed to remove highlight", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="highlight-toolbar fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3 max-w-sm"
      style={{
        left: `${Math.max(20, selection.position.x - 150)}px`,
        top: `${selection.position.y - 60}px`,
      }}
    >
      {/* Color Picker */}
      <div className="flex gap-2 mb-3">
        {colors.map((color) => (
          <button
            key={color.name}
            onClick={() => setSelectedColor(color.name)}
            className={`w-6 h-6 rounded border-2 transition-all ${color.bg} ${
              selectedColor === color.name
                ? "border-gray-900 scale-110"
                : "border-gray-300 opacity-60 hover:opacity-100"
            }`}
            title={color.name}
            aria-label={color.name}
          />
        ))}
      </div>

      {/* Preview of selected text */}
      <div className="mb-3 p-2 bg-gray-50 rounded text-sm max-h-20 overflow-y-auto">
        <p className="text-gray-600 font-medium">
          "{selection.text.substring(0, 100)}
          {selection.text.length > 100 ? "..." : ""}"
        </p>
      </div>

      {/* Note Input */}
      {(showNoteInput || isEditing) && (
        <textarea
          placeholder={isEditing ? "Edit note..." : "Add a note (optional)"}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full mb-3 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          rows={2}
        />
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!isEditing && (
          <button
            onClick={() => setShowNoteInput(!showNoteInput)}
            className="flex-1 text-sm px-2 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            {showNoteInput ? "✓ Note" : "Add Note"}
          </button>
        )}
        <button
          onClick={handleSaveHighlight}
          disabled={isLoading}
          className="flex-1 text-sm px-2 py-1.5 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Saving..." : isEditing ? "Update" : "Save"}
        </button>
        {isEditing && (
          <button
            onClick={handleDeleteHighlight}
            disabled={isLoading}
            className="flex-1 text-sm px-2 py-1.5 rounded bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Unhighlight
          </button>
        )}
        <button
          onClick={onClose}
          className="text-sm px-2 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
