import { cn } from "@/lib/utils";

const RISK_COLORS = {
  low: "#1F8A5B",
  medium: "#D97706",
  high: "#DC2626",
} as const;

export function RiskGauge({
  score,
  size = 104,
  strokeWidth = 11,
  variant = "light",
  color,
  className,
  children,
}: {
  /** 0-100 */
  score: number;
  size?: number;
  strokeWidth?: number;
  /** "dark" renders the track for use on the dark sidebar-green surfaces */
  variant?: "light" | "dark";
  /** Override the progress stroke color; defaults to amber to match the mockup's moderate-risk gauge */
  color?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const center = size / 2;
  const trackColor = variant === "dark" ? "rgba(255,255,255,0.12)" : "var(--gauge-track)";

  return (
    <div className={cn("relative flex-none", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color ?? "#F5B544"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function riskScoreColor(score: number) {
  if (score >= 67) return RISK_COLORS.high;
  if (score >= 34) return RISK_COLORS.medium;
  return RISK_COLORS.low;
}
