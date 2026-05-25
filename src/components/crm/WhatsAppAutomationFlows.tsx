import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Bell,
  Bot,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  GitBranch,
  ListChecks,
  MessageSquare,
  MoreHorizontal,
  PauseCircle,
  Plus,
  Power,
  Send,
  Settings2,
  Trash2,
  Upload,
  Workflow,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAgency } from "@/hooks/useAgency";
import {
  buildAutomationFlowExport,
  downloadAutomationFlowFile,
  parseAutomationFlowImport,
} from "@/lib/automation-flow-transfer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AutomationFlow,
  AutomationFlowDraft,
  AutomationStepDraft,
  AutomationStepType,
  useWhatsAppAutomationFlows,
} from "@/hooks/useWhatsAppAutomationFlows";
import { cn } from "@/lib/utils";

const TRIGGERS = [
  { value: "lead_created", label: "Novo lead criado" },
  { value: "pipeline_stage_entered", label: "Lead entrou em uma etapa" },
  { value: "lead_idle", label: "Lead sem resposta por X tempo" },
  { value: "whatsapp_message_received", label: "Mensagem recebida no WhatsApp" },
  { value: "keyword_received", label: "Palavra-chave recebida" },
  { value: "tag_added", label: "Tag adicionada ao lead" },
  { value: "owner_changed", label: "Responsável atribuído ou alterado" },
  { value: "task_created", label: "Tarefa criada" },
  { value: "task_completed", label: "Tarefa concluída" },
  { value: "meeting_created", label: "Reunião criada" },
  { value: "proposal_sent", label: "Proposta enviada" },
  { value: "client_created", label: "Cliente criado" },
  { value: "lead_status_changed", label: "Status do lead alterado" },
  { value: "manual", label: "Gatilho manual" },
];

const STEP_TYPES: Array<{ value: AutomationStepType; label: string; icon: typeof MessageSquare }> = [
  { value: "condition", label: "Condição", icon: ListChecks },
  { value: "send_whatsapp", label: "Mensagem WhatsApp", icon: MessageSquare },
  { value: "send_whatsapp_media", label: "Mídia/link/documento", icon: Send },
  { value: "delay", label: "Delay", icon: Clock3 },
  { value: "action", label: "Ação", icon: Settings2 },
  { value: "branch", label: "Ramificação simples", icon: GitBranch },
  { value: "end", label: "Encerramento", icon: CheckCircle2 },
];

const CONDITION_FIELDS = [
  { value: "source", label: "Origem" },
  { value: "status", label: "Etapa/status" },
  { value: "assigned_to", label: "Responsável" },
  { value: "tags", label: "Tag" },
  { value: "service_interest", label: "Serviço de interesse" },
  { value: "budget", label: "Orçamento" },
  { value: "company", label: "Empresa" },
  { value: "lead_replied", label: "Lead respondeu" },
  { value: "custom_field", label: "Campo personalizado" },
  { value: "campaign", label: "Campanha" },
];

const OPERATORS = [
  { value: "equals", label: "é" },
  { value: "not_equals", label: "não é" },
  { value: "contains", label: "contém" },
  { value: "not_contains", label: "não contém" },
  { value: "exists", label: "existe" },
  { value: "not_exists", label: "não existe" },
  { value: "greater_than", label: "maior que" },
  { value: "less_than", label: "menor que" },
];

const ACTIONS = [
  { value: "create_task", label: "Criar tarefa" },
  { value: "move_lead", label: "Mover lead para etapa" },
  { value: "add_tag", label: "Adicionar tag" },
  { value: "remove_tag", label: "Remover tag" },
  { value: "assign_owner", label: "Alterar responsável" },
  { value: "update_status", label: "Atualizar status do lead" },
  { value: "notify_team", label: "Notificar equipe" },
  { value: "pause_automation", label: "Pausar automação" },
  { value: "end_automation", label: "Encerrar automação" },
];

const VARIABLES = [
  "{nome}",
  "{telefone}",
  "{email}",
  "{empresa}",
  "{responsavel}",
  "{origem}",
  "{etapa}",
  "{status}",
  "{servico_interesse}",
  "{tag}",
  "{data_reuniao}",
];

