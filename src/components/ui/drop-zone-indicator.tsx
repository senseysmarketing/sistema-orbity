import { cn } from "@/lib/utils";

interface DropZoneIndicatorProps {
  isActive: boolean;
  isEmpty: boolean;
  title: string;
}

export function DropZoneIndicator({ isActive, isEmpty, title }: DropZoneIndicatorProps) {
  if (!isEmpty) return null;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed transition-all duration-200 min-h-[200px]",
        isActive
          ? "border-primary bg-primary/5 text-primary"
          : "border-muted-foreground/30 text-muted-foreground"
      )}
    >
      <div className="text-4xl mb-2">
        {isActive ? "✨" : "📥"}
      </div>
      <p className="text-sm font-medium">
        {isActive ? `Solte aqui para mover para "${title}"` : `Arraste itens para "${title}"`}
      </p>
    </div>
  );
}