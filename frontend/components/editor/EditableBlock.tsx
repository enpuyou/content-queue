import { useEffect, useRef, memo } from "react";
import { ContentBlock, BlockType } from "@/lib/blockParser";

interface EditableBlockProps {
  block: ContentBlock;
  onChange: (id: string, newContent: string) => void;
  isActive: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  onEnter?: (id: string) => void;
  onBackspace?: (id: string, cursorContent: number) => void;
  onTypeChange?: (id: string, newType: BlockType) => void;
}

const EditableBlock = memo(function EditableBlock({
  block,
  onChange,
  isActive,
  onActivate,
  onDeactivate,
  onDelete,
  onEnter,
  onBackspace,
  onTypeChange,
}: EditableBlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Focus when activated
  useEffect(() => {
    if (isActive && contentRef.current) {
      // Check for merge marker
      const marker = contentRef.current.querySelector("#merge-cursor-marker");
      if (marker) {
        // Restore cursor to marker position
        const range = document.createRange();
        const selection = window.getSelection();

        // We want to be BEFORE the marker, effectively between the text nodes
        range.setStartBefore(marker);
        range.collapse(true);

        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }

        // Cleanup marker so it doesn't stay in content
        marker.remove();
      } else {
        // Standard focus (end of block or start?)
        // Default focus() behavior is usually start or all.
        // Let's try to focus at end if no marker? Or just default behavior.
        // Default behavior is safer for general navigation.
        contentRef.current.focus();
      }
    }
  }, [isActive, block.content]); // Re-run if content changes (e.g. merge happened)

  const handleBlur = () => {
    if (contentRef.current) {
      const newHtml = contentRef.current.innerHTML;
      if (newHtml !== block.content) {
        onChange(block.id, newHtml);
      }
    }
    onDeactivate();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (onEnter) onEnter(block.id);
    }

    // Markdown Shortcuts
    if (e.key === " ") {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (range.collapsed && contentRef.current) {
          const text = contentRef.current.textContent || "";

          // Check for patterns
          if (text === "#" && onTypeChange) {
            e.preventDefault();
            onChange(block.id, ""); // Clear the "#"
            onTypeChange(block.id, "heading1");
          } else if (text === "##" && onTypeChange) {
            e.preventDefault();
            onChange(block.id, "");
            onTypeChange(block.id, "heading2");
          } else if (text === "###" && onTypeChange) {
            e.preventDefault();
            onChange(block.id, "");
            onTypeChange(block.id, "heading3");
          } else if ((text === "*" || text === "-") && onTypeChange) {
            e.preventDefault();
            onChange(block.id, "");
            onTypeChange(block.id, "list"); // Simple list support
          }
        }
      }
    }

    if (e.key === "Backspace") {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        // Check if cursor is at the start
        if (range.collapsed && range.startOffset === 0) {
          // Check if it's the start of the block content as well?
          // contentRef.current could ensure we are really at start.
          // For MVP, if offset is 0, we try to merge.
          if (onBackspace) {
            // Prevent deletion of the previous character in the previous block
            // Actually, we want to maybe delete the current block?
            // If content is empty, definitely delete/merge.
            // If content exists, merge.
            if (block.content.length === 0 || range.startOffset === 0) {
              // Logic handled in parent, but we should prevent default only if we trigger action
              // e.preventDefault(); // Maybe let parent handle?
              // Let's pass it up.
              onBackspace(block.id, 0);
              // We don't prevent default here strictly unless we want to stop deletion of character?
              // Merging usually implies we kill this block.
            }
          }
        }
      }
    }
  };

  // Determine tag and classes based on block type
  let Tag: React.ElementType = "div";
  let classes = "mb-4";

  switch (block.type) {
    case "heading1":
      Tag = "h1";
      classes =
        "font-serif text-3xl mb-4 mt-6 leading-tight font-normal text-[var(--color-text-primary)]";
      break;
    case "heading2":
      Tag = "h2";
      classes =
        "font-serif text-2xl mb-3 mt-8 leading-snug font-normal text-[var(--color-text-primary)]";
      break;
    case "heading3":
      Tag = "h3";
      classes =
        "font-serif text-xl mb-2 mt-6 leading-snug font-medium text-[var(--color-text-primary)]";
      break;
    case "paragraph":
      Tag = "p";
      classes =
        "text-[var(--color-text-secondary)] text-lg leading-relaxed mb-6 font-serif";
      break;
    case "list":
      Tag = "div";
      classes = "pl-5 space-y-2 mb-6";
      break;
    case "image":
      // Image block (read-only for now but deletable)
      return (
        <div
          className="my-10 relative border-2 border-transparent hover:border-[var(--color-accent)] cursor-default transition-colors group"
          onClick={onActivate}
        >
          <div dangerouslySetInnerHTML={{ __html: block.content }} />
          {isActive && (
            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              Image
            </div>
          )}
          {/* Delete Button for Image */}
          <button
            className={`absolute -right-8 top-1/2 -translate-y-1/2 p-1 text-[var(--color-text-muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity`}
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm("Delete this image?")) {
                onDelete();
              }
            }}
            title="Delete image"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      );
    default:
      Tag = "div";
      classes = "mb-4";
  }

  return (
    <div className="relative group">
      <Tag
        ref={contentRef}
        className={`
        ${classes}
        outline-none rounded-sm transition-all min-h-[1.5em] empty:before:content-['\\feff']
        ${
          isActive
            ? "ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-bg-primary)] p-4 bg-[var(--color-bg-primary)] z-10 relative"
            : "hover:bg-[var(--color-bg-secondary)] hover:cursor-text border border-transparent hover:border-[var(--color-border-subtle)] p-1"
        }
      `}
        contentEditable={isActive}
        suppressContentEditableWarning
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onActivate();
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        dangerouslySetInnerHTML={{ __html: block.content }}
      />
      {/* Delete Button - Visible on Group Hover */}
      <button
        className={`absolute -right-8 top-1/2 -translate-y-1/2 p-1 text-[var(--color-text-muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? "opacity-100" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm("Delete this block?")) {
            onDelete();
          }
        }}
        title="Delete block"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  );
});

export default EditableBlock;
