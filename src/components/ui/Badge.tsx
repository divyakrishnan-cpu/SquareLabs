import { cn } from "@/lib/utils";
import { CalendarItemStatus, STATUS_CONFIG } from "@/types";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "muted";
}

const variantClasses = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-green-50 text-green-700",
  warning: "bg-amber-50 text-amber-700",
  danger:  "bg-red-50 text-red-600",
  info:    "bg-blue-50 text-blue-700",
  muted:   "bg-gray-50 text-gray-400",
};

export function Badge({ children, className, variant = "default" }: BadgeProps) {
  return (
    <span className={cn("badge", variantClasses[variant], className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: CalendarItemStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn("badge", cfg.bg, cfg.color)}>
      {cfg.label}
    </span>
  );
}
