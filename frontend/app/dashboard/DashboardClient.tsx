"use client";

import { useState, Suspense } from "react";
import AddContentForm from "@/components/AddContentForm";
import SearchBar from "@/components/SearchBar";
import StatsCards from "@/components/StatsCards";
import ContentList from "@/components/ContentList";
import ThemeToggle from "@/components/ThemeToggle";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardClient() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { logout } = useAuth();

  const handleContentAdded = () => {
    // Trigger refresh of content list
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <nav className="bg-[var(--color-bg-primary)] border-b border-[var(--color-border)] sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="font-serif text-xl font-normal text-[var(--color-text-primary)]">
              Content Queue
            </h1>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/lists"
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-sm font-medium transition-colors"
              >
                Lists
              </Link>
              <ThemeToggle />
              <button
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-sm font-medium transition-colors"
                onClick={logout}
              >
                Logout
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                // X icon when menu is open
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                // Hamburger icon when menu is closed
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile Menu - now controlled by React state */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 border-t border-[var(--color-border)] pt-4 space-y-2">
              <Link
                href="/lists"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] px-3 py-2 text-sm font-medium transition-colors"
              >
                Lists
              </Link>
              <div className="px-3 py-2">
                <ThemeToggle />
              </div>
              <button
                className="block w-full text-left text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] px-3 py-2 text-sm font-medium transition-colors"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="flex justify-center">
            <SearchBar />
          </div>

          {/* Stats Cards */}
          <StatsCards />

          {/* Add Content Section */}
          <div className="space-y-4">
            <h2 className="font-serif text-lg font-normal text-[var(--color-text-primary)]">
              Add New Content
            </h2>
            <AddContentForm onContentAdded={handleContentAdded} />
          </div>

          {/* Content List Section */}
          <div className="space-y-4">
            <h2 className="font-serif text-lg font-normal text-[var(--color-text-primary)]">
              Your Queue
            </h2>
            <Suspense
              fallback={
                <div className="text-center py-8 text-[var(--color-text-muted)]">
                  Loading...
                </div>
              }
            >
              <ContentList key={refreshTrigger} />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
