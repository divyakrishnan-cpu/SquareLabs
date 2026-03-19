"use client";

/**
 * useChartColors
 *
 * Reads / writes the 8-slot competitor chart color palette from localStorage.
 * Falls back to the default palette when nothing is stored.
 *
 * Also exposes brand vertical hex colors that are used for chart lines
 * when rendering per-vertical data.
 */

import { useState, useEffect, useCallback } from "react";

// ── Defaults ──────────────────────────────────────────────────────────────

export const DEFAULT_CHART_COLORS: string[] = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
];

export const DEFAULT_BRAND_COLORS: Record<string, string> = {
  SY_INDIA:       "#2563eb", // blue-600
  SY_UAE:         "#9333ea", // purple-600
  INTERIOR:       "#f59e0b", // amber-500
  SQUARE_CONNECT: "#16a34a", // green-600
  UM:             "#e11d48", // rose-600
};

export const BRAND_LABELS: Record<string, string> = {
  SY_INDIA:       "SQY India",
  SY_UAE:         "SQY UAE",
  INTERIOR:       "Interior Co.",
  SQUARE_CONNECT: "Square Connect",
  UM:             "Urban Money",
};

const LS_CHART  = "squarelabs_chart_colors";
const LS_BRAND  = "squarelabs_brand_colors";

// ── Hook ──────────────────────────────────────────────────────────────────

export function useChartColors() {
  const [chartColors, setChartColors] = useState<string[]>(DEFAULT_CHART_COLORS);
  const [brandColors, setBrandColors] = useState<Record<string, string>>(DEFAULT_BRAND_COLORS);
  const [hydrated,    setHydrated]    = useState(false);

  // Load from localStorage once on mount
  useEffect(() => {
    try {
      const storedChart = localStorage.getItem(LS_CHART);
      if (storedChart) {
        const parsed = JSON.parse(storedChart) as string[];
        if (Array.isArray(parsed) && parsed.length === 8) setChartColors(parsed);
      }
    } catch { /* ignore */ }

    try {
      const storedBrand = localStorage.getItem(LS_BRAND);
      if (storedBrand) {
        const parsed = JSON.parse(storedBrand) as Record<string, string>;
        if (parsed && typeof parsed === "object") setBrandColors({ ...DEFAULT_BRAND_COLORS, ...parsed });
      }
    } catch { /* ignore */ }

    setHydrated(true);
  }, []);

  // Update a single chart color slot
  const updateChartColor = useCallback((index: number, hex: string) => {
    setChartColors(prev => {
      const next = [...prev];
      next[index] = hex;
      localStorage.setItem(LS_CHART, JSON.stringify(next));
      return next;
    });
  }, []);

  // Update a single brand color
  const updateBrandColor = useCallback((vertical: string, hex: string) => {
    setBrandColors(prev => {
      const next = { ...prev, [vertical]: hex };
      localStorage.setItem(LS_BRAND, JSON.stringify(next));
      return next;
    });
  }, []);

  // Reset everything to defaults
  const resetAll = useCallback(() => {
    setChartColors(DEFAULT_CHART_COLORS);
    setBrandColors(DEFAULT_BRAND_COLORS);
    localStorage.removeItem(LS_CHART);
    localStorage.removeItem(LS_BRAND);
  }, []);

  const resetChartColors = useCallback(() => {
    setChartColors(DEFAULT_CHART_COLORS);
    localStorage.removeItem(LS_CHART);
  }, []);

  const resetBrandColors = useCallback(() => {
    setBrandColors(DEFAULT_BRAND_COLORS);
    localStorage.removeItem(LS_BRAND);
  }, []);

  return {
    chartColors,
    brandColors,
    hydrated,
    updateChartColor,
    updateBrandColor,
    resetAll,
    resetChartColors,
    resetBrandColors,
  };
}
