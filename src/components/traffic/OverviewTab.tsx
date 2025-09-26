import { useState, useEffect } from "react";
import { Calendar, AlertTriangle, TrendingUp, TrendingDown, Minus, DollarSign, Edit3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SelectedAdAccount {
  id: string;
  ad_account_id: string;
  ad_account_name: string;
  currency: string;
  is_active: boolean;
  last_sync: string | null;
}

interface ClientOverview {
  ad_account_id: string;
  ad_account_name: string;
  currency: string;
  daily_budget: number | null;
  last_optimization: string | null;
  results: 'good' | 'average' | 'bad' | 'excellent' | 'terrible' | null;
  client_notes: string | null;
  daily_spend: number | null;
}

interface OverviewTabProps {
  selectedAdAccounts: SelectedAdAccount[];
}

export function OverviewTab({ selectedAdAccounts }: OverviewTabProps) {
  const [clientsOverview, setClientsOverview] = useState<ClientOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClient, setEditingClient] = useState<ClientOverview | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchClientsOverview();
  }, [selectedAdAccounts]);

  const fetchClientsOverview = async () => {
    try {
      setLoading(true);
      
      // Buscar dados dos clientes ou criar registros padrão baseados nas contas selecionadas
      const overviewData: ClientOverview[] = [];
      
      for (const account of selectedAdAccounts) {
        // Tentar buscar dados existentes de client overview
        const { data: existingData } = await supabase
          .from('traffic_controls')
          .select('*')
          .eq('client_id', account.id)
          .single();

        // Buscar métricas recentes para gasto diário
        const { data: metricsData } = await supabase
          .from('ad_account_metrics')
          .select('spend, date_start')
          .eq('ad_account_id', account.ad_account_id)
          .order('date_start', { ascending: false })
          .limit(1)
          .single();

        const clientOverview: ClientOverview = {
          ad_account_id: account.ad_account_id,
          ad_account_name: account.ad_account_name,
          currency: account.currency,
          daily_budget: existingData?.daily_budget || null,
          last_optimization: existingData?.last_optimization || null,
          results: existingData?.results || null,
          client_notes: existingData?.observations || null,
          daily_spend: metricsData?.spend || null,
        };

        overviewData.push(clientOverview);
      }

      setClientsOverview(overviewData);
    } catch (error) {
      console.error('Erro ao carregar overview dos clientes:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados dos clientes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClient = (client: ClientOverview) => {
    setEditingClient({ ...client });
    setIsEditDialogOpen(true);
  };

  const handleSaveClient = async () => {
    if (!editingClient) return;

    try {
      // Buscar se já existe um registro para esta conta
      const { data: existingRecord } = await supabase
        .from('traffic_controls')
        .select('id')
        .eq('client_id', editingClient.ad_account_id)
        .single();

      const updateData = {
        daily_budget: editingClient.daily_budget,
        last_optimization: editingClient.last_optimization,
        results: editingClient.results,
        observations: editingClient.client_notes,
      };

      if (existingRecord) {
        // Atualizar registro existente
        const { error } = await supabase
          .from('traffic_controls')
          .update(updateData)
          .eq('id', existingRecord.id);

        if (error) throw error;
      } else {
        // Criar novo registro
        const { error } = await supabase
          .from('traffic_controls')
          .insert({
            ...updateData,
            client_id: editingClient.ad_account_id,
            platforms: ['facebook'],
          });

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: "Dados do cliente atualizados com sucesso.",
      });

      setIsEditDialogOpen(false);
      setEditingClient(null);
      fetchClientsOverview();
    } catch (error) {
      console.error('Erro ao salvar dados do cliente:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar os dados do cliente.",
        variant: "destructive",
      });
    }
  };

  const getResultsBadge = (results: string | null) => {
    switch (results) {
      case 'excellent':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Excelentes</Badge>;
      case 'good':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Bons</Badge>;
      case 'average':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Médios</Badge>;
      case 'bad':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Ruins</Badge>;
      case 'terrible':
        return <Badge className="bg-red-200 text-red-900 border-red-300">Péssimos</Badge>;
      default:
        return <Badge variant="outline">Não definido</Badge>;
    }
  };

  const getOptimizationWarning = (lastOptimization: string | null) => {
    if (!lastOptimization) return null;
    
    const daysSince = differenceInDays(new Date(), new Date(lastOptimization));
    if (daysSince > 7) {
      return (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Atenção:</strong> Última otimização há {daysSince} dias
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };

  const formatCurrency = (value: number | null, currency: string) => {
    if (value === null) return 'N/A';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Overview dos Clientes</h2>
          <p className="text-muted-foreground">
            Visão geral das contas de anúncios e performance dos clientes
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clientsOverview.map((client) => (
          <Card key={client.ad_account_id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{client.ad_account_name}</CardTitle>
                  <CardDescription className="text-sm">
                    ID: {client.ad_account_id}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditClient(client)}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Orçamento Diário */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Orçamento Diário</span>
                </div>
                <span className="text-sm">
                  {formatCurrency(client.daily_budget, client.currency)}
                </span>
              </div>

              {/* Gasto Diário */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Gasto Diário</span>
                </div>
                <span className="text-sm">
                  {formatCurrency(client.daily_spend, client.currency)}
                </span>
              </div>

              {/* Última Otimização */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Última Otimização</span>
                  </div>
                  <span className="text-sm">
                    {client.last_optimization 
                      ? format(new Date(client.last_optimization), 'dd/MM/yyyy', { locale: ptBR })
                      : 'Não registrada'
                    }
                  </span>
                </div>
                {getOptimizationWarning(client.last_optimization)}
              </div>

              {/* Resultados */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Resultados</span>
                {getResultsBadge(client.results)}
              </div>

              {/* Observações */}
              {client.client_notes && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    <strong>Observações:</strong> {client.client_notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Atualize as informações do cliente {editingClient?.ad_account_name}
            </DialogDescription>
          </DialogHeader>

          {editingClient && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="daily_budget">Orçamento Diário ({editingClient.currency})</Label>
                <Input
                  id="daily_budget"
                  type="number"
                  step="0.01"
                  value={editingClient.daily_budget || ''}
                  onChange={(e) => setEditingClient({
                    ...editingClient,
                    daily_budget: e.target.value ? parseFloat(e.target.value) : null
                  })}
                  placeholder="Ex: 100.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_optimization">Data da Última Otimização</Label>
                <Input
                  id="last_optimization"
                  type="date"
                  value={editingClient.last_optimization || ''}
                  onChange={(e) => setEditingClient({
                    ...editingClient,
                    last_optimization: e.target.value || null
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="results">Resultados</Label>
                <Select
                  value={editingClient.results || ''}
                  onValueChange={(value) => setEditingClient({
                    ...editingClient,
                    results: value as 'good' | 'average' | 'bad' | 'excellent' | 'terrible' | null
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione os resultados" />
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
                <Label htmlFor="client_notes">Observações</Label>
                <Textarea
                  id="client_notes"
                  value={editingClient.client_notes || ''}
                  onChange={(e) => setEditingClient({
                    ...editingClient,
                    client_notes: e.target.value || null
                  })}
                  placeholder="Adicione observações sobre o cliente..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveClient}>
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}