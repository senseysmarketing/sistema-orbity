import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ClientHealthScore } from "@/components/clients/ClientHealthScore";
import { ClientForm } from "@/components/admin/ClientForm";
import { MeetingFormDialog } from "@/components/agenda/MeetingFormDialog";
import { useAuth } from "@/hooks/useAuth";
import { DatePickerDemo } from "@/components/ui/date-picker";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CalendarPlus,
  ChevronRight,
  Clock,
  Copy,
  Edit2,
  ExternalLink,
  Image,
  Key,
  Phone,
  Plus,
  Sparkles,
  Video,
} from "lucide-react";
import { format, differenceInMonths, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentAgency } = useAgency();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Dialog states
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [credentialDialogOpen, setCredentialDialogOpen] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [quickTaskDialogOpen, setQuickTaskDialogOpen] = useState(false);

  // Credential form
  const [newCred, setNewCred] = useState({ platform: "", username: "", password: "" });
  const [savingCred, setSavingCred] = useState(false);

  // Quick task form
  const [quickTask, setQuickTask] = useState({ title: "", task_type: "tarefa", due_date: undefined as Date | undefined });
  const [savingTask, setSavingTask] = useState(false);

  const { data: client, isLoading } = useQuery({
    queryKey: ["client-detail", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from("clients").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: dashboardData } = useQuery({
    queryKey: ["client-dashboard", id, currentAgency?.id],
    queryFn: async () => {
      if (!id || !currentAgency?.id) return null;

        const [tasksResult, meetingsResult, credentialsResult, npsResult] = await Promise.all([
        supabase
          .from("task_clients")
          .select("tasks!inner(id, title, status, priority, due_date)")
          .eq("client_id", id)
          .eq("tasks.agency_id", currentAgency.id)
          .not("tasks.status", "in", '("done","cancelled","completed")')
          .limit(8),
        supabase
          .from("meeting_clients")
          .select("meetings!inner(id, title, start_time, status, outcome, meeting_type)")
          .eq("client_id", id)
          .order("meetings(start_time)", { ascending: false })
          .limit(10),
        supabase
          .from("client_credentials")
          .select("id, platform, username, password, url")
          .eq("client_id", id)
          .eq("agency_id", currentAgency.id)
          .limit(5),
        supabase
          .from("nps_responses")
          .select("score")
          .eq("agency_id", currentAgency.id)
          .order("response_date", { ascending: false })
          .limit(50),
      ]);

      const tasks = (tasksResult.data || []).map((r: any) => r.tasks).filter(Boolean);

      let meetings: any[] = [];
      if (!meetingsResult.error && meetingsResult.data) {
        meetings = meetingsResult.data.map((r: any) => r.meetings).filter(Boolean);
      }

      const credentials = credentialsResult.data || [];

      // Match NPS by client name (nps_responses has client_name, not client_id)
      const allNps = npsResult.data || [];

      return { tasks, meetings, credentials, allNps };
    },
    enabled: !!id && !!currentAgency?.id,
    staleTime: 3 * 60 * 1000,
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "Senha copiada para a área de transferência." });
  };

  // --- Credential insert ---
  const handleSaveCredential = async () => {
    if (!newCred.platform.trim()) {
      toast({ title: "Erro", description: "Informe a plataforma.", variant: "destructive" });
      return;
    }
    if (!id || !currentAgency?.id || !user?.id) return;
    setSavingCred(true);
    try {
      const { error } = await supabase.from("client_credentials").insert({
        client_id: id,
        agency_id: currentAgency.id,
        platform: newCred.platform.trim(),
        username: newCred.username.trim() || null,
        password: newCred.password.trim() || null,
        created_by: user.id,
      });
      if (error) throw error;
      toast({ title: "Acesso salvo!", description: `Credencial de ${newCred.platform} adicionada.` });
      setNewCred({ platform: "", username: "", password: "" });
      setCredentialDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["client-dashboard", id] });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSavingCred(false);
    }
  };

  // --- Quick Task insert ---
  const handleSaveQuickTask = async () => {
    if (!quickTask.title.trim()) {
      toast({ title: "Erro", description: "Informe o título da tarefa.", variant: "destructive" });
      return;
    }
    if (!id || !currentAgency?.id || !user?.id) return;
    setSavingTask(true);
    try {
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .insert({
          title: quickTask.title.trim(),
          task_type: quickTask.task_type || "tarefa",
          due_date: quickTask.due_date ? quickTask.due_date.toISOString() : null,
          agency_id: currentAgency.id,
          created_by: user.id,
          status: "todo",
        })
        .select("id")
        .single();
      if (taskError) throw taskError;

      // Link task to client
      const { error: linkError } = await supabase.from("task_clients").insert({
        task_id: taskData.id,
        client_id: id,
      });
      if (linkError) throw linkError;

      toast({ title: "Tarefa criada!", description: `"${quickTask.title}" vinculada ao cliente.` });
      setQuickTask({ title: "", task_type: "tarefa", due_date: undefined });
      setQuickTaskDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["client-dashboard", id] });
    } catch (err: any) {
      toast({ title: "Erro ao criar tarefa", description: err.message, variant: "destructive" });
    } finally {
      setSavingTask(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Skeleton className="h-64 lg:col-span-3 rounded-xl" />
          <Skeleton className="h-64 lg:col-span-2 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Cliente não encontrado</h3>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard/clients")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para clientes
        </Button>
      </div>
    );
  }

  const tasks = dashboardData?.tasks || [];
  const meetings = dashboardData?.meetings || [];
  const credentials = dashboardData?.credentials || [];
  const allNps = dashboardData?.allNps || [];
  const matchedNps = allNps.find((n: any) => n.client_name === client.name);
  const npsScore = matchedNps?.score ?? undefined;
  const monthsActive = client.start_date ? differenceInMonths(new Date(), new Date(client.start_date)) : 0;

  const nextMeeting = meetings.find((m: any) => new Date(m.start_time) > new Date());
  const aiSummaryParts: string[] = [];
  if (client.start_date) {
    aiSummaryParts.push(`Cliente ativo há ${monthsActive} ${monthsActive === 1 ? "mês" : "meses"}.`);
  }
  if (tasks.length > 0) {
    aiSummaryParts.push(`${tasks.length} ${tasks.length === 1 ? "tarefa pendente" : "tarefas pendentes"}.`);
  } else {
    aiSummaryParts.push("Nenhuma tarefa pendente.");
  }
  if (nextMeeting) {
    aiSummaryParts.push(
      `Próxima reunião ${formatDistanceToNow(new Date(nextMeeting.start_time), { addSuffix: true, locale: ptBR })}.`
    );
  }
  if (credentials.length > 0) {
    aiSummaryParts.push(`${credentials.length} ${credentials.length === 1 ? "acesso salvo" : "acessos salvos"} no vault.`);
  }

  const whatsappLink = client.contact
    ? `https://wa.me/${client.contact.replace(/\D/g, "")}`
    : "#";

  // Drive link: check observations for a URL
  const driveUrl = client.observations?.match(/https?:\/\/[^\s]+drive[^\s]*/i)?.[0] || "";

  const priorityColors: Record<string, string> = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };

  const statusLabels: Record<string, string> = {
    todo: "A Fazer",
    in_progress: "Em Progresso",
    review: "Revisão",
    done: "Concluída",
  };

  const meetingStatusLabels: Record<string, { label: string; color: string }> = {
    scheduled: { label: "Agendada", color: "bg-blue-100 text-blue-700" },
    confirmed: { label: "Confirmada", color: "bg-emerald-100 text-emerald-700" },
    completed: { label: "Realizada", color: "bg-purple-100 text-purple-700" },
    cancelled: { label: "Cancelada", color: "bg-red-100 text-red-700" },
    rescheduled: { label: "Reagendada", color: "bg-amber-100 text-amber-700" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/clients")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-xl font-bold border border-purple-200">
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{client.name}</h1>
              <Badge
                className={
                  client.active
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }
              >
                {client.active ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              {client.service && <span>{client.service}</span>}
              {client.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {monthsActive} {monthsActive === 1 ? "mês" : "meses"} de casa
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditFormOpen(true)}
          >
            <Edit2 className="h-4 w-4 mr-1" />
            Editar
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => window.open(whatsappLink, "_blank")}
          >
            <Phone className="h-4 w-4 mr-1" />
            WhatsApp
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!driveUrl}
            onClick={() => {
              if (driveUrl) {
                window.open(driveUrl, "_blank");
              } else {
                setEditFormOpen(true);
              }
            }}
            title={driveUrl ? "Abrir Google Drive" : "Sem link configurado — clique para editar perfil"}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Drive
          </Button>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Right column on desktop — shows first on mobile */}
        <div className="lg:col-span-2 space-y-4 order-1 lg:order-2">
          {/* AI Summary */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-purple-600 mt-0.5 animate-glow shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-purple-700 mb-1">Resumo IA</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {aiSummaryParts.join(" ")}
                </p>
              </div>
            </div>
          </div>

          {/* Health Score */}
          <div className="bg-white border rounded-xl shadow-sm p-5 flex flex-col items-center">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Saúde do Cliente</h3>
            <ClientHealthScore
              client={client}
              tasks={tasks}
              meetings={meetings}
              npsScore={npsScore}
              variant="circle"
            />
            <div className="grid grid-cols-3 gap-4 mt-4 w-full text-center">
              <div>
                <p className="text-lg font-bold">{tasks.length}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
              <div>
                <p className="text-lg font-bold">{meetings.length}</p>
                <p className="text-xs text-muted-foreground">Reuniões</p>
              </div>
              <div>
                <p className="text-lg font-bold">{credentials.length}</p>
                <p className="text-xs text-muted-foreground">Acessos</p>
              </div>
            </div>
          </div>

          {/* Vault */}
          <div className="bg-white border rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Key className="h-4 w-4" />
                Vault de Acessos
              </h3>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setCredentialDialogOpen(true)}
                  title="Adicionar acesso"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 h-7 text-xs"
                  onClick={() => navigate(`/dashboard/clients/${id}`)}
                >
                  Ver todos
                </Button>
              </div>
            </div>
            {credentials.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum acesso salvo</p>
            ) : (
              <div className="space-y-2">
                {credentials.map((cred: any) => (
                  <div
                    key={cred.id}
                    className="flex items-center justify-between bg-slate-50 rounded-lg p-2.5 group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{cred.platform}</p>
                      <p className="text-xs text-muted-foreground truncate">{cred.username || "—"}</p>
                    </div>
                    {cred.password && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(cred.password);
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Left column on desktop */}
        <div className="lg:col-span-3 space-y-4 order-2 lg:order-1">
          {/* Tasks */}
          <div className="bg-white border rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Próximas Tarefas</h3>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setQuickTaskDialogOpen(true)}
                  title="Criar tarefa rápida"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 h-7 text-xs"
                  onClick={() => navigate("/dashboard/tasks")}
                >
                  Ver todas <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma tarefa pendente 🎉</p>
            ) : (
              <div className="space-y-1.5">
                {tasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 bg-slate-50 rounded-lg p-2.5 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {statusLabels[task.status] || task.status}
                        </span>
                        {task.due_date && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(task.due_date), "dd/MM", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge
                      className={`text-[10px] px-1.5 py-0 border ${priorityColors[task.priority] || priorityColors.medium}`}
                    >
                      {task.priority === "high" ? "Alta" : task.priority === "low" ? "Baixa" : "Média"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Meetings */}
          <div className="bg-white border rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Últimas Reuniões</h3>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setMeetingDialogOpen(true)}
                  title="Agendar reunião"
                >
                  <CalendarPlus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 h-7 text-xs"
                  onClick={() => navigate("/dashboard/meetings")}
                >
                  Ver todas <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
            {meetings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma reunião registrada</p>
            ) : (
              <div className="space-y-1.5">
                {meetings.map((meeting: any) => {
                  const statusConf = meetingStatusLabels[meeting.status] || {
                    label: meeting.status,
                    color: "bg-slate-100 text-slate-600",
                  };
                  return (
                    <div
                      key={meeting.id}
                      className="flex items-center gap-3 bg-slate-50 rounded-lg p-2.5"
                    >
                      <Video className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{meeting.title}</p>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(meeting.start_time), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <Badge className={`text-[10px] px-1.5 py-0 ${statusConf.color}`}>
                        {statusConf.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ===== Dialogs ===== */}

      {/* Edit Client */}
      <ClientForm
        open={editFormOpen}
        onOpenChange={setEditFormOpen}
        client={client}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["client-detail", id] });
          queryClient.invalidateQueries({ queryKey: ["client-dashboard", id] });
          setEditFormOpen(false);
        }}
      />

      {/* Meeting with pre-selected client */}
      <MeetingFormDialog
        open={meetingDialogOpen}
        onOpenChange={setMeetingDialogOpen}
        defaultClientIds={id ? [id] : undefined}
      />

      {/* Credential Dialog */}
      <Dialog open={credentialDialogOpen} onOpenChange={setCredentialDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Acesso</DialogTitle>
            <DialogDescription>Adicione uma credencial ao vault de {client.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cred-platform">Plataforma *</Label>
              <Input
                id="cred-platform"
                placeholder="Ex: Instagram, TikTok, Google Ads"
                value={newCred.platform}
                onChange={(e) => setNewCred({ ...newCred, platform: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cred-username">Login / Usuário</Label>
              <Input
                id="cred-username"
                placeholder="email@exemplo.com"
                value={newCred.username}
                onChange={(e) => setNewCred({ ...newCred, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cred-password">Senha</Label>
              <Input
                id="cred-password"
                type="password"
                placeholder="••••••••"
                value={newCred.password}
                onChange={(e) => setNewCred({ ...newCred, password: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCredentialDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCredential} disabled={savingCred}>
              {savingCred ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Task Dialog */}
      <Dialog open={quickTaskDialogOpen} onOpenChange={setQuickTaskDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tarefa Rápida</DialogTitle>
            <DialogDescription>Crie uma tarefa vinculada a {client.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Título *</Label>
              <Input
                id="task-title"
                placeholder="Ex: Criar artes para campanha"
                value={quickTask.title}
                onChange={(e) => setQuickTask({ ...quickTask, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Tarefa</Label>
              <Select
                value={quickTask.task_type}
                onValueChange={(v) => setQuickTask({ ...quickTask, task_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tarefa">Tarefa</SelectItem>
                  <SelectItem value="redes_sociais">Redes Sociais</SelectItem>
                  <SelectItem value="trafego_pago">Tráfego Pago</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="copy">Copy</SelectItem>
                  <SelectItem value="reuniao">Reunião</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data de Entrega</Label>
              <DatePickerDemo
                date={quickTask.due_date}
                onDateChange={(d) => setQuickTask({ ...quickTask, due_date: d })}
                placeholder="Selecione a data"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickTaskDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveQuickTask} disabled={savingTask}>
              {savingTask ? "Criando..." : "Criar Tarefa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
