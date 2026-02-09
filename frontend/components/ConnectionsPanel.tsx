"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { searchAPI } from "@/lib/api";
import RetroLoader from "./RetroLoader";

interface HighlightPair {
  user_highlight_id: string;
  user_highlight_text: string;
  connected_highlight_id: string;
  connected_highlight_text: string;
  similarity: number;
}

interface ArticleConnection {
  article_id: string;
  article_title: string;
  highlight_pairs: HighlightPair[];
  total_similarity: number;
}

interface ConnectionsPanelProps {
  contentId: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToArticle?: (contentId: string) => void;
}

export default function ConnectionsPanel({
  contentId,
  isOpen: _isOpen,
  onClose: _onClose,
  onNavigateToArticle,
}: ConnectionsPanelProps) {
  const [connections, setConnections] = useState<ArticleConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await searchAPI.findArticleConnections(contentId);
        setConnections(data);
      } catch (err) {
        console.error("Failed to load connections:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load connections",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, [contentId]);

  const handleNavigateToArticle = (articleId: string, highlightId?: string) => {
    const url = `/content/${articleId}${highlightId ? `#${highlightId}` : ""}`;
    onNavigateToArticle?.(articleId);
    router.push(url);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col h-full">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <RetroLoader
              text="Fetching highlight connections"
              className="text-[var(--color-text-muted)]"
            />
          </div>
        )}

        {!loading && error && (
          <div className="p-4 text-center text-red-500 text-sm">
            <p>{error}</p>
          </div>
        )}

        {!loading && connections.length === 0 && (
          <div className="px-4 py-8 text-center text-[var(--color-text-muted)]">
            <div className="mb-2 text-4xl">🔗</div>
            <p className="text-sm font-medium mb-1">No connections yet</p>
            <p className="text-xs text-[var(--color-text-faint)]">
              Highlight similar concepts across articles to discover connections
            </p>
          </div>
        )}

        {!loading && connections.length > 0 && (
          <>
            {/* Connections List - Scrollable */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-8">
              {connections.map((articleConnection) => (
                <div
                  key={articleConnection.article_id}
                  className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-none shadow-lg"
                >
                  {/* Article Title - clickable */}
                  <button
                    onClick={() =>
                      handleNavigateToArticle(articleConnection.article_id)
                    }
                    className="w-full text-left p-3 hover:bg-[var(--color-bg-tertiary)] transition-colors"
                  >
                    <h4 className="text-sm font-serif font-medium text-[var(--color-text-primary)] line-clamp-2">
                      {articleConnection.article_title}
                    </h4>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      {articleConnection.highlight_pairs.length} highlight
                      {articleConnection.highlight_pairs.length !== 1
                        ? "s"
                        : ""}
                    </p>
                  </button>

                  {/* Highlight Pairs */}
                  <div className="bg-[var(--color-bg-tertiary)] border-t border-[var(--color-border)] px-3 py-2 space-y-2">
                    {articleConnection.highlight_pairs
                      .slice(0, 3)
                      .map((pair, idx) => (
                        <div key={idx} className="text-xs">
                          <p className="text-[var(--color-text-muted)] mb-1">
                            {(pair.similarity * 100).toFixed(0)}% match
                          </p>
                          <div className="space-y-1">
                            <p className="block text-left text-[var(--color-text-primary)] text-xs line-clamp-2">
                              <span className="text-[var(--color-text-muted)]">
                                Your:{" "}
                              </span>
                              {pair.user_highlight_text}
                            </p>
                            <button
                              onClick={() =>
                                handleNavigateToArticle(
                                  articleConnection.article_id,
                                  pair.connected_highlight_id,
                                )
                              }
                              className="block text-left text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors text-xs line-clamp-2"
                            >
                              <span className="text-[var(--color-text-muted)]">
                                Their:{" "}
                              </span>
                              {pair.connected_highlight_text}
                            </button>
                          </div>
                        </div>
                      ))}
                    {articleConnection.highlight_pairs.length > 3 && (
                      <p className="text-xs text-[var(--color-text-muted)] pt-1">
                        +{articleConnection.highlight_pairs.length - 3} more
                        connections
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
