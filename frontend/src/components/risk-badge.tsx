import { AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type RiskLevel = "low" | "medium" | "high";

const RISK_CONFIG: Record<RiskLevel, { label: string; icon: typeof CheckCircle2; classes: string }> = {
  low: {
    label: "Low risk",
    icon: CheckCircle2,
    classes: "bg-risk-low-bg text-risk-low",
  },
  medium: {
    label: "Medium risk",
    icon: AlertCircle,
    classes: "bg-risk-medium-bg text-risk-medium",
  },
  high: {
    label: "High risk",
    icon: AlertTriangle,
    classes: "bg-risk-high-bg text-risk-high",
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
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        config.classes,
        className
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label ?? config.label}
      {typeof score === "number" && <span className="tabular-nums opacity-80">{score}</span>}
    </span>
  );
}
