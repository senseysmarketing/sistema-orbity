import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectHealthBadge } from "./ProjectHealthBadge";
import { ProjectStatusBadge } from "./ProjectStatusBadge";
import {
  Project, ProjectTask, ProjectPayment,
  calculateProjectStatus, calculateHealthScore,
} from "@/hooks/useProjects";
import { format, parseISO } from "date-fns";

import { Progress } from "@/components/ui/progress";
import { CalendarDays, User, FolderOpen } from "lucide-react";

interface ProjectOverviewProps {
  project: Project;
  tasks: ProjectTask[];
  payments: ProjectPayment[];
}

const TYPE_LABELS: Record<string, string> = {
  trafego: "Tráfego Pago",
  social_media: "Social Media",
  seo: "SEO",
  branding: "Branding",
  site: "Website",
  outro: "Outro",
};

export function ProjectOverview({ project, tasks, payments }: ProjectOverviewProps) {
  const status = calculateProjectStatus(tasks, project.end_date);
  const health = calculateHealthScore(tasks, payments, project.start_date, project.end_date);
  const donePct = tasks.length > 0
    ? Math.round((tasks.filter((t) => t.status === "done").length / tasks.length) * 100)
    : 0;

  const totalPaid = payments.filter((p) => p.paid_at).reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter((p) => !p.paid_at).reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Tipo:</span>
            <span className="text-sm font-medium">{TYPE_LABELS[project.project_type] || project.project_type}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Cliente:</span>
            <span className="text-sm font-medium">{project.clients?.name || "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Período:</span>
            <span className="text-sm font-medium">
              {project.start_date ? format(parseISO(project.start_date), "dd/MM/yyyy") : "—"}
              {" → "}
              {project.end_date ? format(parseISO(project.end_date), "dd/MM/yyyy") : "—"}
            </span>
          </div>
          {project.description && (
            <div>
              <span className="text-sm text-muted-foreground">Descrição:</span>
              <p className="text-sm mt-1">{project.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Health & Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saúde & Progresso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <ProjectStatusBadge status={status} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Health Score</span>
            <ProjectHealthBadge score={health} size="md" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Progresso das Tarefas</span>
              <span className="font-medium">{donePct}%</span>
            </div>
            <Progress value={donePct} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {tasks.filter((t) => t.status === "done").length} de {tasks.length} tarefas concluídas
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-lg font-bold text-green-600">
                R$ {totalPaid.toLocaleString("pt-BR")}
              </p>
              <p className="text-xs text-muted-foreground">Recebido</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-lg font-bold text-yellow-600">
                R$ {totalPending.toLocaleString("pt-BR")}
              </p>
              <p className="text-xs text-muted-foreground">Pendente</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
