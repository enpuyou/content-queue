"use client";

import { VinylRecord } from "@/types";

interface VinylCardProps {
  record: VinylRecord;
  compact?: boolean;
  onClick: () => void;
}

export default function VinylCard({
  record,
  onClick,
  compact,
}: VinylCardProps) {
  const initials = (record.artist?.[0] || "?") + (record.title?.[0] || "?");

  const isPending = record.processing_status === "pending";
  return (
    <button
      onClick={onClick}
      className="group text-left cursor-pointer p-0 focus:outline-none w-full"
    >
      {/* Cover — square, accent top-border on hover */}
      <div className="relative aspect-square w-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg-primary)]">
        {record.cover_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={record.cover_url}
            alt={`${record.artist} — ${record.title}`}
            className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-90"
            loading="lazy"
          />
        ) : isPending ? (
          <div className="w-full h-full flex items-center justify-center bg-[var(--color-bg-tertiary)]">
            {/* Spinning record grooves */}
            <div className="relative w-16 h-16">
              <div
                className="absolute inset-0 rounded-full border border-[var(--color-border)] animate-spin"
                style={{ animationDuration: "3s" }}
              >
                <div className="absolute inset-2 rounded-full border border-[var(--color-border)] opacity-60" />
                <div className="absolute inset-4 rounded-full border border-[var(--color-border)] opacity-40" />
                <div className="absolute inset-6 rounded-full border border-[var(--color-border)] opacity-20" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-[var(--color-text-faint)]" />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[var(--color-bg-tertiary)]">
            <span className="font-serif text-2xl text-[var(--color-text-faint)] tracking-wide select-none">
              {initials}
            </span>
          </div>
        )}

        {/* Wantlist badge — subtle top-left tag */}
        {record.status === "wantlist" && (
          <span className="absolute top-0 left-0 font-mono text-[9px] uppercase tracking-[0.08em] px-1.5 py-0.5 bg-[var(--color-bg-primary)] text-[var(--color-text-muted)] border-r border-b border-[var(--color-border)]">
            want
          </span>
        )}

        {/* Signal dot — records with notes */}
        {record.notes && (
          <span className="absolute bottom-2 right-2 w-[7px] h-[7px] rounded-full bg-[var(--color-accent)] opacity-70" />
        )}

        {/* Label/year "Sticker" — Navbar-style rectangular badge on hover */}
        {!compact && (record.label || record.year) && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="flex flex-col items-end gap-1">
              {record.year && (
                <span className="text-[9px] px-1.5 py-0.5 leading-none bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border)] shadow-sm font-mono tracking-wider">
                  {record.year}
                </span>
              )}
              {record.label && (
                <span className="text-[9px] px-1.5 py-0.5 leading-none bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border)] shadow-sm font-mono tracking-wider max-w-[80px] truncate">
                  {record.label.split(/[,/]/)[0]}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Caption below — hidden in compact mode */}
      {!compact && (
        <div className="mt-0.5 px-0.5 leading-none">
          <p className="font-sans text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] truncate">
            {record.artist || "Unknown Artist"}
          </p>
          <p className="font-serif text-[13px] text-[var(--color-text-primary)] truncate leading-[1.1]">
            {record.title || "Untitled"}
          </p>
        </div>
      )}
    </button>
  );
}
