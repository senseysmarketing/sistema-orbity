import { getHealthColor } from "@/hooks/useProjects";
import { cn } from "@/lib/utils";

interface ProjectHealthBadgeProps {
  score: number;
  size?: "sm" | "md";
}

export function ProjectHealthBadge({ score, size = "sm" }: ProjectHealthBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold rounded-full",
        getHealthColor(score),
        size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1"
      )}
    >
      {score}
    </span>
  );
}
