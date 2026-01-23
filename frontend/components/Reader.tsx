/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ContentItem } from "@/types";
import { searchAPI, highlightsAPI } from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";
import HighlightToolbar from "./HighlightToolbar";
import HighlightRenderer from "./HighlightRenderer";
import HighlightsPanel from "./HighlightsPanel";
import ThemeToggle from "./ThemeToggle";

interface ExtendedSelection {
  text: string;
  startOffset: number;
  endOffset: number;
  position: { x: number; y: number };
  existingHighlightId?: string;
  existingColor?: string;
  existingNote?: string;
}

interface ReaderProps {
  content: ContentItem;
  onStatusChange: (updates: {
    is_read?: boolean;
    is_archived?: boolean;
    read_position?: number;
  }) => void;
}

export default function Reader({ content, onStatusChange }: ReaderProps) {
  // Use global theme context (no local theme state needed)
  useTheme();

  // UI state
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">(
    "medium",
  );

  // Similar articles state
  const [showSimilar, setShowSimilar] = useState(false);
  const [similarArticles, setSimilarArticles] = useState<
    Array<{
      item: ContentItem;
      similarity_score: number;
    }>
  >([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  const [selection, setSelection] = useState<ExtendedSelection | null>(null);

  const [_isCreatingHighlight, _setIsCreatingHighlight] = useState(false);

  // Highlights state
  const [highlights, setHighlights] = useState<
    Array<{
      id: string;
      text: string;
      start_offset: number;
      end_offset: number;
      color: string;
      note?: string;
    }>
  >([]);
  const [_loadingHighlights, setLoadingHighlights] = useState(false);

  // Store original plain text for offset calculation
  const [originalPlainText, setOriginalPlainText] = useState<string>("");

  // Highlights panel visibility
  const [showHighlightsPanel, setShowHighlightsPanel] = useState(false);

  // Navbar auto-hide state
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Fetch highlights when article loads
  const fetchHighlights = useCallback(async () => {
    try {
      setLoadingHighlights(true);
      const data = await highlightsAPI.getByContent(content.id);
      setHighlights(data);
    } catch (error) {
      console.error("Failed to load highlights:", error);
    } finally {
      setLoadingHighlights(false);
    }
  }, [content.id]);

  useEffect(() => {
    fetchHighlights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.id]);

  // Extract original plain text when content loads
  useEffect(() => {
    if (!content.full_text) {
      setOriginalPlainText("");
      return;
    }

    // Parse the HTML to get plain text without any existing highlights
    const parser = new DOMParser();
    const doc = parser.parseFromString(content.full_text, "text/html");
    const plainText = doc.body.innerText || doc.body.textContent || "";
    setOriginalPlainText(plainText);
  }, [content.full_text, content.id]); // Also depend on content.id to refresh on article change

  // Removed auto-mark as read on opening
  // Articles are now marked as read only when:
  // 1. User clicks "Read" button
  // 2. User scrolls to >= 90% (handled in backend)

  // Track scroll position and save periodically
  useEffect(() => {
    let saveTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      // Calculate scroll percentage
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? scrollTop / docHeight : 0;

      // Navbar auto-hide logic with threshold to prevent flicker
      const SCROLL_THRESHOLD = 10; // Minimum scroll distance to trigger
      const deltaY = scrollTop - lastScrollY;

      // Only update navbar visibility if scroll delta exceeds threshold
      if (Math.abs(deltaY) > SCROLL_THRESHOLD) {
        if (deltaY > 0 && scrollTop > 100) {
          // Scrolling down & past 100px - hide navbar
          setShowNavbar(false);
        } else if (deltaY < 0 || scrollTop < 50) {
          // Scrolling up or near top - show navbar
          setShowNavbar(true);
        }
        setLastScrollY(scrollTop);
      }

      // Debounce: save position 1 second after user stops scrolling
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        // Only save if position changed significantly (more than 5%)
        if (
          content.read_position === undefined ||
          Math.abs(scrollPercent - (content.read_position || 0)) > 0.05
        ) {
          onStatusChange({ read_position: scrollPercent });
        }
      }, 1000);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(saveTimeout);
    };
  }, [content.id, content.read_position, onStatusChange, lastScrollY]);

  // Restore scroll position when article loads
  useEffect(() => {
    if (content.read_position && content.read_position > 0) {
      // Store position in a const to ensure it's not undefined
      const savedPosition = content.read_position;

      // Wait for content to render, then scroll
      setTimeout(() => {
        const docHeight =
          document.documentElement.scrollHeight - window.innerHeight;
        const scrollTo = docHeight * savedPosition;
        window.scrollTo({ top: scrollTo, behavior: "smooth" });
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.id]); // Only run when article changes

  // highlight - improved for mobile
  useEffect(() => {
    let selectionTimeout: NodeJS.Timeout;

    const handleSelection = (e?: Event) => {
      // Clear any pending timeout
      clearTimeout(selectionTimeout);

      // Small delay to ensure selection is complete
      selectionTimeout = setTimeout(() => {
        // Check if click was on the toolbar - if so, ignore
        const target = e?.target as HTMLElement | undefined;
        if (target?.closest(".highlight-toolbar")) {
          return;
        }

        const selection = window.getSelection();

        // Check if user clicked on an existing highlight (without selecting new text)
        const selectedText = selection?.toString().trim();
        if (!selection || !selectedText || selectedText.length === 0) {
          // Check if the click was on a highlighted span
          if (target?.dataset.highlightId) {
            const clickedHighlight = highlights.find(
              (h) => h.id === target.dataset.highlightId,
            );
            if (clickedHighlight) {
              // Show toolbar for editing this highlight
              const rect = target.getBoundingClientRect();
              setSelection({
                text: clickedHighlight.text,
                startOffset: clickedHighlight.start_offset,
                endOffset: clickedHighlight.end_offset,
                position: {
                  x: rect.left + rect.width / 2,
                  y: rect.top - 10,
                },
                existingHighlightId: clickedHighlight.id,
                existingColor: clickedHighlight.color,
                existingNote: clickedHighlight.note,
              });
              return;
            }
          }
          setSelection(null);
          return;
        }

        const offsets = getTextOffsets();
        if (!offsets) return;

        // Get toolbar position (show near selection)
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        setSelection({
          text: offsets.selectedText,
          startOffset: offsets.startOffset,
          endOffset: offsets.endOffset,
          position: {
            x: rect.left + rect.width / 2,
            y: rect.top - 10, // Above selection
          },
        });
      }, 100); // Small delay for mobile selection to complete
    };

    const handleMouseUp = (e: MouseEvent) => handleSelection(e);
    const handleTouchEnd = (e: TouchEvent) => handleSelection(e);

    // Use selectionchange for better mobile support
    document.addEventListener("selectionchange", handleSelection);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      clearTimeout(selectionTimeout);
      document.removeEventListener("selectionchange", handleSelection);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchend", handleTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlights]);

  /**
   * Fetch similar articles when user requests them
   */
  const handleFindSimilar = async () => {
    if (similarArticles.length > 0) {
      // Toggle if already loaded
      setShowSimilar(!showSimilar);
      return;
    }

    try {
      setLoadingSimilar(true);
      const results = await searchAPI.findSimilar(content.id);
      setSimilarArticles(results);
      setShowSimilar(true);
    } catch (error) {
      console.error("Failed to find related articles:", error);
      alert(
        "Failed to find related articles. This article may not have embeddings yet.",
      );
    } finally {
      setLoadingSimilar(false);
    }
  };

  const fontSizeClasses = {
    small: "text-base",
    medium: "text-lg",
    large: "text-xl",
  };

  // Use CSS variables for theming - color changes automatically with global theme
  const themeClasses =
    "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]";
  const linkColorClasses =
    "text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]";

  const scrollToHighlight = (highlight: {
    id: string;
    text: string;
    start_offset: number;
    end_offset: number;
    color: string;
    note?: string;
  }) => {
    // Find the span element with this highlight ID
    const highlightEl = document.querySelector(
      `[data-highlight-id="${highlight.id}"]`,
    );

    if (highlightEl) {
      highlightEl.scrollIntoView({ behavior: "smooth", block: "center" });
      // Flash animation to draw attention
      highlightEl.classList.add("ring-2", "ring-blue-500");
      setTimeout(() => {
        highlightEl.classList.remove("ring-2", "ring-blue-500");
      }, 1500);
    }
  };

  const getTextOffsets = () => {
    const selection = window.getSelection();
    if (!selection || selection.toString().length === 0) return null;

    // Get selected text and trim whitespace
    let selectedText = selection.toString();
    const leadingWhitespace = selectedText.search(/\S/);
    const trailingWhitespace = selectedText.search(/\S(?!.*\S)/);

    if (leadingWhitespace >= 0 && trailingWhitespace >= 0) {
      selectedText = selectedText.substring(
        leadingWhitespace,
        trailingWhitespace + 1,
      );
    }

    if (selectedText.length === 0) return null;

    // If we don't have original plain text yet, extract it on the fly
    let plainText = originalPlainText;
    if (!plainText && content.full_text) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content.full_text, "text/html");
      plainText = doc.body.innerText || doc.body.textContent || "";
    }

    if (!plainText) {
      console.error("Cannot extract plain text from content");
      return null;
    }

    // Simple approach: Find the selected text in the plain text
    // Since the user is selecting from the rendered content which might have highlights,
    // we need to search for the text in the original

    // Try to find exact match first
    const exactMatchIndex = plainText.indexOf(selectedText);

    if (exactMatchIndex !== -1) {
      return {
        selectedText,
        startOffset: exactMatchIndex,
        endOffset: exactMatchIndex + selectedText.length,
      };
    }

    // If exact match fails, try to find it by context
    // Get some context before and after from the rendered DOM
    const contentEl = document.getElementById("reader-content");
    if (!contentEl) return null;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(contentEl);
    preCaretRange.setEnd(range.startContainer, range.startOffset);

    // Get last 100 chars before selection as context
    const contextBefore = preCaretRange.toString().slice(-100);

    // Find this context in the original text
    const contextIndex = plainText.indexOf(contextBefore);

    if (contextIndex !== -1) {
      const startOffset = contextIndex + contextBefore.length;
      const endOffset = startOffset + selectedText.length;

      return { selectedText, startOffset, endOffset };
    }

    // Last resort: search for a cleaned version of the text
    const cleanText = (text: string) => text.replace(/\s+/g, " ").trim();
    const cleanedSelected = cleanText(selectedText);
    const cleanedPlain = cleanText(plainText);

    const cleanedIndex = cleanedPlain.indexOf(cleanedSelected);

    if (cleanedIndex !== -1) {
      // Map back to original text position (approximate)
      console.warn("Using approximate offset based on cleaned text");
      return {
        selectedText,
        startOffset: cleanedIndex,
        endOffset: cleanedIndex + cleanedSelected.length,
      };
    }

    console.error("Could not find selected text in original content");
    return null;
  };

  return (
    <div className={`min-h-screen ${themeClasses} transition-colors`}>
      <HighlightToolbar
        selection={selection}
        contentId={content.id}
        onClose={() => setSelection(null)}
        onHighlightCreated={fetchHighlights}
      />
      {/* Sticky Header with Controls */}
      <div
        className={`fixed top-0 left-0 right-0 z-10 ${themeClasses} border-b border-[var(--color-border)] shadow-sm transition-transform duration-300 ${
          showNavbar ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            {/* Back Button - shorter text on mobile, dynamic destination */}
            <Link
              href={
                typeof window !== "undefined"
                  ? sessionStorage.getItem("readerReturnPath") || "/dashboard"
                  : "/dashboard"
              }
              scroll={false}
              className="text-xs px-2 py-1.5 rounded-none border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors whitespace-nowrap flex-shrink-0 flex items-center"
              onClick={() => {
                // Clear the return path after using it
                if (typeof window !== "undefined") {
                  sessionStorage.removeItem("readerReturnPath");
                }
              }}
            >
              ← Back
            </Link>

            {/* Reading Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Font Size Control - hidden on mobile */}
              <div className="hidden md:flex items-center gap-1">
                {(["small", "medium", "large"] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setFontSize(size)}
                    className={`w-6 h-6 flex items-center justify-center rounded-none font-medium transition-colors ${
                      fontSize === size
                        ? "bg-[var(--color-border)] text-[var(--color-text-primary)]"
                        : "bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    <span
                      className={
                        size === "small"
                          ? "text-xs"
                          : size === "medium"
                            ? "text-sm"
                            : "text-base"
                      }
                    >
                      A
                    </span>
                  </button>
                ))}
              </div>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Action Buttons - condensed on mobile */}
              <div className="flex items-center gap-1 flex-wrap">
                {/* Highlights button - icon only on mobile */}
                <button
                  onClick={() => setShowHighlightsPanel(!showHighlightsPanel)}
                  className={`text-xs px-2 py-1 rounded-none border transition-colors ${
                    showHighlightsPanel
                      ? "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-accent)]"
                      : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[var(--color-accent)]"
                  }`}
                  title={`${showHighlightsPanel ? "Hide" : "Show"} Highlights`}
                >
                  <span className="hidden sm:inline">
                    {showHighlightsPanel ? "Hide" : "Show"} Highlights{" "}
                    {highlights.length > 0 && `(${highlights.length})`}
                  </span>
                  <span className="sm:hidden">
                    ✎{highlights.length > 0 && ` ${highlights.length}`}
                  </span>
                </button>

                {/* Archive button */}
                <button
                  onClick={() =>
                    onStatusChange({ is_archived: !content.is_archived })
                  }
                  className={`text-xs px-2 py-1 rounded-none border transition-colors whitespace-nowrap ${
                    content.is_archived
                      ? "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-accent)]"
                      : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[var(--color-accent)]"
                  }`}
                >
                  {content.is_archived ? "Unarchive" : "Archive"}
                </button>

                {/* Find Related - hidden on mobile */}
                <button
                  onClick={handleFindSimilar}
                  disabled={loadingSimilar}
                  className="hidden sm:inline-block text-xs px-2 py-1 rounded-none border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingSimilar
                    ? "Loading..."
                    : showSimilar
                      ? "Hide Related"
                      : "Find Related"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Highlights Panel Sidebar */}
      {showHighlightsPanel && (
        <div
          className={`fixed right-0 top-16 h-[calc(100vh-4rem)] w-80 ${themeClasses} border-l border-[var(--color-border)] shadow-xl z-20 overflow-hidden flex flex-col`}
        >
          <HighlightsPanel
            highlights={highlights}
            onHighlightClick={scrollToHighlight}
            onHighlightDeleted={fetchHighlights}
            onHighlightUpdated={fetchHighlights}
          />
        </div>
      )}

      {/* Article Content */}
      <article className={`max-w-2xl mx-auto px-5 sm:px-6 lg:px-8 py-8 pt-28`}>
        {/* Article Header */}
        <header className="mb-12">
          <h1
            className={`font-serif font-normal leading-tight mb-4 ${fontSize === "small" ? "text-3xl" : fontSize === "medium" ? "text-4xl" : "text-5xl"} text-[var(--color-text-primary)]`}
          >
            {content.title || "Untitled Article"}
          </h1>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)] mb-4 tracking-wide">
            {content.reading_time_minutes && (
              <span>{content.reading_time_minutes} min read</span>
            )}
            {content.reading_time_minutes && <span>·</span>}
            <span>{new Date(content.created_at).toLocaleDateString()}</span>
          </div>

          {/* Original URL */}
          <a
            href={content.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${linkColorClasses} text-sm hover:opacity-70 transition-opacity inline-flex items-center gap-1 mb-6`}
          >
            View original
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>

          {/* Thumbnail */}
          {content.thumbnail_url && (
            <div className="mt-6">
              <img
                src={content.thumbnail_url}
                alt=""
                className="w-full opacity-90 hover:opacity-100 transition-opacity"
              />
            </div>
          )}
        </header>

        {/* Description/Lead paragraph */}
        {content.description && (
          <div
            className={`${fontSizeClasses[fontSize]} leading-relaxed mb-8 italic font-serif border-l-2 border-[var(--color-border)] pl-6 text-[var(--color-text-secondary)]`}
          >
            {content.description}
          </div>
        )}

        {/* Main Content */}
        <div
          id="reader-content"
          className={`max-w-none ${fontSizeClasses[fontSize]} leading-relaxed text-[var(--color-text-secondary)]`}
        >
          {content.full_text ? (
            <HighlightRenderer
              html={content.full_text}
              highlights={highlights}
            />
          ) : (
            <div className="text-center py-12 opacity-60">
              <p>Full content not available yet.</p>
              <p className="text-sm mt-2">
                {content.processing_status === "processing" &&
                  "Content is being extracted..."}
                {content.processing_status === "pending" &&
                  "Content extraction is pending..."}
                {content.processing_status === "failed" &&
                  "Content extraction failed. Please visit the original URL."}
              </p>
            </div>
          )}
        </div>

        {/* Similar Articles Section */}
        {showSimilar && similarArticles.length > 0 && (
          <div className="mt-12 pt-8 border-t border-[var(--color-border)]">
            <h2 className="font-serif text-2xl font-normal mb-6 text-[var(--color-text-primary)]">
              Similar Articles
            </h2>
            <div className="grid gap-4">
              {similarArticles.map(({ item, similarity_score }) => (
                <Link
                  key={item.id}
                  href={`/content/${item.id}`}
                  className="block p-4 rounded-none border border-[var(--color-border)] transition-colors hover:border-[var(--color-accent)]"
                >
                  <div className="flex items-start gap-4">
                    {item.thumbnail_url && (
                      <img
                        src={item.thumbnail_url}
                        alt=""
                        className="w-20 h-20 object-cover flex-shrink-0 opacity-80 hover:opacity-100 transition-opacity"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-serif font-medium mb-1 ${linkColorClasses}`}
                      >
                        {item.title || "Untitled"}
                      </h3>
                      {item.description && (
                        <p className="text-sm text-[var(--color-text-muted)] line-clamp-2 mb-2">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-[var(--color-text-faint)]">
                        <span className="text-[var(--color-accent)] font-medium">
                          {Math.round(similarity_score * 100)}% similar
                        </span>
                        {item.reading_time_minutes && (
                          <>
                            <span>•</span>
                            <span>{item.reading_time_minutes} min read</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
