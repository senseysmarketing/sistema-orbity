import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Archive, Loader2 } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { ProjectOverview } from "@/components/projects/ProjectOverview";
import { ProjectTasksKanban } from "@/components/projects/ProjectTasksKanban";
import { ProjectFinancial } from "@/components/projects/ProjectFinancial";
import { ProjectMilestones } from "@/components/projects/ProjectMilestones";
import { ProjectNotes } from "@/components/projects/ProjectNotes";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { ProjectHealthBadge } from "@/components/projects/ProjectHealthBadge";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import { calculateProjectStatus, calculateHealthScore } from "@/hooks/useProjects";
import { useState } from "react";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    useProject,
    useProjectTasks,
    useProjectMilestones,
    useProjectPayments,
    useProjectNotes,
    archiveProject,
  } = useProjects();

  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: tasks = [] } = useProjectTasks(id);
  const { data: milestones = [] } = useProjectMilestones(id);
  const { data: payments = [] } = useProjectPayments(id);
  const { data: notes = [] } = useProjectNotes(id);
  const [editOpen, setEditOpen] = useState(false);

  if (projectLoading || !project) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const status = calculateProjectStatus(tasks, project.end_date);
  const health = calculateHealthScore(tasks, payments, project.start_date, project.end_date);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/projects")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">{project.name}</h1>
              <ProjectStatusBadge status={status} />
              <ProjectHealthBadge score={health} />
            </div>
            {project.clients?.name && (
              <p className="text-sm text-muted-foreground">{project.clients.name}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Edit className="h-4 w-4 mr-1" /> Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              archiveProject.mutate(project.id);
              navigate("/dashboard/projects");
            }}
          >
            <Archive className="h-4 w-4 mr-1" /> Arquivar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-5 md:w-auto md:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tarefas ({tasks.length})</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="milestones">Marcos</TabsTrigger>
          <TabsTrigger value="notes">Notas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <ProjectOverview project={project} tasks={tasks} payments={payments} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <ProjectTasksKanban projectId={project.id} tasks={tasks} />
        </TabsContent>

        <TabsContent value="financial" className="mt-6">
          <ProjectFinancial projectId={project.id} payments={payments} />
        </TabsContent>

        <TabsContent value="milestones" className="mt-6">
          <ProjectMilestones projectId={project.id} milestones={milestones} />
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <ProjectNotes projectId={project.id} notes={notes} />
        </TabsContent>
      </Tabs>

      <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} editProject={project} />
    </div>
  );
}
