import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, Edit3, TrendingUp, Clock, DollarSign, BarChart3, RefreshCw, CreditCard, Calendar, Wallet, Activity } from "lucide-react";
import { OptimizationSheet } from "./OptimizationSheet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useAuth } from "@/hooks/useAuth";
import { differenceInDays } from "date-fns";

export interface ClientData {
  id: string;
  ad_account_id: string;
  ad_account_name: string;
  currency: string;
  balance: number;
  min_threshold: number;
  is_prepaid?: boolean;
  spend_cap?: number;
  amount_spent?: number;
  current_month_spend?: number;
  active_campaigns_count: number;
  total_daily_budget: number;
  last_7d_spend: number;
  last_campaign_update: string | null;
  results: 'excellent' | 'good' | 'average' | 'bad' | 'terrible' | null;
  observations: string | null;
  responsible_user_id?: string | null;
}

export type ClientResponsibleOption = { user_id: string; name: string };

interface ClientCardProps {
  client: ClientData;
  agencyMembers: ClientResponsibleOption[];
  onUpdate: (client: ClientData) => void;
  onRefreshBalance: (accountId: string) => void;
}

type TrafficControlComment = {
  id: string;
  comment: string;
  created_at: string;
  author_user_id: string;
  profiles?: { name: string | null } | null;
};

