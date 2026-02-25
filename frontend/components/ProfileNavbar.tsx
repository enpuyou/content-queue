"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import SediLogo from "@/components/SediLogo";

// Reuses the exact same NavLink style as Navbar
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
      className={`compact-touch text-xs px-2 py-0.5 leading-none rounded-none border transition-colors no-underline ${
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

interface ProfileNavbarProps {
  username: string;
  showQueue?: boolean;
  showCrates?: boolean;
  activeTab?: "queue" | "crates";
  onTabChange?: (tab: "queue" | "crates") => void;
}

export default function ProfileNavbar({
  username,
  showQueue = false,
  showCrates = false,
  activeTab,
  onTabChange,
}: ProfileNavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Scroll-based visibility — identical to Navbar
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

  const tabs = [
    ...(showQueue
      ? [{ key: "queue" as const, label: "Queue", href: `/${username}` }]
      : []),
    ...(showCrates
      ? [
          {
            key: "crates" as const,
            label: "Crates",
            href: `/${username}?tab=crates`,
          },
        ]
      : []),
  ];

  return (
    <nav
      className={`sticky top-0 z-50 w-full transition-transform duration-300 ${isVisible ? "translate-y-0" : "-translate-y-full"}`}
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between w-full h-14">
          {/* Left: Logo + @username identity */}
          <div className="flex items-center gap-3">
            <Link
              href={`/${username}`}
              className="text-xl font-normal whitespace-nowrap flex items-center gap-2 shrink-0 no-underline hover:opacity-100"
              style={{
                fontFamily: "var(--font-logo)",
                color: "var(--color-text-primary)",
              }}
            >
              <SediLogo
                size={20}
                className="text-[var(--color-text-primary)]"
              />
              sed.i
            </Link>
            <span className="text-[var(--color-text-faint)] font-mono text-[11px]">
              /
            </span>
            <span className="text-[var(--color-text-muted)] font-mono text-[11px]">
              @{username}
            </span>
          </div>

          {/* Right: ThemeToggle + enabled tabs (Desktop) */}
          <div className="hidden md:flex items-center justify-end gap-2">
            <ThemeToggle />
            {tabs.map((tab) =>
              onTabChange ? (
                <button
                  key={tab.key}
                  onClick={() => onTabChange(tab.key)}
                  className={`compact-touch text-xs px-2 py-0.5 leading-none rounded-none border transition-colors ${
                    activeTab === tab.key
                      ? "bg-[var(--color-bg-secondary)] border-[var(--color-accent)]"
                      : "bg-[var(--color-bg-secondary)] border-[var(--color-border)] hover:border-[var(--color-accent)]"
                  }`}
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {tab.label}
                </button>
              ) : (
                <NavLink
                  key={tab.key}
                  href={tab.href}
                  active={activeTab === tab.key}
                >
                  {tab.label}
                </NavLink>
              ),
            )}
          </div>

          {/* Mobile: ThemeToggle + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            {tabs.length > 1 && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="compact-touch text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors p-1"
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
            )}
            {/* If only one tab, show it as a button directly */}
            {tabs.length === 1 && onTabChange && (
              <button
                onClick={() => onTabChange(tabs[0].key)}
                className="compact-touch text-xs px-2 py-0.5 leading-none rounded-none border border-[var(--color-accent)] bg-[var(--color-bg-secondary)] transition-colors"
                style={{ color: "var(--color-text-primary)" }}
              >
                {tabs[0].label}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown (only shown when multiple tabs exist) */}
      {isMobileMenuOpen && tabs.length > 1 && (
        <>
          <div
            className="fixed inset-0 z-10 md:hidden"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
          <div className="absolute top-full left-0 right-0 bg-[var(--color-bg-primary)] border-b border-[var(--color-border)] z-20 md:hidden">
            <nav className="border-t border-[var(--color-border-subtle)]">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    onTabChange?.(tab.key);
                    closeMobileMenu();
                  }}
                  className={`compact-touch w-full text-left flex items-center px-5 py-3 font-mono text-[11px] uppercase tracking-widest no-underline transition-colors border-b border-[var(--color-border-subtle)] ${
                    activeTab === tab.key
                      ? "text-[var(--color-text-primary)] bg-[var(--color-bg-secondary)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </>
      )}
    </nav>
  );
}
