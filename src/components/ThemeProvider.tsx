"use client";

/**
 * ThemeProvider
 *
 * Reads the stored theme from localStorage on first render and applies
 * the `dark` class to <html>. This must be a client component so it can
 * access localStorage, but because we also inject an inline <script> into
 * the <head> (via layout.tsx) the page never flashes the wrong theme.
 */

import { useEffect } from "react";

const LS_KEY = "squarelabs_theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Sync on first hydration (belt-and-suspenders over the inline script)
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored === "dark") {
        document.documentElement.classList.add("dark");
      } else if (stored === "light") {
        document.documentElement.classList.remove("dark");
      }
    } catch { /* ignore */ }
  }, []);

  return <>{children}</>;
}

/**
 * Inline script string to inject into <head> to avoid flash-of-wrong-theme.
 * Must be rendered with dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}.
 */
export const THEME_SCRIPT = `
(function(){
  try{
    var t=localStorage.getItem('squarelabs_theme');
    var prefer=window.matchMedia('(prefers-color-scheme:dark)').matches;
    if(t==='dark'||(t===null&&prefer)){document.documentElement.classList.add('dark');}
  }catch(e){}
})();
`.trim();
