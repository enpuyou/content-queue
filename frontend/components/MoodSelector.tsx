"use client";

import { Dispatch, SetStateAction } from "react";

interface MoodSelectorProps {
  mood: string | undefined;
  setMood: Dispatch<SetStateAction<string | undefined>>;
}

export default function MoodSelector({ mood, setMood }: MoodSelectorProps) {
  const moods = [
    { value: "quick_read", label: "Quick read", icon: "⚡" },
    { value: "deep_dive", label: "Deep dive", icon: "🔍" },
    { value: "light", label: "Something light", icon: "✨" },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {moods.map((m) => (
        <button
          key={m.value}
          onClick={() => setMood(mood === m.value ? undefined : m.value)}
          className={`px-3 py-2 rounded text-sm transition-colors ${
            mood === m.value
              ? "bg-[var(--color-accent)] text-white"
              : "border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
          }`}
          aria-pressed={mood === m.value}
        >
          <span className="mr-1">{m.icon}</span>
          {m.label}
        </button>
      ))}
    </div>
  );
}
