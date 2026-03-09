"use client";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  className?: string;
  size?: "sm" | "md";
}

export function Select({ value, onChange, options, className, size = "md" }: SelectProps) {
  return (
    <div className={cn("relative inline-block", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "appearance-none bg-white border border-gray-200 rounded-lg",
          "text-gray-700 font-medium pr-8 focus:outline-none focus:ring-2",
          "focus:ring-accent-500 focus:border-transparent cursor-pointer",
          "hover:border-gray-300 transition-colors",
          size === "sm" ? "text-xs px-2.5 py-1.5" : "text-sm px-3 py-2"
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"
      />
    </div>
  );
}
