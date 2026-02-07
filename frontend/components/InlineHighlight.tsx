"use client";

import { useState, useEffect, useRef } from "react";
import { highlightsAPI } from "@/lib/api";

interface InlineHighlightProps {
  id: string;
  color: string;
  initialNote?: string;
  initialOpen?: boolean;
  children: React.ReactNode;
  onDelete?: (id: string) => void;
  onUpdate?: () => void;
  onHighlightClick?: (id: string, element: Element) => void;
  isMobile?: boolean;
}

const colors = ["yellow", "green", "blue", "pink", "purple"];

export default function InlineHighlight({
  id,
  color: initialColor,
  initialNote,
  initialOpen = false,
  children,
  onDelete,
  onUpdate,
  onHighlightClick: _onHighlightClick,
  isMobile = false,
}: InlineHighlightProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [note, setNote] = useState(initialNote || "");
  const [visualNote, setVisualNote] = useState(initialNote || ""); // For display when collapsed
  const [color, setColor] = useState(initialColor);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update local state if prop changes (e.g. from parent refresh)
  useEffect(() => {
    if (initialNote !== undefined) {
      setNote(initialNote);
      setVisualNote(initialNote);
    }
    setColor(initialColor);
  }, [initialNote, initialColor]);

  // Force open if initialOpen changes to true (e.g. from parent "Note" button)
  useEffect(() => {
    if (initialOpen) {
      setIsOpen(true);
    }
  }, [initialOpen]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length,
      );
    }
  }, [isOpen]);

  // Auto-resize textarea
  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    if (isOpen) {
      adjustHeight();
    }
  }, [isOpen, note]);

  const handleToggle = (e: React.MouseEvent) => {
    // If mobile, prevent opening editor
    if (isMobile) {
      return;
    }

    // If currently open, ANY click on the highlight header should SAVE and CLOSE it
    if (isOpen) {
      e.stopPropagation();
      e.preventDefault();
      if (typeof window !== "undefined") {
        window.getSelection()?.removeAllRanges();
      }
      handleSave(); // Auto-save on close
      return;
    }

    // If closed...
    if (visualNote) {
      // Case 1: Has Note -> Open Editor + Suppress Global Toolbar
      e.stopPropagation();
      e.preventDefault();
      // Force clear selection to prevent global toolbar from appearing
      if (typeof window !== "undefined") {
        window.getSelection()?.removeAllRanges();
      }
      setIsOpen(true);
    } else {
      // Case 2: No Note -> Standard Highlight Click (Show Global Toolbar)
      // We intentionally let it bubble so Reader can handle the selection/click
    }
  };

  const handleSave = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isSaving) return;

    try {
      setIsSaving(true);
      await highlightsAPI.update(id, {
        note: note || undefined,
        color: color,
      });
      setVisualNote(note);
      setIsOpen(false);
      onUpdate?.(); // Sync parent
    } catch (error) {
      console.error("Failed to save note:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleColorChange = async (newColor: string) => {
    if (color === newColor) return;
    setColor(newColor);
    // Auto-save color change
    try {
      await highlightsAPI.update(id, { color: newColor });
      onUpdate?.();
    } catch (error) {
      console.error(error);
      // Revert on error?
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Save on Cmd+Enter or Ctrl+Enter OR Escape (Auto-save on close)
    if (((e.metaKey || e.ctrlKey) && e.key === "Enter") || e.key === "Escape") {
      e.preventDefault();
      handleSave();
    }
  };

  const handleDeleteHighlight = async (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(id);
  };

  return (
    <>
      <span
        data-highlight-id={id}
        className={`
            relative transition-colors duration-200 box-decoration-clone
            ${!isMobile ? "cursor-pointer hover:saturate-150" : ""}
            ${isOpen ? "ring-1 ring-[var(--color-text-primary)] z-10" : ""}
        `}
        style={{
          backgroundColor: `var(--highlight-${color})`,
          // Ensure purely rectangular - no rounding
          borderRadius: 0,
        }}
        onClick={handleToggle}
        title={
          !isMobile
            ? visualNote
              ? "Click to edit note"
              : "Click to add note"
            : ""
        }
      >
        {children}
        {/* Dot at the end of content instead of absolute positioning */}
        {visualNote && !isOpen && (
          <span
            className="inline-block w-0 h-0 relative overflow-visible"
            style={{ verticalAlign: "super" }}
          >
            <span className="absolute flex h-2 w-2 -right-[4px] -top-[12px]">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-text-primary)]"></span>
            </span>
          </span>
        )}
      </span>

      {/* Editor - Rendered as a block after the span effectively via CSS or structure
          To "break" the flow inside a paragraph, we use a block span or div.
          Note: This technically might be inside a <p> tag from the parent HTML.
      */}
      {isOpen && (
        <span
          className="flex justify-center w-full py-8 animate-fade-in block"
          style={{
            paddingRight: "20px",
          }}
        >
          <span
            className="block bg-[var(--color-bg-primary)] w-[95%]"
            onClick={(e) => e.stopPropagation()}
          >
            <textarea
              ref={textareaRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onInput={adjustHeight}
              onKeyDown={handleKeyDown}
              placeholder="Write a note..."
              className="w-full bg-transparent border border-[var(--color-text-primary)] outline-none text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] text-base font-serif p-4 resize-none overflow-hidden leading-relaxed block focus:!border-[var(--color-text-primary)] focus:!ring-0 focus:!outline-none focus:!shadow-none"
              rows={1}
              style={{
                minHeight: "60px",
              }}
            />
            <span className="flex items-center justify-between pt-2 bg-[var(--color-bg-primary)]">
              <button
                onClick={handleDeleteHighlight}
                className="text-xs px-2 py-0.5 leading-none rounded-none border bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-red-400 hover:text-red-500 transition-colors tracking-wider font-sans"
              >
                Delete
              </button>

              {/* Integrated Color Picker */}
              <div className="flex gap-2 px-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleColorChange(c);
                    }}
                    className={`
                                            w-[22px] h-[22px] border transition-all hover:scale-110
                                            ${color === c ? "border-[var(--color-text-primary)] scale-110 shadow-sm" : "border-transparent opacity-70 hover:opacity-100"}
                                        `}
                    style={{ backgroundColor: `var(--highlight-${c})` }}
                    title={c}
                  />
                ))}
              </div>

              <div className="flex gap-2 tracking-wide">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    setNote(visualNote);
                  }}
                  className="text-xs px-2 py-0.5 leading-none rounded-none border bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors font-sans"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="text-xs px-2 py-0.5 leading-none rounded-none border bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] border-[var(--color-text-primary)] hover:opacity-90 transition-opacity disabled:opacity-50 font-sans"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </span>
          </span>
        </span>
      )}
    </>
  );
}
