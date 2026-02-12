"use client";

import { useRef, Suspense, useState } from "react";
import AddContentForm from "@/components/AddContentForm";
import ContentList from "@/components/ContentList";
import Navbar from "@/components/Navbar";
import RecommendedSection from "@/components/RecommendedSection";
import MoodSelector from "@/components/MoodSelector";
import PickForMe from "@/components/PickForMe";
import { ContentItem } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { SHOW_FOR_YOU } from "@/lib/flags";

export default function DashboardClient() {
  const { user } = useAuth();
  const [showRecommended, setShowRecommended] = useState(false);
  const [mood, setMood] = useState<string | undefined>();
  const contentListRef = useRef<{ addNewItem: (item: ContentItem) => void }>(
    null,
  );

  const handleContentAdded = (newItem: ContentItem) => {
    // Pass the new item to ContentList for optimistic update
    contentListRef.current?.addNewItem(newItem);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <Navbar />

      <main className="max-w-2xl mx-auto px-5 sm:px-6 lg:px-8 py-8">
        <div className="space-y-4">
          {/* Header with Title and Add Form */}
          <div>
            <h1 className="font-serif text-3xl font-normal text-[var(--color-text-primary)] mt-6">
              {/* Prevent flash: render nothing or skeleton while loading, default to Hello */}
              {!user ? (
                // While loading or not logged in, show neutral
                <span className="opacity-0">Hello</span>
              ) : (
                (() => {
                  const hour = new Date().getHours();
                  let greeting = "Hello";
                  if (hour < 12) greeting = "Good morning";
                  else if (hour < 18) greeting = "Good afternoon";
                  else greeting = "Good evening";

                  return user.full_name
                    ? `${greeting}, ${user.full_name.split(" ")[0]}`
                    : greeting;
                })()
              )}
            </h1>
            {/* Add Content Form */}
            <div className="mt-2">
              <AddContentForm onContentAdded={handleContentAdded} />
            </div>
          </div>

          {/* Recommended Section */}
          {showRecommended ? (
            <div className="space-y-4 border-t border-[var(--color-border)] pt-6">
              <div>
                <h2 className="font-serif text-xl font-normal text-[var(--color-text-primary)] mb-3">
                  For You
                </h2>
                <MoodSelector mood={mood} setMood={setMood} />
              </div>
              <Suspense
                fallback={
                  <div className="text-center py-8 text-[var(--color-text-muted)]">
                    Loading recommendations...
                  </div>
                }
              >
                <RecommendedSection mood={mood} />
              </Suspense>
              <button
                onClick={() => setShowRecommended(false)}
                className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                ← Back to all
              </button>
            </div>
          ) : (
            <>
              {/* Quick Actions Row */}
              {SHOW_FOR_YOU && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRecommended(true)}
                    className="flex-1 px-4 py-2 rounded text-sm border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                  >
                    For You ✨
                  </button>
                  <div className="flex-1">
                    <PickForMe />
                  </div>
                </div>
              )}

              {/* Content List Section */}
              <div className="space-y-4">
                <Suspense
                  fallback={
                    <div className="text-center py-8 text-[var(--color-text-muted)]">
                      Loading...
                    </div>
                  }
                >
                  <ContentList ref={contentListRef} />
                </Suspense>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
