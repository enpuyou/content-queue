"use client";

import { useRef, Suspense } from "react";
import AddContentForm from "@/components/AddContentForm";
import ContentList from "@/components/ContentList";
import Navbar from "@/components/Navbar";
import { ContentItem } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardClient() {
  const { user } = useAuth();
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
            <h1 className="font-serif text-3xl font-normal text-[var(--color-text-primary)]">
              {/* Prevent flash: render nothing or skeleton while loading, default to Hello */}
              {!user ? (
                // While loading or not logged in (though protected route handles not logged in), show neutral
                <span className="opacity-0">Hello</span>
              ) : user.full_name ? (
                `Hello ${user.full_name.split(" ")[0]}`
              ) : (
                "Hello"
              )}
            </h1>
            {/* Add Content Form */}
            <div className="mt-2">
              <AddContentForm onContentAdded={handleContentAdded} />
            </div>
          </div>

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
        </div>
      </main>
    </div>
  );
}
