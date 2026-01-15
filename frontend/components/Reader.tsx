"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ContentItem } from "@/types";
import { searchAPI } from "@/lib/api";

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

  return (
    <div className={`min-h-screen ${themeClasses[theme]} transition-colors`}>
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

      {/* Article Content */}
      <article className="max-w-4xl mx-auto px-4 py-8">
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
          className={`prose ${theme === "dark" ? "prose-invert" : theme === "sepia" ? "prose-amber" : ""} max-w-none ${fontSizeClasses[fontSize]} leading-relaxed`}
        >
          {content.full_text ? (
            <div dangerouslySetInnerHTML={{ __html: content.full_text }} />
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