const WEEK_DAYS = [
  { value: "monday", label: "Seg" },
  { value: "tuesday", label: "Ter" },
  { value: "wednesday", label: "Qua" },
  { value: "thursday", label: "Qui" },
  { value: "friday", label: "Sex" },
  { value: "saturday", label: "Sab" },
  { value: "sunday", label: "Dom" },
];

const TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Cuiaba",
  "America/Fortaleza",
  "America/Recife",
  "America/Bahia",
  "UTC",
];

const DEFAULT_SCHEDULE_WINDOW = {
  enabled: false,
  timezone: "America/Sao_Paulo",
  days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  start_time: "08:00",
  end_time: "17:00",
  outside_window_behavior: "schedule_next_available",
};

function triggerLabel(value: string) {
  return TRIGGERS.find((trigger) => trigger.value === value)?.label || value;
}

function stepLabel(value: AutomationStepType) {
  return STEP_TYPES.find((step) => step.value === value)?.label || value;
}

function defaultStep(type: AutomationStepType): AutomationStepDraft {
  if (type === "condition") {
    return {
      step_type: type,
      title: "Filtro de lead",
      config: {
        mode: "all",
        on_false: "stop",
        conditions: [{ field: "source", operator: "equals", value: "Meta Ads" }],
      },
    };
  }
  if (type === "delay") {
    return { step_type: type, title: "Aguardar", config: { amount: 10, unit: "minutes" } };
  }
  if (type === "action") {
    return { step_type: type, title: "Criar tarefa", config: { action: "create_task", title: "Follow-up comercial" } };
  }
  if (type === "branch") {
    return {
      step_type: type,
      title: "Ramificação",
      config: {
        mode: "all",
        conditions: [{ field: "lead_replied", operator: "is_true", value: "true" }],
      },
    };
  }
  if (type === "end") {
    return { step_type: type, title: "Encerrar fluxo", config: {} };
  }
  if (type === "send_whatsapp_media") {
    return {
      step_type: type,
      title: "Enviar material",
      config: { message: "Olá, {nome}! Segue o material sobre {servico_interesse}.", media_url: "" },
    };
  }
  return {
    step_type: "send_whatsapp",
    title: "Mensagem imediata",
    config: {
      message: "Olá, {nome}! Vi que você demonstrou interesse em {servico_interesse}. Posso te enviar mais detalhes?",
    },
  };
}

function defaultDraft(): AutomationFlowDraft {
  return {
    name: "",
    description: "",
    status: "inactive",
    trigger_type: "lead_created",
    trigger_config: { schedule_window: DEFAULT_SCHEDULE_WINDOW },
    stop_rules: {
      stop_on_reply: true,
      stop_on_final_status: true,
      stop_on_manual_owner_change: false,
      stop_on_tag_added: "",
      avoid_conflicts: true,
    },
    steps: [defaultStep("send_whatsapp")],
  };
}

function flowToDraft(flow: AutomationFlow): AutomationFlowDraft {
  const steps = [...(flow.automation_steps || [])]
    .filter((step: any) => !step.is_deleted)
    .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
    .map((step) => ({
      id: step.id,
      step_type: step.step_type,
      title: step.title,
      config: step.config || {},
    }));

  return {
    id: flow.id,
    name: flow.name,
    description: flow.description || "",
    status: flow.status,
    trigger_type: flow.trigger_type,
    trigger_config: flow.trigger_config || {},
    stop_rules: flow.stop_rules || {},
    steps: steps.length > 0 ? steps : [defaultStep("send_whatsapp")],
  };
}

function formatDate(value: unknown) {
  if (!value) return "Nunca";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Nunca";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function responseRate(metrics: Record<string, number | string | null>) {
  const sent = Number(metrics.messages_sent || 0);
  const replies = Number(metrics.responses_received || 0);
  if (!sent) return "0%";
  return `${Math.round((replies / sent) * 100)}%`;
}

