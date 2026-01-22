"use client";

import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { logout } = useAuth();
  const pathname = usePathname();

  const isQueueActive = pathname === "/dashboard";
  const isListsActive = pathname === "/lists";

  return (
    <nav className="w-full bg-[var(--color-bg-primary)] border-b border-[var(--color-border)]">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between w-full gap-8 h-20">
          {/* Left: Logo and Search */}
          <div className="flex items-center gap-6 flex-1">
            <Link
              href="/dashboard"
              className="font-serif text-xl font-normal text-white whitespace-nowrap"
            >
              sedi
            </Link>
            <div className="hidden md:block w-96">
              <SearchBar />
            </div>
          </div>

          {/* Right: Navigation Links, Theme Toggle and Logout */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className={`no-underline text-xs px-2 py-1 rounded-none border transition-colors ${
                isQueueActive
                  ? "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-accent)]"
                  : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[var(--color-accent)]"
              }`}
            >
              Queue
            </Link>
            <Link
              href="/lists"
              className={`no-underline text-xs px-2 py-1 rounded-none border transition-colors ${
                isListsActive
                  ? "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-accent)]"
                  : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[var(--color-accent)]"
              }`}
            >
              Lists
            </Link>
            <button
              className="text-xs px-2 py-1 rounded-none border bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] transition-colors border-[var(--color-border)] hover:border-red-600 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
              onClick={logout}
            >
              Logout
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
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
          </button>
        </div>
      </div>
    </nav>
  );
}
