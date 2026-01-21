"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ContentItem } from "@/types";
import { searchAPI, highlightsAPI } from "@/lib/api";
import HighlightToolbar from "./HighlightToolbar";
import HighlightRenderer from "./HighlightRenderer";
import HighlightsPanel from "./HighlightsPanel";

interface ReaderProps {
  content: ContentItem;
  onStatusChange: (updates: {
    is_read?: boolean;
    is_archived?: boolean;
    read_position?: number;
  }) => void;
}

export default function Reader({ content, onStatusChange }: ReaderProps) {
  // UI state
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">(
    "medium",
  );
  const [theme, setTheme] = useState<"light" | "sepia" | "dark">("light");

  // Similar articles state
  const [showSimilar, setShowSimilar] = useState(false);
  const [similarArticles, setSimilarArticles] = useState<
    Array<{
      item: ContentItem;
      similarity_score: number;
    }>
  >([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  const [selection, setSelection] = useState<{
    text: string;
    startOffset: number;
    endOffset: number;
    position: { x: number; y: number };
  } | null>(null);

  const [isCreatingHighlight, setIsCreatingHighlight] = useState(false);

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
  const [loadingHighlights, setLoadingHighlights] = useState(false);

  // Store original plain text for offset calculation
  const [originalPlainText, setOriginalPlainText] = useState<string>("");

  // Highlights panel visibility
  const [showHighlightsPanel, setShowHighlightsPanel] = useState(false);

  // Fetch highlights when article loads
  const fetchHighlights = useCallback(async () => {
    try {
      setLoadingHighlights(true);
      console.log("Fetching highlights for content:", content.id);
      const data = await highlightsAPI.getByContent(content.id);
      console.log("Highlights fetched:", data);
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
    console.log("Original plain text extracted:", {
      length: plainText.length,
      preview: plainText.substring(0, 100),
    });
  }, [content.full_text, content.id]); // Also depend on content.id to refresh on article change

  // Auto-mark as read when user opens the article
  useEffect(() => {
    if (!content.is_read) {
      // Wait 2 seconds before marking as read (ensures user is actually reading)
      const timer = setTimeout(() => {
        onStatusChange({ is_read: true });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [content.is_read, onStatusChange]);

  // Track scroll position and save periodically
  useEffect(() => {
    let saveTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      // Calculate scroll percentage
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? scrollTop / docHeight : 0;

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
  }, [content.id, content.read_position, onStatusChange]);

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
  }, [content.id]); // Only run when article changes

  // highlight
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // Check if click was on the toolbar - if so, ignore
      const target = e.target as HTMLElement;
      if (target.closest(".highlight-toolbar")) {
        return;
      }

      const selection = window.getSelection();

      // Check if user clicked on an existing highlight (without selecting new text)
      if (!selection || selection.toString().length === 0) {
        // Check if the click was on a highlighted span
        if (target.dataset.highlightId) {
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
            } as any);
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
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
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
      console.error("Failed to find similar articles:", error);
      alert(
        "Failed to find similar articles. This article may not have embeddings yet.",
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

  const themeClasses = {
    light: "bg-white text-gray-900",
    sepia: "bg-amber-50 text-amber-950",
    dark: "bg-gray-900 text-gray-100",
  };

  const linkColorClasses = {
    light: "text-blue-600 hover:text-blue-800",
    sepia: "text-amber-700 hover:text-amber-900",
    dark: "text-blue-400 hover:text-blue-300",
  };

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

    // Get selected text
    const selectedText = selection.toString();

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
      console.log("getTextOffsets (exact match):", {
        selectedText: selectedText.substring(0, 50),
        startOffset: exactMatchIndex,
        endOffset: exactMatchIndex + selectedText.length,
        plainTextLength: plainText.length,
      });

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

      console.log("getTextOffsets (context match):", {
        selectedText: selectedText.substring(0, 50),
        startOffset,
        endOffset,
        plainTextLength: plainText.length,
      });

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
    <div className={`min-h-screen ${themeClasses[theme]} transition-colors`}>
      <HighlightToolbar
        selection={selection}
        contentId={content.id}
        onClose={() => setSelection(null)}
        onHighlightCreated={fetchHighlights}
      />
      {/* Sticky Header with Controls */}
      <div
        className={`sticky top-0 z-10 ${themeClasses[theme]} border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"} shadow-sm`}
      >
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Back Button */}
            <a
              href="/dashboard"
              className={`${linkColorClasses[theme]} text-sm font-medium hover:underline`}
            >
              ← Back to Queue
            </a>

            {/* Reading Controls */}
            <div className="flex items-center gap-4">
              {/* Font Size Control */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium opacity-70">Size:</span>
                <div className="flex gap-1">
                  {(["small", "medium", "large"] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setFontSize(size)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        fontSize === size
                          ? theme === "dark"
                            ? "bg-gray-700 text-white"
                            : "bg-gray-200 text-gray-900"
                          : theme === "dark"
                            ? "bg-gray-800 text-gray-400 hover:bg-gray-700"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {size === "small" ? "A" : size === "medium" ? "A" : "A"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Control */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium opacity-70">Theme:</span>
                <div className="flex gap-1">
                  {(["light", "sepia", "dark"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`w-6 h-6 rounded border-2 transition-all ${
                        theme === t
                          ? "border-blue-500 scale-110"
                          : "border-gray-300 opacity-60 hover:opacity-100"
                      } ${
                        t === "light"
                          ? "bg-white"
                          : t === "sepia"
                            ? "bg-amber-50"
                            : "bg-gray-900"
                      }`}
                      title={t.charAt(0).toUpperCase() + t.slice(1)}
                    />
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div
                className="flex items-center gap-2 flex-wrap"
                style={{
                  borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
                }}
              >
                <button
                  onClick={() => setShowHighlightsPanel(!showHighlightsPanel)}
                  className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                    showHighlightsPanel
                      ? theme === "dark"
                        ? "bg-yellow-900 text-yellow-200 hover:bg-yellow-800"
                        : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                      : theme === "dark"
                        ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {showHighlightsPanel ? "Hide" : "Show"} Highlights{" "}
                  {highlights.length > 0 && `(${highlights.length})`}
                </button>
                <button
                  onClick={() =>
                    onStatusChange({ is_archived: !content.is_archived })
                  }
                  className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                    content.is_archived
                      ? theme === "dark"
                        ? "bg-blue-900 text-blue-200 hover:bg-blue-800"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      : theme === "dark"
                        ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {content.is_archived ? "Unarchive" : "Archive"}
                </button>
                <button
                  onClick={handleFindSimilar}
                  disabled={loadingSimilar}
                  className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                    theme === "dark"
                      ? "bg-purple-900 text-purple-200 hover:bg-purple-800"
                      : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loadingSimilar
                    ? "Loading..."
                    : showSimilar
                      ? "Hide Similar"
                      : "Find Similar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Highlights Panel Sidebar */}
      {showHighlightsPanel && (
        <div
          className={`fixed right-0 top-0 h-full w-80 ${themeClasses[theme]} border-l ${theme === "dark" ? "border-gray-700" : "border-gray-200"} shadow-xl z-20 overflow-hidden flex flex-col`}
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
      <article
        className={`max-w-4xl mx-auto px-4 py-8 transition-all ${showHighlightsPanel ? "mr-80" : ""}`}
      >
        {/* Article Header */}
        <header className="mb-8">
          <h1
            className={`font-bold mb-4 leading-tight ${fontSize === "small" ? "text-3xl" : fontSize === "medium" ? "text-4xl" : "text-5xl"}`}
          >
            {content.title || "Untitled Article"}
          </h1>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-sm opacity-70 mb-4">
            {content.reading_time_minutes && (
              <span>{content.reading_time_minutes} min read</span>
            )}
            <span>•</span>
            <span>{new Date(content.created_at).toLocaleDateString()}</span>
          </div>

          {/* Original URL */}
          <a
            href={content.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${linkColorClasses[theme]} text-sm hover:underline inline-flex items-center gap-1`}
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
                className="w-full rounded-lg"
              />
            </div>
          )}
        </header>

        {/* Description */}
        {content.description && (
          <div
            className={`${fontSizeClasses[fontSize]} leading-relaxed mb-8 opacity-80 italic border-l-4 pl-4 ${theme === "dark" ? "border-gray-700" : "border-gray-300"}`}
          >
            {content.description}
          </div>
        )}

        {/* Main Content */}
        <div
          id="reader-content"
          className={`prose ${theme === "dark" ? "prose-invert" : theme === "sepia" ? "prose-amber" : ""} max-w-none ${fontSizeClasses[fontSize]} leading-relaxed`}
        >
          {content.full_text ? (
            <HighlightRenderer
              html={content.full_text}
              highlights={highlights}
              onHighlightClick={(highlight) => {
                console.log("Clicked highlight:", highlight);
              }}
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
          <div
            className={`mt-12 pt-8 border-t ${theme === "dark" ? "border-gray-700" : "border-gray-300"}`}
          >
            <h2 className="text-2xl font-bold mb-6">Similar Articles</h2>
            <div className="grid gap-4">
              {similarArticles.map(({ item, similarity_score }) => (
                <Link
                  key={item.id}
                  href={`/content/${item.id}`}
                  className={`block p-4 rounded-lg border transition-colors ${
                    theme === "dark"
                      ? "bg-gray-800 border-gray-700 hover:bg-gray-750"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {item.thumbnail_url && (
                      <img
                        src={item.thumbnail_url}
                        alt=""
                        className="w-20 h-20 object-cover rounded flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-semibold mb-1 ${linkColorClasses[theme]}`}
                      >
                        {item.title || "Untitled"}
                      </h3>
                      {item.description && (
                        <p className="text-sm opacity-70 line-clamp-2 mb-2">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs opacity-60">
                        <span className="text-purple-600 dark:text-purple-400 font-medium">
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
