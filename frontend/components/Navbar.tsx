"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import { usePathname } from "next/navigation";
import { SHOW_CRATES } from "@/lib/flags";
import NowPlaying from "@/components/NowPlaying";

// Nav link that forces text-primary color (overrides global `a` color rule)
function NavLink({
  href,
  active,
  onClick,
  children,
}: {
  href: string;
  active: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`text-xs px-2 py-0.5 leading-none rounded-none border transition-colors no-underline ${
        active
          ? "bg-[var(--color-bg-secondary)] border-[var(--color-accent)]"
          : "bg-[var(--color-bg-secondary)] border-[var(--color-border)] hover:border-[var(--color-accent)]"
      }`}
      style={{ color: "var(--color-text-primary)" }}
    >
      {children}
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  const isQueueActive = pathname === "/dashboard";
  const isListsActive = pathname === "/lists";
  const isSettingsActive = pathname === "/settings";
  const isCratesActive =
    pathname === "/crates" || pathname.startsWith("/crates/");

  // Scroll-based visibility
  useEffect(() => {
    const SCROLL_THRESHOLD = 10;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const deltaY = scrollY - lastScrollY.current;

      if (Math.abs(deltaY) > SCROLL_THRESHOLD) {
        if (deltaY > 0 && scrollY > 100) {
          setIsVisible(false);
        } else if (deltaY < 0 || scrollY < 50) {
          setIsVisible(true);
        }
        lastScrollY.current = scrollY;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <nav
      className={`sticky top-0 z-50 w-full transition-transform duration-300 ${isVisible ? "translate-y-0" : "-translate-y-full"}`}
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between w-full h-14 pl-2">
          {/* Left: Logo & Player */}
          <div className="flex items-center gap-4 w-1/4">
            <Link
              href="/dashboard"
              className="text-xl font-normal whitespace-nowrap flex items-center shrink-0 no-underline hover:opacity-100"
              style={{
                fontFamily: "var(--font-logo)",
                color: "var(--color-text-primary)",
              }}
            >
              sed.i
            </Link>
            <div className="hidden md:block">
              <NowPlaying />
            </div>
          </div>

          {/* Center: Search */}
          <div className="hidden md:flex flex-1 justify-center max-w-lg mx-4">
            <div className="w-full">
              <SearchBar />
            </div>
          </div>

          {/* Right: Navigation Links & Theme Toggle (Desktop) */}
          <div className="hidden md:flex items-center justify-end gap-2 w-1/4">
            <ThemeToggle />
            <NavLink href="/dashboard" active={isQueueActive}>
              Queue
            </NavLink>
            <NavLink href="/lists" active={isListsActive}>
              Lists
            </NavLink>
            {SHOW_CRATES && (
              <NavLink href="/crates" active={isCratesActive}>
                Crates
              </NavLink>
            )}
            <NavLink href="/settings" active={isSettingsActive}>
              Settings
            </NavLink>
          </div>

          {/* Mobile: Theme Toggle and Menu Button */}
          <div className="flex md:hidden items-center gap-2 -mr-2">
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
          <div
            className="fixed inset-0 z-10 md:hidden"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />

          <div className="absolute top-full left-0 right-0 bg-[var(--color-bg-primary)] border-b border-[var(--color-border)] shadow-lg z-20 md:hidden">
            <div className="px-4 py-4 space-y-3">
              <SearchBar />

              <div className="flex flex-col gap-2">
                <NavLink
                  href="/dashboard"
                  active={isQueueActive}
                  onClick={closeMobileMenu}
                >
                  Queue
                </NavLink>
                <NavLink
                  href="/lists"
                  active={isListsActive}
                  onClick={closeMobileMenu}
                >
                  Lists
                </NavLink>
                {SHOW_CRATES && (
                  <NavLink
                    href="/crates"
                    active={isCratesActive}
                    onClick={closeMobileMenu}
                  >
                    Crates
                  </NavLink>
                )}
                <NavLink
                  href="/settings"
                  active={isSettingsActive}
                  onClick={closeMobileMenu}
                >
                  Settings
                </NavLink>
              </div>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
