"use client";

import { useState, useEffect, useRef } from "react";
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
  showNote: boolean;
  onToggleNote: (isOpen: boolean) => void;
}

const colors = ["yellow", "green", "blue", "pink", "purple"];

export default function HighlightToolbar({
  selection,
  contentId,
  onClose,
  onHighlightCreated,
  showNote,
  onToggleNote,
}: HighlightToolbarProps) {
  const isEditing = !!selection?.existingHighlightId;
  const hasExistingNote = !!selection?.existingNote;
  const [note, setNote] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (selection) {
      setNote(selection.existingNote || "");
    }
  }, [selection]);

  useEffect(() => {
    if (showNote && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [showNote]);

  if (!selection) return null;

  // Position below the selection, centered
  const getPosition = () => {
    const viewportWidth =
      typeof window !== "undefined" ? window.innerWidth : 800;

    // Estimate width to prevent overflow
    // Mobile: ~130px -> increased for "Remove" text
    // Desktop: ~230px -> increased for "Remove" text
    const isMobile = viewportWidth < 640;
    const estimatedWidth = isMobile ? 240 : 320;

    let x = selection.position.x - estimatedWidth / 2;
    if (x < 8) x = 8;
    if (x + estimatedWidth > viewportWidth - 8)
      x = viewportWidth - estimatedWidth - 8;

    const y = selection.position.y + 8;

    return { x, y };
  };

  const pos = getPosition();

  const handleHighlight = async (color: string) => {
    if (isLoading) return;

    try {
      setIsLoading(true);

      if (isEditing && selection.existingHighlightId) {
        await highlightsAPI.update(selection.existingHighlightId, {
          color,
          note: note || undefined,
        });
      } else {
        await highlightsAPI.create(contentId, {
          text: selection.text,
          start_offset: selection.startOffset,
          end_offset: selection.endOffset,
          color,
          note: note || undefined,
        });
      }

      showToast(isEditing ? "Updated" : "Saved", "success");
      onHighlightCreated?.();

      // Clear native selection to prevent "wrong native highlight" artifacts
      window.getSelection()?.removeAllRanges();

      onClose();
    } catch (error) {
      console.error("Error:", error);
      showToast("Failed to save", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selection.existingHighlightId || isLoading) return;

    try {
      setIsLoading(true);
      await highlightsAPI.delete(selection.existingHighlightId);
      showToast("Removed", "success");
      onHighlightCreated?.();

      // Clear native selection
      window.getSelection()?.removeAllRanges();

      onClose();
    } catch (error) {
      console.error("Error:", error);
      showToast("Failed to remove", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Desktop/Mobile: Auto width to fit content (prevent overflow)
  // Use min-content so the toolbar size is determined by the buttons row,
  // and the note preview wraps to match that width.
  const toolbarStyleWidth = "min-content";

  return (
    <div
      className="highlight-toolbar fixed z-50 animate-fade-in"
      style={{ left: pos.x, top: pos.y, width: toolbarStyleWidth }}
    >
      {/* Main toolbar - smaller on mobile */}
      <div className="flex items-center flex-nowrap bg-[var(--color-bg-primary)] border border-[var(--color-border)] shadow-sm p-1.5 gap-1.5 sm:p-1 sm:gap-1 leading-none w-max">
        {/* Color swatches */}
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => handleHighlight(color)}
            disabled={isLoading}
            className={`
              transition-all border disabled:opacity-40 box-border block
              hover:saturate-200 hover:scale-105 shrink-0
              ${
                isEditing && selection.existingColor === color
                  ? "border-[var(--color-text-primary)]"
                  : "border-transparent hover:border-[var(--color-accent)]"
              }
              w-[18px] h-[18px] min-w-[18px] min-h-[18px]
              sm:w-[26px] sm:h-[26px] sm:min-w-[26px] sm:min-h-[26px]
            `}
            style={{ backgroundColor: `var(--highlight-${color})` }}
            aria-label={color}
          />
        ))}

        {/* Divider - Desktop only */}
        <div className="hidden sm:block w-px h-4 sm:h-5 bg-[var(--color-border)] mx-0.5" />

        {/* Desktop: Note button (Hidden on Mobile) */}
        <button
          onClick={() => onToggleNote(!showNote)}
          disabled={isLoading}
          className={`
            hidden sm:block text-xs px-2 py-1 border transition-colors whitespace-nowrap shrink-0
            ${
              showNote || hasExistingNote
                ? "border-[var(--color-accent)] text-[var(--color-text-primary)]"
                : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
            }
          `}
        >
          Note
        </button>

        {/* Remove button - Only shown when editing */}
        {isEditing && (
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className={`
             text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 border transition-colors whitespace-nowrap shrink-0
             min-h-[18px] sm:min-h-[26px] flex items-center
             border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-red-400 hover:text-red-500
          `}
          >
            Remove
          </button>
        )}
      </div>

      {/* Note editor panel - Desktop only */}
      {showNote && (
        <div className="hidden sm:block mt-1 p-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] shadow-sm animate-fade-in w-0 min-w-full">
          <textarea
            ref={textareaRef}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note..."
            className="w-full px-2 py-2 text-sm bg-transparent border-none outline-none resize-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] overscroll-y-contain min-w-0"
            rows={6}
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => onToggleNote(false)}
              className="text-xs px-3 py-1.5 border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                handleHighlight(selection.existingColor || "yellow")
              }
              disabled={isLoading}
              className="text-xs px-3 py-1.5 border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white transition-colors disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Existing note preview - Desktop only */}
      {hasExistingNote && !showNote && (
        <div
          onClick={() => onToggleNote(true)}
          className="hidden sm:block mt-1 p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-sm cursor-pointer hover:border-[var(--color-accent)] transition-colors animate-fade-in w-0 min-w-full"
        >
          <p className="text-xs text-[var(--color-text-secondary)] line-clamp-6 break-words">
            {selection.existingNote}
          </p>
        </div>
      )}
    </div>
  );
}
