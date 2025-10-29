import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function PostCardSkeleton() {
  return (
    <Card className="p-4 space-y-3">
      {/* Header com ícone e status */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {/* Título e descrição */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      {/* Data e cliente */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-28 rounded-full" />
      </div>

      {/* Usuários atribuídos */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-3" />
        <Skeleton className="h-3 w-32" />
      </div>
    </Card>
  );
}
