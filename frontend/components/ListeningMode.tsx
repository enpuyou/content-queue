/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { VinylRecord } from "@/types";

interface ListeningModeProps {
  isOpen: boolean;
  onClose: () => void;
  record: VinylRecord | null;
}

export default function ListeningMode({
  isOpen,
  onClose,
  record,
}: ListeningModeProps) {
  const {
    current,
    isPlaying,
    isBuffering,
    toggle,
    next,
    prev,
    progress,
    duration,
    seek,
    queue,
    currentIndex,
    play,
  } = usePlayer();

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const [showControls, setShowControls] = useState(false);

  // Escape to close, Space to toggle controls (desktop)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " ") {
        e.preventDefault();
        setShowControls((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const coverUrl = current?.cover_url || record?.cover_url;
  const artist = current?.artist || record?.artist || "";
  const title = current?.title || record?.title || "";
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  const formatTime = (secs: number) => {
    if (!secs || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seek(Math.max(0, Math.min(duration, percent * duration)));
  };

  // Shared transport controls — used in both layouts
  const transportControls = (
    <div className="flex items-center gap-8 select-none">
      <button
        onClick={prev}
        disabled={currentIndex <= 0}
        className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-15 transition-colors p-1"
        title="Previous"
      >
        <svg width="16" height="16" viewBox="0 0 10 10" fill="currentColor">
          <rect x="0" y="1" width="1.5" height="8" />
          <polygon points="9,1 9,9 2.5,5" />
        </svg>
      </button>
      <button
        onClick={toggle}
        className="text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors p-1"
        title={isPlaying ? "Pause" : "Play"}
      >
        {isBuffering ? (
          <span className="font-mono text-sm tracking-wider">..</span>
        ) : isPlaying ? (
          <svg width="24" height="24" viewBox="0 0 10 10" fill="currentColor">
            <rect x="1" y="1" width="2.5" height="8" />
            <rect x="6.5" y="1" width="2.5" height="8" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 10 10" fill="currentColor">
            <polygon points="2,1 2,9 9,5" />
          </svg>
        )}
      </button>
      <button
        onClick={next}
        disabled={currentIndex >= queue.length - 1}
        className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-15 transition-colors p-1"
        title="Next"
      >
        <svg width="16" height="16" viewBox="0 0 10 10" fill="currentColor">
          <polygon points="1,1 1,9 7.5,5" />
          <rect x="8.5" y="1" width="1.5" height="8" />
        </svg>
      </button>
    </div>
  );

  // Shared progress bar
  const progressBar = (
    <div className="w-full">
      <div
        className="w-full h-px bg-[var(--color-border)] cursor-pointer relative"
        onClick={handleSeek}
      >
        <div
          className="h-full bg-[var(--color-accent)]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="font-mono text-[10px] tabular-nums text-[var(--color-text-faint)]">
          {formatTime(progress)}
        </span>
        <span className="font-mono text-[10px] tabular-nums text-[var(--color-text-faint)]">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );

  // Queue-based tracklist — always reflects the live queue, not just current record
  const tracklist = queue.length > 0 && (
    <div className="w-full overflow-y-auto flex-1 min-h-0">
      <div className="border-t border-[var(--color-border-subtle)] pt-3">
        {queue.map((track, i) => {
          const isCurrent = i === currentIndex;
          return (
            <button
              key={`${track.videoId}-${i}`}
              onClick={() => play(i)}
              className={`w-full flex items-center gap-2 py-1.5 px-1 text-left hover:bg-[var(--color-bg-secondary)] transition-colors ${
                isCurrent ? "bg-[var(--color-bg-secondary)]" : ""
              }`}
            >
              <span
                className={`font-mono text-[9px] w-3 text-right flex-shrink-0 ${isCurrent ? "text-[var(--color-accent)]" : "text-[var(--color-text-faint)]"}`}
              >
                {isCurrent && isPlaying ? "\u25B8" : i + 1}
              </span>
              <span
                className={`font-mono text-[10px] truncate flex-1 ${isCurrent ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}`}
              >
                {track.title || `Track ${i + 1}`}
              </span>
              {track.duration && track.duration > 0 && (
                <span className="font-mono text-[9px] text-[var(--color-text-faint)] flex-shrink-0">
                  {formatTime(track.duration)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 w-screen min-h-screen z-[80] bg-[var(--color-bg-primary)] overflow-hidden animate-fade-in">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-faint)] hover:text-[var(--color-text-primary)] transition-colors z-10"
      >
        esc
      </button>

      {/* ── Mobile layout: single centered column ── */}
      <div className="flex sm:hidden h-full flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center w-full max-w-sm">
          <div className="w-full aspect-square max-w-[50vh] border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] overflow-hidden">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="font-mono text-2xl text-[var(--color-text-faint)]">
                  ?
                </span>
              </div>
            )}
          </div>
          <div className="mt-6 w-full text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
              {artist}
            </p>
            <h2
              className="mt-1 font-serif text-xl text-[var(--color-text-primary)] truncate"
              style={{ letterSpacing: "-0.01em" }}
            >
              {title}
            </h2>
          </div>
          <div className="mt-6 w-full">{progressBar}</div>
          <div className="mt-6 flex justify-center">{transportControls}</div>
        </div>
        {queue.length > 0 && (
          <div className="mt-8 w-full max-w-sm max-h-40 overflow-y-auto">
            {tracklist}
          </div>
        )}
      </div>

      {/* ── Desktop layout: art left, controls right (toggle with click or Space) ── */}
      <div className="hidden sm:flex h-full items-center justify-center gap-16 px-20">
        {/* Square artwork — click to toggle controls */}
        <button
          onClick={() => setShowControls((v) => !v)}
          className="relative group/art focus:outline-none flex-shrink-0"
          title={
            showControls ? "Hide controls (Space)" : "Show controls (Space)"
          }
        >
          <div className="w-[min(46vh,38vw)] aspect-square border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] overflow-hidden">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="font-mono text-4xl text-[var(--color-text-faint)]">
                  ?
                </span>
              </div>
            )}
          </div>
          {/* Hover hint */}
          <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/art:opacity-100 transition-opacity bg-black/20">
            <span className="font-mono text-[10px] uppercase tracking-widest text-white">
              {showControls ? "hide" : "controls"}
            </span>
          </span>
        </button>

        {/* Right side — matches art height via self-stretch, flex col with centered controls */}
        <div
          className="flex flex-col justify-center min-w-0 w-64"
          style={{ height: "min(46vh, 38vw)" }}
        >
          {/* Track info */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
              {artist}
            </p>
            <h2
              className="mt-1 font-serif text-2xl text-[var(--color-text-primary)] leading-tight"
              style={{ letterSpacing: "-0.02em" }}
            >
              {title}
            </h2>
          </div>

          {/* Controls panel — toggled */}
          <div
            className={`transition-all duration-200 overflow-hidden ${
              showControls
                ? "mt-8 max-h-[400px] opacity-100"
                : "max-h-0 opacity-0 pointer-events-none"
            }`}
          >
            {/* Progress bar — full width */}
            <div className="w-full">{progressBar}</div>

            {/* Transport — centered */}
            <div className="flex justify-center mt-6">{transportControls}</div>

            {/* Tracklist */}
            {queue.length > 0 && (
              <div className="mt-6 max-h-36 overflow-y-auto">{tracklist}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
