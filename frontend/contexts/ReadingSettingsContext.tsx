"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export interface ReadingSettings {
  theme: "light" | "dark" | "sepia";
  fontFamily: "system" | "serif" | "sans";
  fontSize: "small" | "medium" | "large";
  contentWidth: "narrow" | "medium" | "wide";
  lineHeight: "compact" | "comfortable" | "spacious";
  letterSpacing: "tight" | "normal" | "wide";
  bionicReading: boolean;
}

const DEFAULTS: ReadingSettings = {
  theme: "light",
  fontFamily: "sans",
  fontSize: "medium",
  contentWidth: "medium",
  lineHeight: "comfortable",
  letterSpacing: "normal",
  bionicReading: false,
};

const STORAGE_KEY = "sedi-reading-settings";

interface ReadingSettingsContextType {
  settings: ReadingSettings;
  updateSetting: <K extends keyof ReadingSettings>(
    key: K,
    value: ReadingSettings[K],
  ) => void;
  resetSettings: () => void;
}

const ReadingSettingsContext = createContext<ReadingSettingsContextType | null>(
  null,
);

export function ReadingSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ReadingSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSettings({ ...DEFAULTS, ...JSON.parse(saved) });
      } catch (err) {
        console.error("Failed to parse settings:", err);
      }
    }
    setLoaded(true);
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

      // Apply theme to document - safely toggle classes without wiping fonts
      const root = document.documentElement;
      const themes = ["light", "dark", "sepia"];
      root.classList.remove(...themes);
      root.classList.add(settings.theme);
    }
  }, [settings, loaded]);

  const updateSetting = <K extends keyof ReadingSettings>(
    key: K,
    value: ReadingSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => setSettings(DEFAULTS);

  return (
    <ReadingSettingsContext.Provider
      value={{ settings, updateSetting, resetSettings }}
    >
      {children}
    </ReadingSettingsContext.Provider>
  );
}

export function useReadingSettings() {
  const ctx = useContext(ReadingSettingsContext);
  if (!ctx)
    throw new Error(
      "useReadingSettings must be used within ReadingSettingsProvider",
    );
  return ctx;
}