export function ClientCard({ client, agencyMembers, onUpdate, onRefreshBalance }: ClientCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData>(client);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { currentAgency } = useAgency();
  const { user } = useAuth();

  const [comments, setComments] = useState<TrafficControlComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const responsibleLabel = useMemo(() => {
    if (!client.responsible_user_id) return null;
    return agencyMembers.find((m) => m.user_id === client.responsible_user_id)?.name || null;
  }, [agencyMembers, client.responsible_user_id]);

  // IMPORTANTE: Agora usamos o valor retornado pela API, não assumimos mais padrão
  const isPrepaid = client.is_prepaid === true;

  // Lógica de status para contas PRÉ-PAGAS
  const getPrepaidBalanceStatus = () => {
    if (client.min_threshold <= 0) return 'healthy';
    if (client.balance < client.min_threshold) return 'critical';
    if (client.balance < client.min_threshold * 3) return 'warning';
    return 'healthy';
  };

  // Lógica de status para contas PÓS-PAGAS
  const getPostpaidBalanceStatus = () => {
    const spendCap = client.spend_cap || 0;
    const amountSpent = client.amount_spent || 0;
    if (spendCap <= 0) return 'healthy';
    const percentUsed = (amountSpent / spendCap) * 100;
    if (percentUsed >= 90) return 'critical';
    if (percentUsed >= 70) return 'warning';
    return 'healthy';
  };

  const getBalanceStatus = () => isPrepaid ? getPrepaidBalanceStatus() : getPostpaidBalanceStatus();

  // Calcular dias desde última otimização
  const getDaysSinceOptimization = () => {
    if (!client.last_campaign_update) return null;
    return differenceInDays(new Date(), new Date(client.last_campaign_update));
  };

  // Calcular dias restantes de saldo (para pré-pagas)
  const getEstimatedDaysRemaining = () => {
    if (!isPrepaid || client.last_7d_spend <= 0) return null;
    const avgDailySpend = client.last_7d_spend / 7;
    if (avgDailySpend <= 0) return null;
    return Math.floor(client.balance / avgDailySpend);
  };

  const balanceStatus = getBalanceStatus();
  const daysSinceOptimization = getDaysSinceOptimization();
  const needsOptimization = daysSinceOptimization !== null && daysSinceOptimization > 7;
  const estimatedDays = getEstimatedDaysRemaining();

  const getStatusBadge = () => {
    switch (balanceStatus) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Saudável</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Atenção</Badge>;
      case 'critical':
        return <Badge variant="destructive">Crítico</Badge>;
    }
  };

  const getResultsBadge = (results: string | null) => {
    switch (results) {
      case 'excellent':
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">Excelentes</Badge>;
      case 'good':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Bons</Badge>;
      case 'average':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Médios</Badge>;
      case 'bad':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Ruins</Badge>;
      case 'terrible':
        return <Badge className="bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100">Péssimos</Badge>;
      default:
        return <Badge variant="outline">Não definido</Badge>;
    }
  };

  const getCardBackgroundColor = () => {
    if (balanceStatus === 'critical') {
      return 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800';
    }
    if (balanceStatus === 'warning') {
      return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800';
    }
    if (needsOptimization) {
      return 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800';
    }
    return 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: client.currency === 'USD' ? 'USD' : 'BRL',
    }).format(value);
  };


  const handleSave = () => {
    onUpdate(editingClient);
    setIsEditDialogOpen(false);
  };

  const loadComments = async () => {
    if (!currentAgency?.id) return;
    setCommentsLoading(true);
    try {
      const { data, error } = await supabase
        // NOTE: types.ts may lag behind migrations; cast to any to avoid TS errors.
        .from("traffic_control_comments" as any)
        .select("id, comment, created_at, author_user_id, profiles:profiles!traffic_control_comments_author_user_id_fkey(name)")
        .eq("agency_id", currentAgency.id)
        .eq("ad_account_id", client.ad_account_id)
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
    if (!currentAgency?.id || !user?.id) return;
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
      await loadComments();
    } catch (e) {
      console.error("Erro ao adicionar comentário:", e);
    } finally {
      setPostingComment(false);
    }
  };

  useEffect(() => {
    if (!isEditDialogOpen) return;
    setEditingClient(client);
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditDialogOpen]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshBalance(client.ad_account_id);
    setIsRefreshing(false);
  };

  return (
    <>
      <Card className={`relative transition-all hover:shadow-md ${getCardBackgroundColor()}`}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {balanceStatus === 'critical' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                {balanceStatus === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                {balanceStatus === 'healthy' && <CheckCircle className="h-4 w-4 text-green-600" />}
                <CardTitle className="text-lg">{client.ad_account_name}</CardTitle>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CardDescription className="text-xs">ID: {client.ad_account_id}</CardDescription>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {isPrepaid ? (
                      <><Wallet className="h-3 w-3 mr-1" />Pré-paga</>
                    ) : (
                      <><CreditCard className="h-3 w-3 mr-1" />Pós-paga</>
                    )}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {/* Resultados mais visíveis */}
                  {getResultsBadge(client.results)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {responsibleLabel ? (
                  <p className="text-xs text-muted-foreground">Gestor: <span className="font-medium text-foreground">{responsibleLabel}</span></p>
                ) : (
                  <p className="text-xs text-muted-foreground">Gestor: <span className="font-medium text-foreground">Sem gestor</span></p>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 w-8"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditingClient(client);
                  setIsEditDialogOpen(true);
                }}
                className="h-8 w-8"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Seção de Saldo - DIFERENTE para cada tipo de conta */}
          {isPrepaid ? (
            // === CONTA PRÉ-PAGA ===
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Saldo Disponível</span>
                </div>
                {getStatusBadge()}
              </div>
              
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(client.balance)}
              </div>
              
              {/* Mostrar detalhes de depósito/gasto para pré-pagas */}
              {client.spend_cap && client.spend_cap > 0 && (
                <div className="grid grid-cols-3 gap-2 text-center text-xs border-t pt-2">
                  <div>
                    <p className="text-muted-foreground">Depositado</p>
                    <p className="font-semibold">{formatCurrency(client.spend_cap)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Gasto</p>
                    <p className="font-semibold text-orange-600">{formatCurrency(client.amount_spent || 0)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Disponível</p>
                    <p className="font-semibold text-green-600">{formatCurrency(client.balance)}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Alertar abaixo de:</span>
                  <span className="font-medium text-foreground">{formatCurrency(client.min_threshold)}</span>
                </div>
              </div>
              
              {estimatedDays !== null && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className={`font-medium ${estimatedDays <= 3 ? 'text-red-600' : estimatedDays <= 7 ? 'text-yellow-600' : 'text-green-600'}`}>
                    ~{estimatedDays} dias restantes
                  </span>
                  <span className="text-muted-foreground text-xs">(estimativa)</span>
                </div>
              )}
            </div>
          ) : (
            // === CONTA PÓS-PAGA (SIMPLIFICADO) ===
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Gasto do Mês</span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </Badge>
              </div>
              
              <div className="text-3xl font-bold text-orange-600">
                {formatCurrency(client.current_month_spend || 0)}
              </div>
              
              <p className="text-xs text-muted-foreground">
                Total gasto em campanhas desde o dia 1º deste mês
              </p>
            </div>
          )}

          {/* Métricas automáticas */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">Campanhas Ativas</p>
                <p className="font-semibold">{client.active_campaigns_count}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">Orçamento Diário</p>
                <p className="font-semibold">{formatCurrency(client.total_daily_budget)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">Gasto (7 dias)</p>
                <p className="font-semibold">{formatCurrency(client.last_7d_spend)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className={`h-4 w-4 ${needsOptimization ? 'text-orange-600' : 'text-muted-foreground'}`} />
              <div>
                <p className="text-muted-foreground text-xs">Última Otimização</p>
                <p className={`font-semibold ${needsOptimization ? 'text-orange-600' : ''}`}>
                  {daysSinceOptimization !== null 
                    ? `${daysSinceOptimization} dias atrás`
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Alerta de otimização */}
          {needsOptimization && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 text-xs">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>Última alteração há {daysSinceOptimization} dias - Revisar campanhas!</span>
            </div>
          )}

          {/* Resultados e Observações */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Comentários</span>
              <Badge variant="outline">{comments.length}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Atualize as informações do cliente {client.ad_account_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isPrepaid && (
              <div className="space-y-2">
                <Label htmlFor="min_threshold">Saldo Mínimo para Alerta ({client.currency})</Label>
                <Input
                  id="min_threshold"
                  type="number"
                  value={editingClient.min_threshold}
                  onChange={(e) => setEditingClient({ ...editingClient, min_threshold: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  Você será alertado quando o saldo estiver abaixo deste valor.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="results">Classificação de Resultados</Label>
              <Select
                value={editingClient.results || ''}
                onValueChange={(value) => setEditingClient({ ...editingClient, results: value as ClientData['results'] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar resultados" />
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

            <div className="space-y-2">
              <Label>Gestor responsável</Label>
              <Select
                value={editingClient.responsible_user_id || "unassigned"}
                onValueChange={(value) =>
                  setEditingClient({
                    ...editingClient,
                    responsible_user_id: value === "unassigned" ? null : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar gestor" />
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

            <div className="space-y-2">
              <Label>Comentários</Label>
              <ScrollArea className="h-48 rounded-md border bg-muted/30 p-2">
                <div className="space-y-2">
                  {commentsLoading ? (
                    <p className="text-xs text-muted-foreground">Carregando comentários...</p>
                  ) : comments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum comentário ainda.</p>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="rounded-md bg-background p-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium">
                            {c.profiles?.name || "Usuário"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(c.created_at).toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{c.comment}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Adicionar comentário..."
                rows={2}
              />

              <div className="flex justify-end">
                <Button onClick={handleAddComment} disabled={postingComment || !newComment.trim()}>
                  {postingComment ? "Adicionando..." : "Adicionar"}
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}