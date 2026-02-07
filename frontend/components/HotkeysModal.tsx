"use client";

import React, { useEffect } from "react";

export default function HotkeysModal({ onClose }: { onClose: () => void }) {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-serif text-xl text-[var(--color-text-primary)]">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-faint)] mb-3">
              Queue Navigation
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--color-text-secondary)]">
                  Next Article
                </span>
                <kbd className="font-mono text-xs bg-[var(--color-bg-secondary)] px-2 py-1 border border-[var(--color-border)] rounded text-[var(--color-text-primary)]">
                  j
                </kbd>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--color-text-secondary)]">
                  Prev Article
                </span>
                <kbd className="font-mono text-xs bg-[var(--color-bg-secondary)] px-2 py-1 border border-[var(--color-border)] rounded text-[var(--color-text-primary)]">
                  k
                </kbd>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--color-text-secondary)]">
                  Open Article
                </span>
                <kbd className="font-mono text-xs bg-[var(--color-bg-secondary)] px-2 py-1 border border-[var(--color-border)] rounded text-[var(--color-text-primary)]">
                  Enter
                </kbd>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-faint)] mb-3">
              Reader
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--color-text-secondary)]">
                  Bold Selection
                </span>
                <kbd className="font-mono text-xs bg-[var(--color-bg-secondary)] px-2 py-1 border border-[var(--color-border)] rounded text-[var(--color-text-primary)]">
                  Cmd + B
                </kbd>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--color-text-secondary)]">
                  Italic Selection
                </span>
                <kbd className="font-mono text-xs bg-[var(--color-bg-secondary)] px-2 py-1 border border-[var(--color-border)] rounded text-[var(--color-text-primary)]">
                  Cmd + I
                </kbd>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--color-text-secondary)]">
                  Close Reader
                </span>
                <kbd className="font-mono text-xs bg-[var(--color-bg-secondary)] px-2 py-1 border border-[var(--color-border)] rounded text-[var(--color-text-primary)]">
                  Esc
                </kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
