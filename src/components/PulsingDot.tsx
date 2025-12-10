import { cn } from "@/lib/utils";

interface PulsingDotProps {
  color?: "green" | "yellow" | "red" | "blue";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const colorStyles = {
  green: "bg-emerald-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
  blue: "bg-blue-500",
};

const sizeStyles = {
  sm: "w-2 h-2",
  md: "w-3 h-3",
  lg: "w-4 h-4",
};

const glowStyles = {
  green: "shadow-[0_0_8px_rgba(16,185,129,0.6)]",
  yellow: "shadow-[0_0_8px_rgba(234,179,8,0.6)]",
  red: "shadow-[0_0_8px_rgba(239,68,68,0.6)]",
  blue: "shadow-[0_0_8px_rgba(59,130,246,0.6)]",
};

export function PulsingDot({
  color = "green",
  size = "md",
  className,
}: PulsingDotProps) {
  return (
    <span className={cn("relative inline-flex", className)}>
      <span
        className={cn(
          "rounded-full animate-pulse-soft",
          colorStyles[color],
          sizeStyles[size],
          glowStyles[color]
        )}
      />
      <span
        className={cn(
          "absolute inset-0 rounded-full animate-ping opacity-75",
          colorStyles[color]
        )}
        style={{ animationDuration: "2s" }}
      />
    </span>
  );
}