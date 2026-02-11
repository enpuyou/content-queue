"use client";

import { useEffect } from "react";

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { key: "/", desc: "Focus search" },
  { key: "Esc", desc: "Close overlay / clear search" },
  { key: "1", desc: "Sort by recently added" },
  { key: "2", desc: "Sort by artist" },
  { key: "3", desc: "Sort by year" },
  { key: "d", desc: "Toggle grid density" },
  { key: "l", desc: "Toggle listening mode" },
  { key: "?", desc: "Show this help" },
];

export default function KeyboardShortcuts({
  isOpen,
  onClose,
}: KeyboardShortcutsProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "?") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-[var(--color-bg-primary)] border border-[var(--color-border)] px-8 py-6 max-w-xs w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-faint)] mb-4">
          Keyboard shortcuts
        </h2>
        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-[12px] text-[var(--color-text-muted)]">
                {s.desc}
              </span>
              <kbd className="font-mono text-[11px] text-[var(--color-text-primary)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] px-1.5 py-0.5 min-w-[24px] text-center">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