function BuilderBlock({
  step,
  index,
  total,
  onChange,
  onRemove,
}: {
  step: AutomationStepDraft;
  index: number;
  total: number;
  onChange: (step: AutomationStepDraft) => void;
  onRemove: () => void;
}) {
  const Icon = STEP_TYPES.find((item) => item.value === step.step_type)?.icon || MessageSquare;
  const config = step.config || {};
  const firstCondition = ((config.conditions as any[]) || [])[0] || { field: "source", operator: "equals", value: "" };

  const updateConfig = (patch: Record<string, unknown>) => onChange({ ...step, config: { ...config, ...patch } });
  const updateCondition = (patch: Record<string, unknown>) => {
    updateConfig({ conditions: [{ ...firstCondition, ...patch }] });
  };

  return (
    <div className="rounded-lg border bg-background p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">Bloco {index + 1}</div>
            <div className="truncate text-xs text-muted-foreground">{stepLabel(step.step_type)}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Select
            value={step.step_type}
            onValueChange={(value) => onChange({ ...defaultStep(value as AutomationStepType), title: step.title })}
          >
            <SelectTrigger className="h-9 w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STEP_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={onRemove} disabled={total <= 1} title="Remover bloco">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Título do bloco</Label>
          <Input value={step.title} onChange={(event) => onChange({ ...step, title: event.target.value })} />
        </div>

        {step.step_type === "condition" && (
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_1.2fr]">
            <Select value={String(firstCondition.field || "source")} onValueChange={(value) => updateCondition({ field: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CONDITION_FIELDS.map((field) => <SelectItem key={field.value} value={field.value}>{field.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(firstCondition.operator || "equals")} onValueChange={(value) => updateCondition({ operator: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{OPERATORS.map((operator) => <SelectItem key={operator.value} value={operator.value}>{operator.label}</SelectItem>)}</SelectContent>
            </Select>
            <Input value={String(firstCondition.value || "")} onChange={(event) => updateCondition({ value: event.target.value })} placeholder="Valor esperado" />
            <Select value={String(config.on_false || "stop")} onValueChange={(value) => updateConfig({ on_false: value })}>
              <SelectTrigger className="md:col-span-3"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="stop">Parar se não cumprir</SelectItem>
                <SelectItem value="continue">Continuar mesmo sem cumprir</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {(step.step_type === "send_whatsapp" || step.step_type === "send_whatsapp_media") && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                value={String(config.message || "")}
                onChange={(event) => updateConfig({ message: event.target.value })}
                className="min-h-[112px]"
              />
            </div>
            {step.step_type === "send_whatsapp_media" && (
              <div className="space-y-2">
                <Label>Link da mídia/documento</Label>
                <Input value={String(config.media_url || "")} onChange={(event) => updateConfig({ media_url: event.target.value })} placeholder="https://..." />
              </div>
            )}
          </div>
        )}

        {step.step_type === "delay" && (
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <Input
              type="number"
              min={0}
              value={String(config.amount ?? 10)}
              onChange={(event) => updateConfig({ amount: Number(event.target.value) })}
            />
            <Select value={String(config.unit || "minutes")} onValueChange={(value) => updateConfig({ unit: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="minutes">Minutos</SelectItem>
                <SelectItem value="hours">Horas</SelectItem>
                <SelectItem value="days">Dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {step.step_type === "action" && (
          <div className="grid gap-3 md:grid-cols-2">
            <Select value={String(config.action || "create_task")} onValueChange={(value) => updateConfig({ action: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ACTIONS.map((action) => <SelectItem key={action.value} value={action.value}>{action.label}</SelectItem>)}</SelectContent>
            </Select>
            {["move_lead", "update_status"].includes(String(config.action)) && (
              <Input value={String(config.status || "")} onChange={(event) => updateConfig({ status: event.target.value })} placeholder="Etapa/status de destino" />
            )}
            {["add_tag", "remove_tag"].includes(String(config.action)) && (
              <Input value={String(config.tag || "")} onChange={(event) => updateConfig({ tag: event.target.value })} placeholder="Nome da tag" />
            )}
            {String(config.action || "create_task") === "create_task" && (
              <>
                <Input value={String(config.title || "")} onChange={(event) => updateConfig({ title: event.target.value })} placeholder="Título da tarefa" />
                <Input type="number" min={0} value={String(config.due_amount || 1)} onChange={(event) => updateConfig({ due_amount: Number(event.target.value) })} placeholder="Prazo" />
              </>
            )}
            {String(config.action) === "notify_team" && (
              <Input value={String(config.message || "")} onChange={(event) => updateConfig({ message: event.target.value })} placeholder="Mensagem interna" />
            )}
          </div>
        )}

        {step.step_type === "branch" && (
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr]">
            <Select value={String(firstCondition.field || "lead_replied")} onValueChange={(value) => updateCondition({ field: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CONDITION_FIELDS.map((field) => <SelectItem key={field.value} value={field.value}>{field.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(firstCondition.operator || "is_true")} onValueChange={(value) => updateCondition({ operator: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OPERATORS.map((operator) => <SelectItem key={operator.value} value={operator.value}>{operator.label}</SelectItem>)}
                <SelectItem value="is_true">é verdadeiro</SelectItem>
                <SelectItem value="is_false">é falso</SelectItem>
              </SelectContent>
            </Select>
            <Input value={String(firstCondition.value || "")} onChange={(event) => updateCondition({ value: event.target.value })} placeholder="Valor" />
            <Input type="number" min={1} max={total} value={String(config.true_position || "")} onChange={(event) => updateConfig({ true_position: Number(event.target.value) })} placeholder="Bloco se sim" />
            <Input type="number" min={1} max={total} value={String(config.false_position || "")} onChange={(event) => updateConfig({ false_position: Number(event.target.value) })} placeholder="Bloco se não" />
          </div>
        )}

        {step.step_type === "end" && (
          <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            Este bloco conclui a execução e registra o encerramento nos logs.
          </div>
        )}
      </div>
    </div>
  );
}

function BuilderDialog({
  open,
  draft,
  isSaving,
  importWarnings,
  onOpenChange,
  onDraftChange,
  onSave,
}: {
  open: boolean;
  draft: AutomationFlowDraft;
  isSaving: boolean;
  importWarnings?: string[];
  onOpenChange: (open: boolean) => void;
  onDraftChange: (draft: AutomationFlowDraft) => void;
  onSave: () => void;
}) {
  const setStopRule = (key: string, value: unknown) => {
    onDraftChange({ ...draft, stop_rules: { ...draft.stop_rules, [key]: value } });
  };

  const addStep = (type: AutomationStepType) => {
    onDraftChange({ ...draft, steps: [...draft.steps, defaultStep(type)] });
  };

  const updateStep = (index: number, step: AutomationStepDraft) => {
    const next = [...draft.steps];
    next[index] = step;
    onDraftChange({ ...draft, steps: next });
  };

  const removeStep = (index: number) => {
    onDraftChange({ ...draft, steps: draft.steps.filter((_, stepIndex) => stepIndex !== index) });
  };

  const triggerConfig = draft.trigger_config || {};
  const scheduleWindow = {
    ...DEFAULT_SCHEDULE_WINDOW,
    ...((triggerConfig.schedule_window as Record<string, unknown>) || {}),
  };
  const scheduleDays = Array.isArray(scheduleWindow.days) ? scheduleWindow.days.map(String) : DEFAULT_SCHEDULE_WINDOW.days;
  const setTriggerConfig = (next: Record<string, unknown>) => {
    onDraftChange({ ...draft, trigger_config: { ...triggerConfig, ...next } });
  };
  const setScheduleWindow = (next: Record<string, unknown>) => {
    setTriggerConfig({
      schedule_window: {
        ...scheduleWindow,
        ...next,
        outside_window_behavior: "schedule_next_available",
      },
    });
  };
  const toggleScheduleDay = (day: string, checked: boolean) => {
    const days = checked ? Array.from(new Set([...scheduleDays, day])) : scheduleDays.filter((item) => item !== day);
    setScheduleWindow({ days });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto p-0">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>{draft.id ? "Editar fluxo" : "Novo fluxo"}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Monte uma automação vertical com gatilho, condições, ações, delays e parada automática.
          </p>
        </DialogHeader>

        <div className="grid gap-6 px-6 py-5 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={draft.name} onChange={(event) => onDraftChange({ ...draft, name: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={draft.description} onChange={(event) => onDraftChange({ ...draft, description: event.target.value })} className="min-h-[80px]" />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <Label>Status</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={draft.status === "active"}
                  onCheckedChange={(checked) => onDraftChange({ ...draft, status: checked ? "active" : "inactive" })}
                />
                <span className="text-sm font-medium">{draft.status === "active" ? "Ativa" : "Inativa"}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Gatilho</Label>
              <Select value={draft.trigger_type} onValueChange={(value) => onDraftChange({ ...draft, trigger_type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TRIGGERS.map((trigger) => <SelectItem key={trigger.value} value={trigger.value}>{trigger.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {draft.trigger_type === "keyword_received" && (
              <div className="space-y-2">
                <Label>Palavra-chave</Label>
                <Input
                  value={String(triggerConfig.keyword || "")}
                  onChange={(event) => setTriggerConfig({ keyword: event.target.value })}
                  placeholder="ex: orçamento"
                />
              </div>
            )}
            <div className="rounded-lg border bg-background p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Horarios de envio</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Se um lead entrar fora desse horario, a automacao sera iniciada automaticamente no proximo horario permitido.
                  </p>
                </div>
                <Switch
                  checked={scheduleWindow.enabled === true}
                  onCheckedChange={(checked) => setScheduleWindow({ enabled: checked })}
                />
              </div>

              {scheduleWindow.enabled === true && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Inicio</Label>
                      <Input
                        type="time"
                        value={String(scheduleWindow.start_time || "08:00")}
                        onChange={(event) => setScheduleWindow({ start_time: event.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Fim</Label>
                      <Input
                        type="time"
                        value={String(scheduleWindow.end_time || "17:00")}
                        onChange={(event) => setScheduleWindow({ end_time: event.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Timezone</Label>
                    <Select
                      value={String(scheduleWindow.timezone || "America/Sao_Paulo")}
                      onValueChange={(value) => setScheduleWindow({ timezone: value })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((timezone) => (
                          <SelectItem key={timezone} value={timezone}>{timezone}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Dias permitidos</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {WEEK_DAYS.map((day) => {
                        const checked = scheduleDays.includes(day.value);
                        return (
                          <Button
                            key={day.value}
                            type="button"
                            variant={checked ? "default" : "outline"}
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => toggleScheduleDay(day.value, !checked)}
                          >
                            {day.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Bell className="h-4 w-4 text-primary" />
                Regras de parada
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm">Parar quando o lead responder</span>
                  <Switch checked={draft.stop_rules.stop_on_reply !== false} onCheckedChange={(value) => setStopRule("stop_on_reply", value)} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm">Parar em etapa final</span>
                  <Switch checked={draft.stop_rules.stop_on_final_status !== false} onCheckedChange={(value) => setStopRule("stop_on_final_status", value)} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm">Evitar fluxos conflitantes</span>
                  <Switch checked={draft.stop_rules.avoid_conflicts !== false} onCheckedChange={(value) => setStopRule("avoid_conflicts", value)} />
                </div>
                <Input
                  value={String(draft.stop_rules.stop_on_tag_added || "")}
                  onChange={(event) => setStopRule("stop_on_tag_added", event.target.value)}
                  placeholder="Parar ao adicionar tag"
                />
              </div>
            </div>
          </aside>

          <section className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                  <Workflow className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Quando isso acontecer...</div>
                  <div className="text-sm text-primary">{triggerLabel(draft.trigger_type)}</div>
                </div>
              </div>
            </div>

            {draft.steps.map((step, index) => (
              <BuilderBlock
                key={`${step.id || "new"}-${index}`}
                step={step}
                index={index}
                total={draft.steps.length}
                onChange={(next) => updateStep(index, next)}
                onRemove={() => removeStep(index)}
              />
            ))}

            <div className="flex flex-wrap gap-2">
              {STEP_TYPES.map((type) => (
                <Button key={type.value} variant="outline" size="sm" onClick={() => addStep(type.value)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {type.label}
                </Button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Variáveis: {VARIABLES.join(", ")}. Dados vazios são substituídos por fallback seguro para evitar mensagens quebradas.
            </p>
          </section>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="action" onClick={onSave} disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar fluxo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WhatsAppAutomationFlows() {
  const { flows, isLoading, isSaving, saveFlow, toggleFlow, deleteFlow, duplicateFlow } = useWhatsAppAutomationFlows();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [draft, setDraft] = useState<AutomationFlowDraft>(() => defaultDraft());

  const totals = useMemo(() => {
    return flows.reduce(
      (acc, flow) => {
        const metrics = flow.metrics || {};
        acc.entered += Number(metrics.entered || 0);
        acc.sent += Number(metrics.messages_sent || 0);
        acc.replies += Number(metrics.responses_received || 0);
        acc.errors += Number(metrics.errors || 0);
        return acc;
      },
      { entered: 0, sent: 0, replies: 0, errors: 0 },
    );
  }, [flows]);

  const openNew = () => {
    setDraft(defaultDraft());
    setBuilderOpen(true);
  };

  const openEdit = (flow: AutomationFlow) => {
    setDraft(flowToDraft(flow));
    setBuilderOpen(true);
  };

  const handleSave = () => {
    saveFlow.mutate(draft, {
      onSuccess: () => setBuilderOpen(false),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Fluxos de Automação WhatsApp</h3>
          <p className="text-sm text-muted-foreground">
            Gatilhos, condições, mensagens, delays e logs usando a Uazapi.
          </p>
        </div>
        <Button variant="action" onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Novo fluxo
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <MetricBox label="Leads que entraram" value={totals.entered} icon={Bot} />
        <MetricBox label="Mensagens enviadas" value={totals.sent} icon={MessageSquare} />
        <MetricBox label="Respostas recebidas" value={totals.replies} icon={CheckCircle2} />
        <MetricBox label="Erros" value={totals.errors} icon={PauseCircle} />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Automação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Gatilho</TableHead>
              <TableHead className="hidden md:table-cell">Entraram</TableHead>
              <TableHead className="hidden md:table-cell">Enviadas</TableHead>
              <TableHead className="hidden lg:table-cell">Resposta</TableHead>
              <TableHead className="hidden xl:table-cell">Última execução</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && [1, 2, 3].map((item) => (
              <TableRow key={item}>
                <TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell>
              </TableRow>
            ))}

            {!isLoading && flows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>
                  <div className="py-10 text-center">
                    <Workflow className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                    <div className="font-medium">Nenhum fluxo criado</div>
                    <p className="mt-1 text-sm text-muted-foreground">Crie o primeiro fluxo para substituir a cadência antiga.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!isLoading && flows.map((flow) => {
              const metrics = flow.metrics || {};
              return (
                <TableRow key={flow.id}>
                  <TableCell>
                    <button className="text-left" onClick={() => openEdit(flow)}>
                      <div className="font-medium">{flow.name}</div>
                      <div className="line-clamp-1 text-xs text-muted-foreground">{flow.description || "Sem descrição"}</div>
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(flow.status === "active" ? "bg-emerald-600" : "bg-muted text-muted-foreground hover:bg-muted")}>
                      {flow.status === "active" ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{triggerLabel(flow.trigger_type)}</TableCell>
                  <TableCell className="hidden md:table-cell">{Number(metrics.entered || 0)}</TableCell>
                  <TableCell className="hidden md:table-cell">{Number(metrics.messages_sent || 0)}</TableCell>
                  <TableCell className="hidden lg:table-cell">{responseRate(metrics)}</TableCell>
                  <TableCell className="hidden xl:table-cell">{formatDate(metrics.last_execution_at)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(flow)}>
                          <Settings2 className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleFlow.mutate({ id: flow.id, status: flow.status === "active" ? "inactive" : "active" })}>
                          <Power className="mr-2 h-4 w-4" />
                          {flow.status === "active" ? "Desativar" : "Ativar"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateFlow.mutate(flow)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteFlow.mutate(flow.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <BuilderDialog
        open={builderOpen}
        draft={draft}
        isSaving={isSaving}
        onOpenChange={setBuilderOpen}
        onDraftChange={setDraft}
        onSave={handleSave}
      />
    </div>
  );
}

function MetricBox({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Bot }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
