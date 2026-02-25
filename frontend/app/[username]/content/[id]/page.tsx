"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Reader from "@/components/Reader";
import { publicAPI } from "@/lib/api";
import { ContentItem } from "@/types";

const GUEST_READS_COUNT_KEY = "publicReadsCount";
const GUEST_READS_OWNER_KEY = "publicReadsOwner";
const GUEST_READ_LIMIT = 3;

export default function PublicContentPage() {
  const params = useParams();
  const username = params.username as string;
  const contentId = params.id as string;

  const [content, setContent] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guestLimitReached, setGuestLimitReached] = useState(false);

  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await publicAPI.getPublicContentItem(username, contentId);
      setContent(data);
    } catch {
      setError("This article is not available.");
    } finally {
      setLoading(false);
    }
  }, [username, contentId]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Guest read limit: track per-owner read count in localStorage
  useEffect(() => {
    if (loading || error || !content) return;

    const owner = localStorage.getItem(GUEST_READS_OWNER_KEY);
    let count = parseInt(
      localStorage.getItem(GUEST_READS_COUNT_KEY) || "0",
      10,
    );

    // Reset count when switching to a different profile
    if (owner !== username) {
      count = 0;
      localStorage.setItem(GUEST_READS_OWNER_KEY, username);
    }

    count += 1;
    localStorage.setItem(GUEST_READS_COUNT_KEY, String(count));

    if (count > GUEST_READ_LIMIT) {
      setGuestLimitReached(true);
    }
  }, [loading, error, content, username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <div className="flex items-center justify-center gap-1 text-[var(--color-text-muted)] font-mono">
          <span className="inline-block animate-pulse">.</span>
          <span className="inline-block animate-pulse [animation-delay:0.3s]">
            .
          </span>
          <span className="inline-block animate-pulse [animation-delay:0.6s]">
            .
          </span>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
          <h1 className="font-serif text-2xl text-[var(--color-text-primary)] mb-2">
            Article Not Found
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm mb-6">
            {error || "This article could not be loaded."}
          </p>
          <Link
            href={`/${username}`}
            className="text-sm border border-[var(--color-border)] px-4 py-2 text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors"
          >
            ← Back to profile
          </Link>
        </main>
      </div>
    );
  }

  if (guestLimitReached) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
          <h1 className="font-serif text-3xl text-[var(--color-text-primary)] mb-3">
            Create a free account to keep reading
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm mb-8">
            You&apos;ve read {GUEST_READ_LIMIT} articles from @{username}&apos;s
            profile. Sign up to read more — and build your own reading queue.
          </p>
          <div className="flex gap-3">
            <Link
              href="/register"
              className="px-5 py-2 bg-[var(--color-accent)] text-white text-sm font-mono uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Sign up free
            </Link>
            <Link
              href={`/${username}`}
              className="px-5 py-2 border border-[var(--color-border)] text-sm font-mono uppercase tracking-widest text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              Back
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return <Reader content={content} onStatusChange={() => {}} />;
}
