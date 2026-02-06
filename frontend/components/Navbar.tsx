"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { logout } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  const isQueueActive = pathname === "/dashboard";
  const isListsActive = pathname === "/lists";
  const isSettingsActive = pathname === "/settings";

  // Scroll-based visibility
  useEffect(() => {
    const SCROLL_THRESHOLD = 10;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const deltaY = scrollY - lastScrollY.current;

      if (Math.abs(deltaY) > SCROLL_THRESHOLD) {
        if (deltaY > 0 && scrollY > 100) {
          // Scrolling down & past 100px - hide navbar
          setIsVisible(false);
        } else if (deltaY < 0 || scrollY < 50) {
          // Scrolling up or near top - show navbar
          setIsVisible(true);
        }
        lastScrollY.current = scrollY;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleLogout = () => {
    closeMobileMenu();
    logout();
  };

  return (
    <nav
      className={`sticky top-0 z-50 w-full transition-transform duration-300 ${isVisible ? "translate-y-0" : "-translate-y-full"}`}
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between w-full gap-4 sm:gap-8 h-14">
          {/* Left: Logo and Search */}
          <div className="flex items-center gap-6 flex-1">
            <Link
              href="/dashboard"
              className="font-serif text-xl font-normal text-[var(--color-text-primary)] whitespace-nowrap flex items-center"
            >
              sed.i
            </Link>
            <div className="hidden md:block w-96">
              <SearchBar />
            </div>
          </div>

          {/* Right: Navigation Links, Theme Toggle and Logout (Desktop) */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => (window.location.href = "/dashboard")}
              className={`text-xs px-2 py-0.5 leading-none rounded-none border transition-colors ${
                isQueueActive
                  ? "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-accent)]"
                  : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[var(--color-accent)]"
              }`}
            >
              Queue
            </button>
            <button
              onClick={() => (window.location.href = "/lists")}
              className={`text-xs px-2 py-0.5 leading-none rounded-none border transition-colors ${
                isListsActive
                  ? "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-accent)]"
                  : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[var(--color-accent)]"
              }`}
            >
              Lists
            </button>
            <button
              onClick={() => (window.location.href = "/settings")}
              className={`text-xs px-2 py-0.5 leading-none rounded-none border transition-colors ${
                isSettingsActive
                  ? "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-accent)]"
                  : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[var(--color-accent)]"
              }`}
            >
              Settings
            </button>
            <button
              className="text-xs px-2 py-0.5 leading-none rounded-none border bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] transition-colors border-[var(--color-border)] hover:border-rose-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-red-900/30 dark:hover:text-red-400 dark:hover:border-red-500"
              onClick={logout}
            >
              Logout
            </button>
          </div>

          {/* Mobile: Theme Toggle and Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors p-1"
              aria-label="Toggle mobile menu"
            >
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
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <>
          {/* Overlay to close menu on click outside */}
          <div
            className="fixed inset-0 z-10 md:hidden"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />

          {/* Mobile Menu Content */}
          <div className="absolute top-full left-0 right-0 bg-[var(--color-bg-primary)] border-b border-[var(--color-border)] shadow-lg z-20 md:hidden">
            <div className="px-4 py-4 space-y-3">
              {/* Search Bar */}
              <SearchBar />

              {/* Navigation Links */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    window.location.href = "/dashboard";
                    closeMobileMenu();
                  }}
                  className={`w-full text-xs px-2 py-1 leading-none rounded-none border transition-colors ${
                    isQueueActive
                      ? "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-accent)]"
                      : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[var(--color-accent)]"
                  }`}
                >
                  Queue
                </button>
                <button
                  onClick={() => {
                    window.location.href = "/lists";
                    closeMobileMenu();
                  }}
                  className={`w-full text-xs px-2 py-1 leading-none rounded-none border transition-colors ${
                    isListsActive
                      ? "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-accent)]"
                      : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[var(--color-accent)]"
                  }`}
                >
                  Lists
                </button>
                <button
                  onClick={() => {
                    window.location.href = "/settings";
                    closeMobileMenu();
                  }}
                  className={`w-full text-xs px-2 py-1 leading-none rounded-none border transition-colors ${
                    isSettingsActive
                      ? "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-accent)]"
                      : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[var(--color-accent)]"
                  }`}
                >
                  Settings
                </button>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full text-xs px-2 py-1 leading-none rounded-none border bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] transition-colors border-[var(--color-border)] hover:border-rose-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-red-900/30 dark:hover:text-red-400 dark:hover:border-red-500"
              >
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
