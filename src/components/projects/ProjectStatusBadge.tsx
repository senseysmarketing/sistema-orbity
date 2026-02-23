import { ProjectStatus, getStatusLabel, getStatusColor } from "@/hooks/useProjects";
import { cn } from "@/lib/utils";

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full",
        getStatusColor(status)
      )}
    >
      {getStatusLabel(status)}
    </span>
  );
}
