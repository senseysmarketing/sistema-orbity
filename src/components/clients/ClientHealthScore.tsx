import { Badge } from "@/components/ui/badge";
import { differenceInMonths } from "date-fns";

interface ClientHealthScoreProps {
  startDate?: string | null;
  pendingTaskCount?: number;
  variant?: "badge" | "circle";
}

type ScoreLevel = {
  label: string;
  grade: string;
  color: string;
  bgColor: string;
  borderColor: string;
};

function calculateScore(startDate?: string | null, pendingTaskCount?: number): ScoreLevel {
  const months = startDate ? differenceInMonths(new Date(), new Date(startDate)) : 0;
  const pending = pendingTaskCount || 0;

  let level: "excellent" | "good" | "attention" | "new";

  if (months >= 12) level = "excellent";
  else if (months >= 6) level = "good";
  else if (months >= 3) level = "attention";
  else level = "new";

  // Override: >5 pending tasks caps score at "attention"
  if (pending > 5 && (level === "excellent" || level === "good")) {
    level = "attention";
  }

  const scores: Record<string, ScoreLevel> = {
    excellent: {
      label: "Excelente",
      grade: "A",
      color: "text-emerald-700 dark:text-emerald-300",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/40",
      borderColor: "border-emerald-200 dark:border-emerald-800",
    },
    good: {
      label: "Bom",
      grade: "B",
      color: "text-sky-700 dark:text-sky-300",
      bgColor: "bg-sky-100 dark:bg-sky-900/40",
      borderColor: "border-sky-200 dark:border-sky-800",
    },
    attention: {
      label: "Atenção",
      grade: "C",
      color: "text-amber-700 dark:text-amber-300",
      bgColor: "bg-amber-100 dark:bg-amber-900/40",
      borderColor: "border-amber-200 dark:border-amber-800",
    },
    new: {
      label: "Novo",
      grade: "D",
      color: "text-slate-600 dark:text-slate-300",
      bgColor: "bg-slate-100 dark:bg-slate-800/40",
      borderColor: "border-slate-200 dark:border-slate-700",
    },
  };

  return scores[level];
}

export function ClientHealthScore({ startDate, pendingTaskCount, variant = "badge" }: ClientHealthScoreProps) {
  const score = calculateScore(startDate, pendingTaskCount);

  if (variant === "circle") {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className={`flex h-20 w-20 items-center justify-center rounded-full border-4 ${score.borderColor} ${score.bgColor}`}>
          <span className={`text-3xl font-bold ${score.color}`}>{score.grade}</span>
        </div>
        <span className={`text-sm font-medium ${score.color}`}>{score.label}</span>
      </div>
    );
  }

  return (
    <Badge className={`${score.bgColor} ${score.color} ${score.borderColor} border font-medium hover:opacity-90`}>
      {score.label}
    </Badge>
  );
}

export { calculateScore };
