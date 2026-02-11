/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect } from "react";
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

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
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

  // Find videos from the record for the tracklist
  const videos = record?.videos || [];

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seek(Math.max(0, Math.min(duration, percent * duration)));
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[var(--color-bg-primary)] flex flex-col items-center justify-center animate-fade-in">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-faint)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        esc
      </button>

      {/* Main content */}
      <div className="flex flex-col items-center w-full max-w-sm px-6">
        {/* Album art */}
        <div className="w-full aspect-square max-w-[50vh] border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] overflow-hidden">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="font-mono text-2xl text-[var(--color-text-faint)]">
                ?
              </span>
            </div>
          )}
        </div>

        {/* Track info */}
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

        {/* Progress bar */}
        <div className="mt-6 w-full">
          <div
            className="w-full h-1 bg-[var(--color-border)] cursor-pointer relative"
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

        {/* Transport controls */}
        <div className="mt-4 flex items-center gap-8 select-none">
          {/* Prev */}
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

          {/* Play / Pause */}
          <button
            onClick={toggle}
            className="text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors p-1"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isBuffering ? (
              <span className="font-mono text-sm tracking-wider">..</span>
            ) : isPlaying ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 10 10"
                fill="currentColor"
              >
                <rect x="1" y="1" width="2.5" height="8" />
                <rect x="6.5" y="1" width="2.5" height="8" />
              </svg>
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 10 10"
                fill="currentColor"
              >
                <polygon points="2,1 2,9 9,5" />
              </svg>
            )}
          </button>

          {/* Next */}
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
      </div>

      {/* Mini tracklist */}
      {videos.length > 0 && (
        <div className="mt-8 w-full max-w-sm px-6 max-h-40 overflow-y-auto">
          <div className="border-t border-[var(--color-border-subtle)] pt-3">
            {videos.map((video, i) => {
              // Extract video ID from URI
              const videoId = video.uri?.includes("watch?v=")
                ? video.uri.split("watch?v=")[1]?.split("&")[0]
                : video.uri?.split("/").pop();

              const isCurrent = current?.videoId === videoId;

              // Find the queue index for this video
              const queueIdx = queue.findIndex((t) => t.videoId === videoId);

              return (
                <button
                  key={i}
                  onClick={() => {
                    if (queueIdx >= 0) play(queueIdx);
                  }}
                  disabled={queueIdx < 0}
                  className={`w-full flex items-center gap-2 py-1.5 px-1 text-left hover:bg-[var(--color-bg-secondary)] transition-colors ${
                    isCurrent ? "bg-[var(--color-bg-secondary)]" : ""
                  } ${queueIdx < 0 ? "opacity-30" : ""}`}
                >
                  <span
                    className={`font-mono text-[9px] w-3 text-right flex-shrink-0 ${
                      isCurrent
                        ? "text-[var(--color-accent)]"
                        : "text-[var(--color-text-faint)]"
                    }`}
                  >
                    {isCurrent && isPlaying ? "\u25B8" : i + 1}
                  </span>
                  <span
                    className={`font-mono text-[10px] truncate flex-1 ${
                      isCurrent
                        ? "text-[var(--color-text-primary)]"
                        : "text-[var(--color-text-secondary)]"
                    }`}
                  >
                    {video.title || `Track ${i + 1}`}
                  </span>
                  {video.duration && video.duration > 0 && (
                    <span className="font-mono text-[9px] text-[var(--color-text-faint)] flex-shrink-0">
                      {formatTime(video.duration)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
