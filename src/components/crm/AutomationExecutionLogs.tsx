import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  GitBranch,
  ListChecks,
  MessageSquare,
  PauseCircle,
  RefreshCw,
  Send,
  Settings2,
  Sparkles,
  Workflow,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAutomationExecutionLogs } from "@/hooks/useAutomationExecutionLogs";

type EventMeta = {
  label: string;
  icon: typeof Workflow;
  badgeClass: string;
};

const EVENT_META: Record<string, EventMeta> = {
  flow_entered: { label: "Entrou no fluxo", icon: Workflow, badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  message_sent: { label: "Mensagem enviada", icon: Send, badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  delay_created: { label: "Aguardando", icon: Clock3, badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  action_executed: { label: "Ação executada", icon: Settings2, badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" },
  condition_evaluated: { label: "Condição avaliada", icon: ListChecks, badgeClass: "bg-slate-500/15 text-slate-700 dark:text-slate-300" },
  branch_evaluated: { label: "Ramificação", icon: GitBranch, badgeClass: "bg-slate-500/15 text-slate-700 dark:text-slate-300" },
  lead_replied: { label: "Lead respondeu", icon: MessageSquare, badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  automation_completed: { label: "Concluído", icon: CheckCircle2, badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  automation_stopped: { label: "Interrompido", icon: PauseCircle, badgeClass: "bg-muted text-muted-foreground" },
  send_error: { label: "Erro de envio", icon: AlertTriangle, badgeClass: "bg-destructive/15 text-destructive" },
};

const FALLBACK: EventMeta = { label: "Evento", icon: Sparkles, badgeClass: "bg-muted text-muted-foreground" };

function metaFor(eventType: string): EventMeta {
  return EVENT_META[eventType] || FALLBACK;
}

function formatRelative(value: string): string {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true, locale: ptBR });
  } catch {
    return "agora";
  }
}

export function AutomationExecutionLogs({ flowId }: { flowId?: string | null }) {
  const { logs, isLoading, isFetching, refetch } = useAutomationExecutionLogs({ flowId, limit: 20 });

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold">Logs de execução</h4>
          <p className="text-xs text-muted-foreground">Últimos eventos das automações desta agência (atualiza a cada 30s).</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      <div className="divide-y">
        {isLoading && [1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3">
            <Skeleton className="h-9 w-9 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}

        {!isLoading && logs.length === 0 && (
          <div className="px-4 py-10 text-center">
            <Workflow className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <div className="text-sm font-medium">Sem eventos recentes</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Execuções de automação aparecerão aqui em tempo real.
            </p>
          </div>
        )}

        {!isLoading && logs.map((log) => {
          const meta = metaFor(log.event_type);
          const Icon = meta.icon;
          const leadName = log.lead?.name || "—";
          const flowName = log.flow?.name || "Fluxo removido";
          return (
            <div key={log.id} className="flex items-start gap-3 px-4 py-3">
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", meta.badgeClass)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn("border-transparent", meta.badgeClass)}>
                    {meta.label}
                  </Badge>
                  <span className="truncate text-sm font-medium">{leadName}</span>
                  <span className="truncate text-xs text-muted-foreground">· {flowName}</span>
                </div>
                {log.message && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{log.message}</p>
                )}
              </div>
              <div className="shrink-0 text-right text-xs text-muted-foreground">
                {formatRelative(log.created_at)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
