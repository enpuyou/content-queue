"use client";

import { useState, useRef, useEffect } from "react";

interface MobileActionsMenuProps {
  onRead: () => void;
  onArchive: () => void;
  onAddTag: () => void;
  onDelete: () => void;
  onAddToList?: (listId: string) => void;
  onRemoveFromList?: () => void;
  isRead: boolean;
  isArchived: boolean;
  availableLists?: Array<{ id: string; name: string }>;
}

export default function MobileActionsMenu({
  onRead,
  onArchive,
  onAddTag,
  onDelete,
  onAddToList,
  onRemoveFromList,
  isRead,
  isArchived,
  availableLists,
}: MobileActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showListSubmenu, setShowListSubmenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowListSubmenu(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
    setShowListSubmenu(false);
  };

  const handleAddToList = (listId: string) => {
    if (onAddToList) {
      onAddToList(listId);
    }
    setIsOpen(false);
    setShowListSubmenu(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Three-dot menu button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors p-2 -m-2"
        aria-label="More actions"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setIsOpen(false);
              setShowListSubmenu(false);
            }}
          />

          {/* Menu */}
          <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-none shadow-lg z-20">
            {!showListSubmenu ? (
              <div className="py-1">
                {/* Read/Unread */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(onRead);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-accent)] transition-colors"
                >
                  {isRead ? "Mark as Unread" : "Mark as Read"}
                </button>

                {/* Archive/Unarchive */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(onArchive);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-accent)] transition-colors"
                >
                  {isArchived ? "Unarchive" : "Archive"}
                </button>

                {/* Add to List */}
                {availableLists && availableLists.length > 0 && onAddToList && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowListSubmenu(true);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-accent)] transition-colors flex items-center justify-between"
                  >
                    Add to List
                    <span>›</span>
                  </button>
                )}

                {/* Remove from List */}
                {onRemoveFromList && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction(onRemoveFromList);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-accent)] transition-colors"
                  >
                    Remove from List
                  </button>
                )}

                {/* Add Tag */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(onAddTag);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-accent)] transition-colors"
                >
                  Add Tag
                </button>

                {/* Divider */}
                <div className="border-t border-[var(--color-border)] my-1" />

                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(onDelete);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-rose-500 dark:text-red-400 hover:bg-rose-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Delete
                </button>
              </div>
            ) : (
              <div className="py-1">
                {/* Back button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowListSubmenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-accent)] transition-colors flex items-center gap-1"
                >
                  <span>‹</span> Back
                </button>

                <div className="border-t border-[var(--color-border)] my-1" />

                {/* List options */}
                {availableLists?.map((list) => (
                  <button
                    key={list.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToList(list.id);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-accent)] transition-colors"
                  >
                    {list.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
