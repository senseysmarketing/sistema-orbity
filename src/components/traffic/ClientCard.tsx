import { useState } from "react";
import { AlertTriangle, CheckCircle, Edit3, TrendingUp, TrendingDown, Clock, DollarSign, BarChart3, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ClientData {
  id: string;
  ad_account_id: string;
  ad_account_name: string;
  currency: string;
  balance: number;
  min_threshold: number;
  is_prepaid?: boolean;
  active_campaigns_count: number;
  total_daily_budget: number;
  last_7d_spend: number;
  last_campaign_update: string | null;
  results: 'excellent' | 'good' | 'average' | 'bad' | 'terrible' | null;
  observations: string | null;
}

interface ClientCardProps {
  client: ClientData;
  onUpdate: (client: ClientData) => void;
  onRefreshBalance: (accountId: string) => void;
}

export function ClientCard({ client, onUpdate, onRefreshBalance }: ClientCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData>(client);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calcular status do saldo
  const getBalanceStatus = () => {
    if (client.balance <= client.min_threshold * 0.5) {
      return 'critical';
    } else if (client.balance <= client.min_threshold) {
      return 'warning';
    }
    return 'healthy';
  };

  // Calcular dias desde última otimização
  const getDaysSinceOptimization = () => {
    if (!client.last_campaign_update) return null;
    return differenceInDays(new Date(), new Date(client.last_campaign_update));
  };

  const balanceStatus = getBalanceStatus();
  const daysSinceOptimization = getDaysSinceOptimization();
  const needsOptimization = daysSinceOptimization !== null && daysSinceOptimization > 7;

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

  const getBalancePercentage = () => {
    if (client.min_threshold <= 0) return 100;
    return Math.min(100, (client.balance / client.min_threshold) * 100);
  };

  const handleSave = () => {
    onUpdate(editingClient);
    setIsEditDialogOpen(false);
  };

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
              <CardTitle className="text-lg flex items-center gap-2">
                {balanceStatus === 'critical' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                {balanceStatus === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                {balanceStatus === 'healthy' && <CheckCircle className="h-4 w-4 text-green-600" />}
                {client.ad_account_name}
              </CardTitle>
              <CardDescription className="text-xs">
                ID: {client.ad_account_id}
              </CardDescription>
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
          {/* Saldo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Saldo</span>
              </div>
              {getStatusBadge()}
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(client.balance)}
            </div>
            <div className="space-y-1">
              <Progress value={getBalancePercentage()} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Limite: {formatCurrency(client.min_threshold)}</span>
                <span>{getBalancePercentage().toFixed(0)}%</span>
              </div>
            </div>
          </div>

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
              <span className="text-sm text-muted-foreground">Resultados</span>
              {getResultsBadge(client.results)}
            </div>
            {client.observations && (
              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                {client.observations}
              </p>
            )}
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
            <div className="space-y-2">
              <Label htmlFor="min_threshold">Limite para Recarga ({client.currency})</Label>
              <Input
                id="min_threshold"
                type="number"
                value={editingClient.min_threshold}
                onChange={(e) => setEditingClient({ ...editingClient, min_threshold: parseFloat(e.target.value) || 0 })}
              />
            </div>

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
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                value={editingClient.observations || ''}
                onChange={(e) => setEditingClient({ ...editingClient, observations: e.target.value })}
                placeholder="Notas sobre este cliente..."
                rows={3}
              />
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