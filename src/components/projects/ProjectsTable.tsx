import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ProjectHealthBadge } from "./ProjectHealthBadge";
import { ProjectStatusBadge } from "./ProjectStatusBadge";
import {
  Project, ProjectTask, ProjectPayment,
  calculateProjectStatus, calculateHealthScore,
} from "@/hooks/useProjects";
import { differenceInDays, parseISO, format } from "date-fns";


interface ProjectsTableProps {
  projects: Project[];
  allTasks: ProjectTask[];
  allPayments: ProjectPayment[];
}

export function ProjectsTable({ projects, allTasks, allPayments }: ProjectsTableProps) {
  const navigate = useNavigate();

  const tasksByProject = allTasks.reduce((acc, t) => {
    (acc[t.project_id] = acc[t.project_id] || []).push(t);
    return acc;
  }, {} as Record<string, ProjectTask[]>);

  const paymentsByProject = allPayments.reduce((acc, p) => {
    (acc[p.project_id] = acc[p.project_id] || []).push(p);
    return acc;
  }, {} as Record<string, ProjectPayment[]>);

  if (projects.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum projeto encontrado. Crie seu primeiro projeto!
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Projeto</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progresso</TableHead>
            <TableHead>Prazo</TableHead>
            <TableHead>Saúde</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((p) => {
            const tasks = tasksByProject[p.id] || [];
            const payments = paymentsByProject[p.id] || [];
            const status = calculateProjectStatus(tasks, p.end_date);
            const health = calculateHealthScore(tasks, payments, p.start_date, p.end_date);
            const donePct =
              tasks.length > 0
                ? Math.round((tasks.filter((t) => t.status === "done").length / tasks.length) * 100)
                : 0;
            const daysLeft = p.end_date
              ? differenceInDays(parseISO(p.end_date), new Date())
              : null;

            return (
              <TableRow
                key={p.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/dashboard/projects/${p.id}`)}
              >
                <TableCell className="font-medium">
                  {p.clients?.name || "—"}
                </TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>
                  <ProjectStatusBadge status={status} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <Progress value={donePct} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground w-8">{donePct}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  {p.end_date ? (
                    <div className="text-sm">
                      <div>{format(parseISO(p.end_date), "dd/MM/yy")}</div>
                      {daysLeft !== null && (
                        <div className={`text-xs ${daysLeft < 0 ? "text-red-500" : daysLeft < 7 ? "text-yellow-500" : "text-muted-foreground"}`}>
                          {daysLeft < 0 ? `${Math.abs(daysLeft)}d atrasado` : `${daysLeft}d restantes`}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <ProjectHealthBadge score={health} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
