"use client";

import { createContext, useContext, ReactNode } from "react";
import { useReadingSettings } from "./ReadingSettingsContext";

type Theme = "light" | "dark" | "sepia" | "true-black";

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
    // Cycle: light -> dark -> true-black -> light
    let newTheme: Theme = "light";
    if (settings.theme === "light") newTheme = "dark";
    else if (settings.theme === "dark") newTheme = "true-black";
    else if (settings.theme === "true-black") newTheme = "light";
    else newTheme = "light"; // Default fallback (e.g. from sepia)

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
