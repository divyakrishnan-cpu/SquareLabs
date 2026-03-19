"use client";

/**
 * useTheme
 *
 * Persists "light" | "dark" in localStorage under "squarelabs_theme".
 * Applies / removes the `dark` class on <html> immediately so Tailwind
 * dark: variants take effect without a flash.
 */

import { useState, useEffect, useCallback } from "react";

export type Theme = "light" | "dark";

const LS_KEY = "squarelabs_theme";

/** Apply the dark class to <html> without causing a React re-render */
function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");
  const [hydrated, setHydrated] = useState(false);

  // On mount: read stored preference (or respect OS setting)
  useEffect(() => {
    let stored: Theme | null = null;
    try {
      stored = localStorage.getItem(LS_KEY) as Theme | null;
    } catch { /* ignore */ }

    const resolved: Theme =
      stored === "dark" || stored === "light"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

    setThemeState(resolved);
    applyTheme(resolved);
    setHydrated(true);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try { localStorage.setItem(LS_KEY, next); } catch { /* ignore */ }
  }, []);

  const toggle = useCallback(() => {
    setThemeState(prev => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem(LS_KEY, next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return { theme, setTheme, toggle, hydrated };
}
