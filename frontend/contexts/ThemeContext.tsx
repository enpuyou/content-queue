"use client";

import { createContext, useContext, ReactNode } from "react";
import { useReadingSettings } from "./ReadingSettingsContext";

type Theme = "light" | "dark" | "sepia";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Delegate to ReadingSettingsContext to avoid conflicts
  const { settings, updateSetting } = useReadingSettings();

  const toggleTheme = () => {
    // Toggle between light and dark (skip sepia in toggle)
    const newTheme = settings.theme === "light" ? "dark" : "light";
    updateSetting("theme", newTheme);
  };

  const setTheme = (newTheme: Theme) => {
    updateSetting("theme", newTheme);
  };

  return (
    <ThemeContext.Provider
      value={{ theme: settings.theme, toggleTheme, setTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
