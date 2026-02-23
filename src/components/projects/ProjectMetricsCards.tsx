import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen, CheckCircle2, AlertTriangle, Clock, DollarSign, TrendingUp } from "lucide-react";
import { Project, ProjectTask, ProjectPayment, calculateProjectStatus } from "@/hooks/useProjects";

interface ProjectMetricsCardsProps {
  projects: Project[];
  allTasks: ProjectTask[];
  allPayments: ProjectPayment[];
}

export function ProjectMetricsCards({ projects, allTasks, allPayments }: ProjectMetricsCardsProps) {
  const tasksByProject = allTasks.reduce((acc, t) => {
    (acc[t.project_id] = acc[t.project_id] || []).push(t);
    return acc;
  }, {} as Record<string, ProjectTask[]>);

  const statuses = projects.map((p) => ({
    project: p,
    status: calculateProjectStatus(tasksByProject[p.id] || [], p.end_date),
  }));

  const active = statuses.filter((s) => s.status !== "concluido").length;
  const completed = statuses.filter((s) => s.status === "concluido").length;
  const delayed = statuses.filter((s) => s.status === "atrasado").length;
  const atRisk = statuses.filter((s) => s.status === "em_risco").length;

  const totalPaid = allPayments
    .filter((p) => p.paid_at)
    .reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = allPayments
    .filter((p) => !p.paid_at)
    .reduce((s, p) => s + Number(p.amount), 0);

  const cards = [
    { label: "Ativos", value: active, icon: FolderOpen, color: "text-blue-600" },
    { label: "Concluídos", value: completed, icon: CheckCircle2, color: "text-green-600" },
    { label: "Atrasados", value: delayed, icon: Clock, color: "text-red-600" },
    { label: "Em Risco", value: atRisk, icon: AlertTriangle, color: "text-yellow-600" },
    {
      label: "Receita Recebida",
      value: `R$ ${totalPaid.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      label: "A Receber",
      value: `R$ ${totalPending.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`,
      icon: TrendingUp,
      color: "text-primary",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <c.icon className={`h-4 w-4 ${c.color}`} />
              <span className="text-xs text-muted-foreground">{c.label}</span>
            </div>
            <p className="text-xl font-bold">{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
