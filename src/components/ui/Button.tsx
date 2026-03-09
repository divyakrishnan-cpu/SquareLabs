import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "brand";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  leftIcon?: React.ReactNode;
}

const variants = {
  primary:   "bg-accent-500 text-white hover:bg-accent-600 border-transparent",
  secondary: "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
  ghost:     "bg-transparent text-gray-600 border-transparent hover:bg-gray-100",
  danger:    "bg-red-500 text-white hover:bg-red-600 border-transparent",
  brand:     "bg-brand-500 text-white hover:bg-brand-600 border-transparent",
};

const sizes = {
  sm: "text-xs px-2.5 py-1.5 gap-1.5",
  md: "text-sm px-3.5 py-2 gap-2",
  lg: "text-sm px-4 py-2.5 gap-2",
};

export function Button({
  variant = "secondary",
  size = "md",
  loading,
  leftIcon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-lg border",
        "transition-colors focus-visible:ring-2 ring-offset-1 ring-accent-500",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : leftIcon}
      {children}
    </button>
  );
}
