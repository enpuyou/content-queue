"use client";

import { useState, Suspense } from "react";
import AddContentForm from "@/components/AddContentForm";
import SearchBar from "@/components/SearchBar";
import StatsCards from "@/components/StatsCards";
import ContentList from "@/components/ContentList";
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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">Content Queue</h1>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/lists"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Lists
              </Link>
              <button
                className="text-gray-600 hover:text-gray-900"
                onClick={logout}
              >
                Logout
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-600 hover:text-gray-900"
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
            <div className="md:hidden pb-4 border-t border-gray-200 pt-4">
              <Link
                href="/lists"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-base font-medium hover:bg-gray-50"
              >
                Lists
              </Link>
              <button
                className="block w-full text-left text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-base font-medium hover:bg-gray-50"
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Search Bar */}
          <div className="flex justify-center">
            <SearchBar />
          </div>
          {/* Stats Cards */}
          <StatsCards />
          {/* Add Content Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Add New Content</h2>
            <AddContentForm onContentAdded={handleContentAdded} />
          </div>

          {/* Content List Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Your Queue</h2>
            <Suspense fallback={<div className="text-center py-8 text-gray-500">Loading...</div>}>
              <ContentList key={refreshTrigger} />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
