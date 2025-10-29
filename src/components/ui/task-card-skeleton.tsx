import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function TaskCardSkeleton() {
  return (
    <Card className="p-4 space-y-3">
      {/* Título e prioridade */}
      <div className="flex items-start justify-between">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Descrição */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Data e usuários */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
    </Card>
  );
}
