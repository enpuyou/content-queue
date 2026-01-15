"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { searchAPI } from "@/lib/api";
import Link from "next/link";

/**
 * SearchBar Component
 *
 * Provides semantic search functionality:
 * - Debounced search (waits 300ms after user stops typing)
 * - Dropdown with live results
 * - Shows similarity scores
 * - Click result to navigate to article
 */

interface SearchResult {
  item: {
    id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    reading_time_minutes: number | null;
  };
  similarity_score: number;
}

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  /**
   * Debounced search - waits for user to stop typing
   * This prevents making too many API calls while typing
   */
  useEffect(() => {
    // Don't search if query is too short
    if (query.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    // Set a timeout to delay the search
    const timeoutId = setTimeout(async () => {
      try {
        setLoading(true);
        const searchResults = await searchAPI.semantic(query);
        setResults(searchResults);
        setShowResults(true);
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300); // Wait 300ms after user stops typing

    // Cleanup: cancel the timeout if user types again
    return () => clearTimeout(timeoutId);
  }, [query]);

  /**
   * Close dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * Handle selecting a result
   */
  const handleSelectResult = (id: string) => {
    setShowResults(false);
    setQuery("");
    router.push(`/content/${id}`);
  };

  /**
   * Format similarity score as percentage
   */
  const formatScore = (score: number) => {
    return `${Math.round(score * 100)}% match`;
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your content..."
          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        {/* Search Icon / Loading Spinner */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {loading ? (
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          ) : (
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
          {results.map((result) => (
            <button
              key={result.item.id}
              onClick={() => handleSelectResult(result.item.id)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-start gap-3">
                {/* Thumbnail (if available) */}
                {result.item.thumbnail_url && (
                  <img
                    src={result.item.thumbnail_url}
                    alt=""
                    className="w-12 h-12 object-cover rounded flex-shrink-0"
                  />
                )}

                {/* Content Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">
                    {result.item.title || "Untitled"}
                  </h4>
                  {result.item.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {result.item.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-blue-600 font-medium">
                      {formatScore(result.similarity_score)}
                    </span>
                    {result.item.reading_time_minutes && (
                      <span className="text-xs text-gray-500">
                        {result.item.reading_time_minutes} min read
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {showResults && !loading && query.length >= 3 && results.length === 0 && (
        <div className="absolute w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
          <p className="text-gray-500 text-center">
            No results found for "{query}"
          </p>
        </div>
      )}
    </div>
  );
}
