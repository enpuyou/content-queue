"use client";

import ThemeToggle from "@/components/ThemeToggle";
import { usePlayer } from "@/contexts/PlayerContext";
import { useEffect, useRef } from "react";
import BackgroundDecoration from "@/components/BackgroundDecoration";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import SediLogo from "@/components/SediLogo";
import RetroLoader from "@/components/RetroLoader";

const features = [
  {
    word: "Read",
    desc: "Save articles, customize typography, highlight passages, focus on what matters.",
  },
  {
    word: "Listen",
    desc: "Build a vinyl collection from Discogs, queue tracks, play through YouTube.",
  },
  {
    word: "Discover",
    desc: "Semantic search, AI-facilitated tags generation, mood-based recommendations, connections between ideas.",
  },
];

export default function Home() {
  const { user, isLoading } = useAuth();
  const { addToQueue, setIndex, queue } = usePlayer();
  const router = useRouter();
  const sectionsRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  // Pre-load specific track for demo (only if queue is empty)
  useEffect(() => {
    if (hasInitialized.current) return;

    // Check if we already have the specific track or if queue is empty
    const demoTrackId = "ProvVFrF6b8";
    const hasTrack = queue.some((t) => t.videoId === demoTrackId);

    if (!hasTrack && queue.length === 0) {
      addToQueue({
        videoId: demoTrackId,
        title: "A・I・R (Air In Resort)",
        artist: "Hiroshi Yoshimura",
        cover_url: "https://www.jazzmessengers.com/80176/air-in-resort.jpg",
      });
      // Set as current track (index 0) but DO NOT play
      // We need a small timeout to allow state update if batched, but usually safe
      setTimeout(() => setIndex(0), 100);
      hasInitialized.current = true;
    } else if (hasTrack) {
      // If track exists, ensure it's selected if nothing else is playing?
      // User just wants it ready. If they navigated away and back, it might still be there.
      hasInitialized.current = true;
    }
  }, [addToQueue, setIndex, queue]);

  // Scroll-triggered reveal for below-fold sections
  useEffect(() => {
    const container = sectionsRef.current;
    if (!container) return;
    const els = container.querySelectorAll(".reveal-section");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-reveal-up");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)]">
        <RetroLoader
          text="loading"
          className="text-sm text-[var(--color-text-secondary)]"
        />
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-bg-primary)] min-h-screen relative overflow-hidden">
      <BackgroundDecoration />
      {/* Top Right: Theme Toggle — aligned with GlobalPlayer's h-14 bar */}
      <div
        className="fixed top-0 right-0 z-50 animate-reveal-fade px-6 h-14 flex items-center"
        style={{ animationDelay: "0.5s" }}
      >
        <ThemeToggle />
      </div>

      {/* Hero — full viewport */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center pointer-events-none">
        <div
          className="animate-reveal-fade pointer-events-auto"
          style={{ animationDelay: "0.1s" }}
        >
          <SediLogo size={100} className="text-[var(--color-text-primary)]" />
        </div>

        <h1
          className="mt-8 text-6xl sm:text-7xl font-normal tracking-tight text-[var(--color-text-primary)] animate-reveal-up pointer-events-auto"
          style={{
            fontFamily: "var(--font-logo), Georgia, serif",
            animationDelay: "0.3s",
          }}
        >
          sed.i
        </h1>

        <div className="mt-8 flex items-center gap-4 sm:gap-6 pointer-events-auto">
          {["curate", "read", "listen"].map((word, i) => (
            <span
              key={word}
              className="font-mono text-xs sm:text-sm tracking-widest text-[var(--color-text-muted)] animate-reveal-up"
              style={{ animationDelay: `${0.6 + i * 0.15}s` }}
            >
              {word}.
            </span>
          ))}
        </div>

        <div
          className="mt-12 flex items-center gap-4 animate-reveal-up pointer-events-auto"
          style={{ animationDelay: "1.1s" }}
        >
          <Link
            href="/login"
            className="compact-touch text-xs px-2 py-0.5 leading-none rounded-none bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors no-underline"
            style={{ color: "var(--color-text-primary)" }}
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="compact-touch text-xs px-2 py-0.5 leading-none rounded-none bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors no-underline"
            style={{ color: "var(--color-text-primary)" }}
          >
            Sign up
          </Link>
        </div>

        {/* Scroll hint */}
        <div
          className="absolute bottom-8 animate-reveal-fade"
          style={{ animationDelay: "1.6s" }}
        >
          <div className="w-px h-8 bg-[var(--color-border)] mx-auto" />
        </div>
      </section>

      {/* Feature sections — below the fold */}
      <div
        ref={sectionsRef}
        className="relative z-10 max-w-2xl mx-auto px-6 pb-24 pointer-events-none"
      >
        {features.map((f, i) => (
          <section
            key={f.word}
            className={`reveal-section py-16 pointer-events-auto ${i > 0 ? "border-t border-[var(--color-border-subtle)]" : ""}`}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-faint)]">
              0{i + 1}
            </span>
            <h2
              className="mt-3 font-serif text-4xl sm:text-5xl font-normal text-[var(--color-text-primary)]"
              style={{ letterSpacing: "-0.02em" }}
            >
              {f.word}
            </h2>
            <p className="mt-4 text-[var(--color-text-secondary)] max-w-md leading-relaxed">
              {f.desc}
            </p>
          </section>
        ))}

        {/* Footer */}
        <div className="border-t border-[var(--color-border-subtle)] pt-8 pb-12 flex items-center justify-between pointer-events-auto">
          <Link
            href="/guide"
            className="compact-touch font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)] transition-colors no-underline"
          >
            Guide
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-faint)]">
            sed.i
          </span>
        </div>
      </div>
    </div>
  );
}
