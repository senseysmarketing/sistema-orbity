import { Badge } from "@/components/ui/badge";
import { isBefore, startOfDay, differenceInDays, parseISO } from "date-fns";

interface ClientHealthScoreProps {
  client: any;
  tasks: any[];
  meetings: any[];
  npsScore?: number | null;
  variant?: "badge" | "circle";
}

type ScoreLevel = {
  label: string;
  color: string;
  strokeColor: string;
  bgColor: string;
  borderColor: string;
  message: string;
};

function calculateDynamicScore(
  client: any,
  tasks: any[],
  meetings: any[],
  npsScore?: number | null
): number {
  let score = 100;
  const today = startOfDay(new Date());

  // Tarefas atrasadas: -10 cada, máx -40
  const overdueTasks = tasks.filter((t) => {
    if (!t.due_date) return false;
    if (t.status === "done" || t.status === "cancelled" || t.status === "completed") return false;
    return isBefore(parseISO(t.due_date), today);
  });
  score -= Math.min(overdueTasks.length * 10, 40);

  // Reuniões — penalizações separadas e acumuláveis
  if (meetings.length > 0) {
    const pastMeetings = meetings.filter((m) => new Date(m.start_time) <= today);
    const futureMeetings = meetings.filter((m) => new Date(m.start_time) > today);

    // Última reunião > 30 dias: -20
    if (pastMeetings.length > 0) {
      const sorted = [...pastMeetings].sort((a, b) =>
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      );
      const daysSinceLast = differenceInDays(today, new Date(sorted[0].start_time));
      if (daysSinceLast > 30) {
        score -= 20;
      }
    }

    // Sem próxima reunião agendada: -10
    if (futureMeetings.length === 0) {
      score -= 10;
    }
  } else {
    // Sem reuniões nenhuma: -20
    score -= 20;
  }

  // NPS
  if (npsScore != null) {
    if (npsScore >= 9) score += 10;
    else if (npsScore <= 6) score -= 30;
  }

  // Tempo de casa < 3 meses (onboarding): -10
  if (client?.start_date) {
    const startDate = parseISO(client.start_date);
    const daysActive = differenceInDays(today, startDate);
    if (daysActive >= 0 && daysActive < 90) {
      score -= 10;
    }
  }

  return Math.max(0, Math.min(100, score));
}

function getScoreLevel(score: number): ScoreLevel {
  if (score >= 80) {
    return {
      label: "Excelente",
      color: "text-emerald-600",
      strokeColor: "#10b981",
      bgColor: "bg-emerald-100",
      borderColor: "border-emerald-200",
      message: "Cliente saudável e engajado. Oportunidade para upsell.",
    };
  }
  if (score >= 50) {
    return {
      label: "Atenção",
      color: "text-amber-600",
      strokeColor: "#f59e0b",
      bgColor: "bg-amber-100",
      borderColor: "border-amber-200",
      message: "Alguns atrasos ou falta de alinhamento. Agende uma reunião.",
    };
  }
  return {
    label: "Crítico",
    color: "text-red-600",
    strokeColor: "#ef4444",
    bgColor: "bg-red-100",
    borderColor: "border-red-200",
    message: "Ação Imediata: Cliente em alto risco de cancelamento.",
  };
}

function HealthGauge({ score, level }: { score: number; level: ScoreLevel }) {
  const radius = 54;
  const strokeWidth = 10;
  const center = 64;
  // 270° arc
  const totalAngle = 270;
  const startAngle = 135; // starts at bottom-left
  const circumference = (totalAngle / 360) * 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;

  const polarToCartesian = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  };

  const startPoint = polarToCartesian(startAngle);
  const endAngle = startAngle + totalAngle;
  const endPoint = polarToCartesian(endAngle);
  const largeArc = totalAngle > 180 ? 1 : 0;

  const bgPath = `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArc} 1 ${endPoint.x} ${endPoint.y}`;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: 128, height: 128 }}>
        <svg width="128" height="128" viewBox="0 0 128 128">
          {/* Background arc */}
          <path
            d={bgPath}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Filled arc */}
          <path
            d={bgPath}
            fill="none"
            stroke={level.strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={circumference - filled}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: 8 }}>
          <span className={`text-3xl font-bold ${level.color}`}>{score}</span>
          <span className={`text-xs font-medium ${level.color}`}>{level.label}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center max-w-[200px] leading-relaxed">
        {level.message}
      </p>
    </div>
  );
}

export function ClientHealthScore({
  client: _client,
  tasks,
  meetings,
  npsScore,
  variant = "badge",
}: ClientHealthScoreProps) {
  const score = calculateDynamicScore(tasks, meetings, npsScore);
  const level = getScoreLevel(score);

  if (variant === "circle") {
    return <HealthGauge score={score} level={level} />;
  }

  return (
    <Badge className={`${level.bgColor} ${level.color} ${level.borderColor} border font-medium hover:opacity-90`}>
      {level.label} ({score})
    </Badge>
  );
}

export { calculateDynamicScore, getScoreLevel };
