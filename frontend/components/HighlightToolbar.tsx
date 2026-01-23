"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import { highlightsAPI } from "@/lib/api";
import { Highlighter } from "lucide-react";

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
  { name: "yellow" },
  { name: "green" },
  { name: "blue" },
  { name: "pink" },
  { name: "purple" },
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
  const [isExpanded, setIsExpanded] = useState(false);
  const { showToast } = useToast();

  // Reset state when selection changes
  // We need to include all selection properties used in the effect
  useEffect(() => {
    if (selection) {
      setSelectedColor(selection.existingColor || "yellow");
      setNote(selection.existingNote || "");
      setShowNoteInput(!!selection.existingNote);
      setIsExpanded(!!selection.existingHighlightId);
    }
  }, [selection]);

  if (!selection) return null;

  const handleSaveHighlight = async () => {
    try {
      setIsLoading(true);

      if (isEditing && selection.existingHighlightId) {
        await highlightsAPI.update(selection.existingHighlightId, {
          color: selectedColor,
          note: note || undefined,
        });

        showToast("Highlight updated", "success");
      } else {
        const _result = await highlightsAPI.create(contentId, {
          text: selection.text,
          start_offset: selection.startOffset,
          end_offset: selection.endOffset,
          color: selectedColor,
          note: note || undefined,
        });

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

  if (!isExpanded) {
    return (
      <div
        className="highlight-toolbar fixed z-50"
        style={{
          left: `${selection.position.x}px`,
          top: `${selection.position.y - 40}px`,
          transform: "translateX(-50%)",
        }}
      >
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border border-[var(--color-border)] shadow-md hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all transform hover:scale-105"
        >
          <Highlighter size={14} />
          <span className="text-sm font-medium">Highlight</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="highlight-toolbar fixed z-50 bg-[var(--color-bg-primary)] rounded-none border border-[var(--color-border)] shadow-lg p-3 max-w-sm"
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
            className={`w-6 h-6 rounded-none border-2 transition-all ${
              selectedColor === color.name
                ? "border-[var(--color-text-primary)] scale-110"
                : "border-[var(--color-border)] opacity-60 hover:opacity-100"
            }`}
            style={
              {
                backgroundColor: `var(--highlight-${color.name})`,
              } as React.CSSProperties
            }
            title={color.name}
            aria-label={color.name}
          />
        ))}
      </div>

      {/* Preview of selected text */}
      <div className="mb-3 p-2 bg-[var(--color-bg-secondary)] rounded-none text-sm max-h-20 overflow-y-auto border border-[var(--color-border)]">
        <p className="text-[var(--color-text-secondary)] font-medium">
          "{selection.text.substring(0, 100)}
          {selection.text.length > 100 ? "..." : ""}"
        </p>
      </div>

      {/* Note Input */}
      {(showNoteInput || isEditing) && (
        <textarea
          placeholder={isEditing ? "Edit note..." : "Add a note"}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full mb-3 px-2 py-1 text-sm border border-[var(--color-border)] bg-transparent rounded-none focus:outline-none focus:border-[var(--color-accent)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] resize-none"
          rows={2}
        />
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!isEditing && (
          <button
            onClick={() => setShowNoteInput(!showNoteInput)}
            className="flex-1 text-sm px-2 py-1.5 rounded-none bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
          >
            {showNoteInput ? "✓ Note" : "Add Note"}
          </button>
        )}
        <button
          onClick={handleSaveHighlight}
          disabled={isLoading}
          className="flex-1 text-sm px-2 py-1.5 rounded-none bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Saving..." : isEditing ? "Update" : "Save"}
        </button>
        {isEditing && (
          <button
            onClick={handleDeleteHighlight}
            disabled={isLoading}
            className="flex-1 text-sm px-2 py-1.5 rounded-none bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Unhighlight
          </button>
        )}
        <button
          onClick={onClose}
          className="text-sm px-2 py-1.5 rounded-none bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
