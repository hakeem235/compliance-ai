import { cn } from "@/lib/utils";

export type RiskLevel = "low" | "medium" | "high";

const RISK_CONFIG: Record<RiskLevel, { label: string; classes: string; dot: string }> = {
  low: {
    label: "Low risk",
    classes: "bg-risk-low-bg text-risk-low",
    dot: "bg-risk-low",
  },
  medium: {
    label: "Medium risk",
    classes: "bg-risk-medium-bg text-risk-medium",
    dot: "bg-risk-medium",
  },
  high: {
    label: "High risk",
    classes: "bg-risk-high-bg text-risk-high",
    dot: "bg-risk-high",
  },
};

export function RiskBadge({
  level,
  score,
  label,
  className,
}: {
  level: RiskLevel;
  /** Optional 0-100 score shown alongside the label */
  score?: number;
  /** Override the default "Low/Medium/High risk" text, e.g. for urgency badges */
  label?: string;
  className?: string;
}) {
  const config = RISK_CONFIG[level];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        config.classes,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", config.dot)} aria-hidden="true" />
      {typeof score === "number" && <span className="font-mono-data tabular-nums">{score}</span>}
      {typeof score === "number" ? <span aria-hidden="true">·</span> : null}
      {label ?? config.label}
    </span>
  );
}
