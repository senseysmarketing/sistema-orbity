import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function ClientCardSkeleton() {
  return (
    <Card className="p-6 space-y-4">
      {/* Nome e status */}
      <div className="flex items-start justify-between">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {/* Informações */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Valores */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-28" />
      </div>
    </Card>
  );
}
