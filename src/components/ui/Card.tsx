import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatNumber, formatDelta } from "@/lib/utils";

interface CardProps {
  className?: string;
  children: React.ReactNode;
  padding?: boolean;
}

export function Card({ className, children, padding = true }: CardProps) {
  return (
    <div className={cn("card", padding && "p-5", className)}>
      {children}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number;
  delta?: number;
  deltaLabel?: string;
  icon?: React.ReactNode;
  inverseColor?: boolean;   // for unfollows: negative delta = good
  format?: "number" | "percent";
  suffix?: string;
}

export function MetricCard({
  label, value, delta, deltaLabel, icon, inverseColor, format = "number", suffix,
}: MetricCardProps) {
  const isPositive = inverseColor ? (delta ?? 0) < 0 : (delta ?? 0) > 0;
  const isNeutral  = delta === 0 || delta == null;

  return (
    <div className="card p-4 flex flex-col gap-1.5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-gray-500 leading-tight">{label}</p>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>

      <p className="text-2xl font-bold text-gray-900 tabular-nums">
        {format === "percent"
          ? `${value.toFixed(1)}%`
          : formatNumber(value)}
        {suffix && <span className="text-sm font-normal text-gray-400 ml-1">{suffix}</span>}
      </p>

      {delta != null && (
        <div className={cn(
          "flex items-center gap-1 text-xs font-medium",
          isNeutral ? "text-gray-400" : isPositive ? "text-green-600" : "text-red-500"
        )}>
          {isNeutral
            ? <Minus size={12} />
            : isPositive
            ? <TrendingUp  size={12} />
            : <TrendingDown size={12} />}
          <span>{formatDelta(delta)}</span>
          {deltaLabel && <span className="text-gray-400 font-normal">{deltaLabel}</span>}
        </div>
      )}
    </div>
  );
}

// ── Section divider ──────────────────────────────────────────────────────────
export function SectionHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
