import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FolderKanban } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { ProjectMetricsCards } from "@/components/projects/ProjectMetricsCards";
import { ProjectsTable } from "@/components/projects/ProjectsTable";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function Projects() {
  const { projects, isLoading, allTasks, allPayments } = useProjects();
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.clients?.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Projetos</h1>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo Projeto
        </Button>
      </div>

      {/* Metrics */}
      <ProjectMetricsCards projects={projects} allTasks={allTasks} allPayments={allPayments} />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar projetos..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <ProjectsTable projects={filtered} allTasks={allTasks} allPayments={allPayments} />

      {/* Form */}
      <ProjectFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
