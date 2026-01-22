"use client";

import { useEffect } from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean; // red styling for destructive actions
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmModalProps) {
  // Close modal on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-30 transition-opacity"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-none max-w-md w-full mx-4 p-8 z-10">
        <h3 className="font-serif text-xl font-normal text-[var(--color-text-primary)] mb-4">
          {title}
        </h3>

        <p className="text-[var(--color-text-secondary)] mb-8 leading-relaxed">
          {message}
        </p>

        <div className="flex gap-4 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-[var(--color-text-muted)] border border-[var(--color-border)] rounded-none hover:text-[var(--color-text-primary)] transition-colors"
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-none transition-colors ${
              danger
                ? "bg-red-600 text-white hover:bg-red-700 border border-red-600"
                : "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] border border-[var(--color-accent)]"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
