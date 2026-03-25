import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Wallet,
  CreditCard,
  BarChart3,
  TrendingUp,
  DollarSign,
  Clock,
  Calendar,
  Activity,
  CheckCircle,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useAuth } from "@/hooks/useAuth";
import { differenceInDays } from "date-fns";
import { ClientData, ClientResponsibleOption } from "./ClientCard";
import { OptimizationSheet } from "./OptimizationSheet";
import { cn } from "@/lib/utils";

type TrafficControlComment = {
  id: string;
  comment: string;
  created_at: string;
  author_user_id: string;
  profiles?: { name: string | null } | null;
};

interface ClientDetailSheetProps {
  client: ClientData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyMembers: ClientResponsibleOption[];
  onUpdate: (client: ClientData) => void;
}

export function ClientDetailSheet({
  client,
  open,
  onOpenChange,
  agencyMembers,
  onUpdate,
}: ClientDetailSheetProps) {
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [comments, setComments] = useState<TrafficControlComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [isOptimizationOpen, setIsOptimizationOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const { currentAgency } = useAgency();
  const { user } = useAuth();

  useEffect(() => {
    if (open && client) {
      setEditingClient({ ...client });
      setHasChanges(false);
      setNewComment("");
      loadComments(client.ad_account_id);
    }
  }, [open, client]);

  const isPrepaid = client?.is_prepaid === true;

  const balanceStatus = useMemo(() => {
    if (!client) return "healthy";
    if (isPrepaid) {
      if (client.min_threshold <= 0) return "healthy";
      if (client.balance < client.min_threshold) return "critical";
      if (client.balance < client.min_threshold * 3) return "warning";
      return "healthy";
    }
    const spendCap = client.spend_cap || 0;
    const amountSpent = client.amount_spent || 0;
    if (spendCap <= 0) return "healthy";
    const percentUsed = (amountSpent / spendCap) * 100;
    if (percentUsed >= 90) return "critical";
    if (percentUsed >= 70) return "warning";
    return "healthy";
  }, [client, isPrepaid]);

  const daysSinceOptimization = useMemo(() => {
    if (!client?.last_campaign_update) return null;
    return differenceInDays(new Date(), new Date(client.last_campaign_update));
  }, [client?.last_campaign_update]);

  const needsOptimization = daysSinceOptimization !== null && daysSinceOptimization > 7;

  const estimatedDays = useMemo(() => {
    if (!client || !isPrepaid || client.last_7d_spend <= 0) return null;
    const avg = client.last_7d_spend / 7;
    if (avg <= 0) return null;
    return Math.floor(client.balance / avg);
  }, [client, isPrepaid]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: client?.currency === "USD" ? "USD" : "BRL",
    }).format(value);

  const loadComments = async (adAccountId: string) => {
    if (!currentAgency?.id) return;
    setCommentsLoading(true);
    try {
      const { data, error } = await supabase
        .from("traffic_control_comments" as any)
        .select(
          "id, comment, created_at, author_user_id, profiles:profiles!traffic_control_comments_author_user_id_fkey(name)"
        )
        .eq("agency_id", currentAgency.id)
        .eq("ad_account_id", adAccountId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComments(((data as any) || []) as TrafficControlComment[]);
    } catch (e) {
      console.error("Erro ao carregar comentários:", e);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!currentAgency?.id || !user?.id || !client) return;
    const trimmed = newComment.trim();
    if (!trimmed) return;

    setPostingComment(true);
    try {
      const { error } = await supabase
        .from("traffic_control_comments" as any)
        .insert({
          agency_id: currentAgency.id,
          ad_account_id: client.ad_account_id,
          author_user_id: user.id,
          comment: trimmed,
        } as any);

      if (error) throw error;
      setNewComment("");
      await loadComments(client.ad_account_id);
    } catch (e) {
      console.error("Erro ao adicionar comentário:", e);
    } finally {
      setPostingComment(false);
    }
  };

  const handleSave = () => {
    if (!editingClient) return;
    onUpdate(editingClient);
    setHasChanges(false);
  };

  const updateField = <K extends keyof ClientData>(key: K, value: ClientData[K]) => {
    if (!editingClient) return;
    setEditingClient({ ...editingClient, [key]: value });
    setHasChanges(true);
  };

  const getStatusBadge = () => {
    switch (balanceStatus) {
      case "healthy":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Saudável</Badge>;
      case "warning":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Atenção</Badge>;
      case "critical":
        return <Badge variant="destructive">Crítico</Badge>;
    }
  };

  const getResultsBadge = (results: string | null) => {
    switch (results) {
      case "excellent":
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">Excelentes</Badge>;
      case "good":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Bons</Badge>;
      case "average":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Médios</Badge>;
      case "bad":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Ruins</Badge>;
      case "terrible":
        return <Badge className="bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100">Péssimos</Badge>;
      default:
        return <Badge variant="outline">Não definido</Badge>;
    }
  };

  if (!client) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="sm:max-w-[550px] w-full flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge()}
              {getResultsBadge(client.results)}
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {isPrepaid ? (
                  <><Wallet className="h-3 w-3 mr-0.5" />Pré-paga</>
                ) : (
                  <><CreditCard className="h-3 w-3 mr-0.5" />Pós-paga</>
                )}
              </Badge>
            </div>
            <SheetTitle className="text-lg">{client.ad_account_name}</SheetTitle>
            <SheetDescription className="text-xs">ID: {client.ad_account_id}</SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 px-6">
            <div className="space-y-6 pb-6">
              {/* Financial Section */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Financeiro
                </h3>

                {isPrepaid ? (
                  <div className="space-y-3">
                    <div className="text-3xl font-bold text-green-600">
                      {formatCurrency(client.balance)}
                    </div>

                    {client.spend_cap && client.spend_cap > 0 && (
                      <div className="grid grid-cols-3 gap-2 text-center text-xs border rounded-lg p-3">
                        <div>
                          <p className="text-muted-foreground">Depositado</p>
                          <p className="font-semibold">{formatCurrency(client.spend_cap)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Gasto</p>
                          <p className="font-semibold text-orange-600">
                            {formatCurrency(client.amount_spent || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Disponível</p>
                          <p className="font-semibold text-green-600">
                            {formatCurrency(client.balance)}
                          </p>
                        </div>
                      </div>
                    )}

                    {balanceStatus === "critical" && (
                      <div className="flex items-center gap-2 p-2 rounded-md bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-xs">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <span>Saldo abaixo do mínimo de {formatCurrency(client.min_threshold)}</span>
                      </div>
                    )}

                    {estimatedDays !== null && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span
                          className={cn(
                            "font-medium",
                            estimatedDays <= 3
                              ? "text-red-600"
                              : estimatedDays <= 7
                              ? "text-yellow-600"
                              : "text-green-600"
                          )}
                        >
                          ~{estimatedDays} dias restantes
                        </span>
                        <span className="text-muted-foreground text-xs">(estimativa)</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-3xl font-bold text-orange-600">
                      {formatCurrency(client.current_month_spend || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total gasto em campanhas neste mês
                    </p>
                  </div>
                )}
              </section>

              <Separator />

              {/* Metrics Section */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Métricas
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-2 rounded-lg border">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Campanhas</p>
                      <p className="text-sm font-semibold">{client.active_campaigns_count}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg border">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Orçamento Diário</p>
                      <p className="text-sm font-semibold">{formatCurrency(client.total_daily_budget)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg border">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Gasto (7 dias)</p>
                      <p className="text-sm font-semibold">{formatCurrency(client.last_7d_spend)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg border">
                    <Clock className={cn("h-4 w-4", needsOptimization ? "text-orange-600" : "text-muted-foreground")} />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Última Otimização</p>
                      <p className={cn("text-sm font-semibold", needsOptimization && "text-orange-600")}>
                        {daysSinceOptimization !== null ? `${daysSinceOptimization} dias` : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {needsOptimization && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 text-xs">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>Sem otimização há {daysSinceOptimization} dias — Revisar campanhas!</span>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setIsOptimizationOpen(true)}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Abrir Diário de Otimizações
                </Button>
              </section>

              <Separator />

              {/* Config Section */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" /> Configuração
                </h3>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Classificação de Resultados</Label>
                    <Select
                      value={editingClient?.results || ""}
                      onValueChange={(v) => updateField("results", v as ClientData["results"])}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent">Excelentes</SelectItem>
                        <SelectItem value="good">Bons</SelectItem>
                        <SelectItem value="average">Médios</SelectItem>
                        <SelectItem value="bad">Ruins</SelectItem>
                        <SelectItem value="terrible">Péssimos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Gestor Responsável</Label>
                    <Select
                      value={editingClient?.responsible_user_id || "unassigned"}
                      onValueChange={(v) =>
                        updateField("responsible_user_id", v === "unassigned" ? null : v)
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Sem gestor</SelectItem>
                        {agencyMembers.map((m) => (
                          <SelectItem key={m.user_id} value={m.user_id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {isPrepaid && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Saldo Mínimo para Alerta</Label>
                      <Input
                        type="number"
                        className="h-9"
                        value={editingClient?.min_threshold || 0}
                        onChange={(e) =>
                          updateField("min_threshold", parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                  )}
                </div>

                {hasChanges && (
                  <Button onClick={handleSave} className="w-full" size="sm">
                    Salvar Alterações
                  </Button>
                )}
              </section>

              <Separator />

              {/* Comments Section */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Comentários ({comments.length})
                </h3>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {commentsLoading ? (
                    <p className="text-xs text-muted-foreground">Carregando...</p>
                  ) : comments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum comentário ainda.</p>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="rounded-md border bg-muted/30 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium">{c.profiles?.name || "Usuário"}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(c.created_at).toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{c.comment}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Adicionar comentário..."
                    rows={2}
                    className="text-sm"
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={postingComment || !newComment.trim()}
                    size="sm"
                    className="w-full"
                  >
                    {postingComment ? "Adicionando..." : "Adicionar Comentário"}
                  </Button>
                </div>
              </section>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {client && (
        <OptimizationSheet
          isOpen={isOptimizationOpen}
          onClose={() => setIsOptimizationOpen(false)}
          clientName={client.ad_account_name}
          adAccountId={client.ad_account_id}
        />
      )}
    </>
  );
}
