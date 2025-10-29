import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function LeadCardSkeleton() {
  return (
    <Card className="p-4 space-y-3">
      {/* Nome e score */}
      <div className="flex items-start justify-between">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>

      {/* Contato */}
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

      {/* Tags */}
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </Card>
  );
}
