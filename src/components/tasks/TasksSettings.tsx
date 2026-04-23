import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Tag, GitMerge } from "lucide-react";
import { TaskTemplateManager } from "@/components/templates/TaskTemplateManager";
import { TaskTypeManager } from "@/components/tasks/TaskTypeManager";
import { TaskStatusManager } from "@/components/tasks/TaskStatusManager";

export type TasksSettingsView = "hub" | "templates" | "types" | "statuses";
type View = TasksSettingsView;

interface TasksSettingsProps {
  onViewChange?: (view: TasksSettingsView) => void;
}

interface HubCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}

function HubCard({ icon: Icon, title, description, onClick }: HubCardProps) {
  return (
    <Card
      onClick={onClick}
      className="group h-full hover:border-primary/50 transition-colors cursor-pointer"
    >
      <CardHeader>
        <Icon className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary mb-2" />
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export function TasksSettings({ onViewChange }: TasksSettingsProps = {}) {
  const [view, setView] = useState<View>("hub");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onViewChange?.(view);
    containerRef.current?.scrollTo({ top: 0 });
    const dialog = containerRef.current?.closest('[role="dialog"]') as HTMLElement | null;
    dialog?.scrollTo({ top: 0 });
  }, [view, onViewChange]);

  if (view === "hub") {
    return (
      <div ref={containerRef} className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Personalize templates, tipos e status do fluxo de tarefas
        </p>

        <div className="grid grid-cols-1 gap-4 items-stretch">
          <HubCard
            icon={FileText}
            title="Templates"
            description="Modelos prontos para criar tarefas com 1 clique"
            onClick={() => setView("templates")}
          />
          <HubCard
            icon={Tag}
            title="Tipos"
            description="Personalize categorias de tarefas (Design, Tráfego, etc.)"
            onClick={() => setView("types")}
          />
          <HubCard
            icon={GitMerge}
            title="Status"
            description="Personalize as etapas do fluxo de tarefas"
            onClick={() => setView("statuses")}
          />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      <Button
        variant="ghost"
        onClick={() => setView("hub")}
        className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
      </Button>

      {view === "templates" && <TaskTemplateManager />}
      {view === "types" && <TaskTypeManager />}
      {view === "statuses" && <TaskStatusManager />}
    </div>
  );
}
