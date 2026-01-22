interface StatusIndicatorProps {
  isRead: boolean;
  isArchived?: boolean;
  className?: string;
}

export default function StatusIndicator({
  isRead,
  isArchived,
  className = "",
}: StatusIndicatorProps) {
  if (isArchived) {
    // Archived: hollow circle with reduced opacity
    return (
      <span
        className={`inline-block w-2.5 h-2.5 rounded-full border border-[var(--color-text-faint)] opacity-50 ${className}`}
        title="Archived"
      />
    );
  }

  if (isRead) {
    // Read: hollow circle
    return (
      <span
        className={`inline-block w-2.5 h-2.5 rounded-full border border-[var(--color-status-read)] ${className}`}
        title="Read"
      />
    );
  }

  // Unread: filled circle
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full bg-[var(--color-status-unread)] ${className}`}
      title="Unread"
    />
  );
}
