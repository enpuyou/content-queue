import { useEffect } from "react";

type KeyCombo = string; // e.g., "ctrl+k", "shift+/", "enter"
type Handler = (event: KeyboardEvent) => void;

export function useHotkeys(keyMap: Record<KeyCombo, Handler>) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const combo = [
        event.ctrlKey ? "ctrl" : "",
        event.metaKey ? "meta" : "",
        event.shiftKey ? "shift" : "",
        event.altKey ? "alt" : "",
        event.key.toLowerCase(),
      ]
        .filter(Boolean)
        .join("+");

      // Check explicit match first (e.g. "ctrl+k")
      if (keyMap[combo]) {
        event.preventDefault();
        keyMap[combo](event);
        return;
      }

      // Check simple key match (e.g. "k")
      // If combo was just "k", it matches.
      // If combo was "shift+?", handle cases where event.key is "?"
      if (keyMap[event.key.toLowerCase()]) {
        // Only prevent default if it's a "navigation" key or explicitly handled
        // to avoid blocking generic typing if not caught by input check
        // But here we are strict about inputs, so it's safe.
        // Special case: 'j'/'k' shouldn't block scrolling unless we handle it manually.
        keyMap[event.key.toLowerCase()](event);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyMap]);
}
