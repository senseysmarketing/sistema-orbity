import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, Target, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { TrafficControlForm } from "@/components/admin/TrafficControlForm";

interface TrafficControl {
  id: string;
  client_id: string;
  platforms: string[] | null;
  daily_budget: number | null;
  situation: 'stable' | 'improving' | 'worsening' | null;
  results: 'excellent' | 'good' | 'average' | 'bad' | 'terrible' | null;
  last_optimization: string | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
}

interface Client {
  id: string;
  name: string;
  monthly_value: number | null;
  active: boolean;
}

export default function Traffic() {
  const [trafficControls, setTrafficControls] = useState<TrafficControl[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  // Verifica se o usuário tem permissão para acessar a página
  const hasAccess = profile?.role === 'gestor_trafego' || profile?.role === 'administrador';

  useEffect(() => {
    if (hasAccess) {
      fetchTrafficControls();
      fetchClients();
    } else {
      setLoading(false);
    }
  }, [hasAccess]);

  const fetchTrafficControls = async () => {
    try {
      const { data, error } = await supabase
        .from('traffic_controls')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setTrafficControls(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar controles de tráfego",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, monthly_value, active')
        .eq('active', true);

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Cliente desconhecido';
  };

  const getClientBudget = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.monthly_value || 0;
  };

  const getSituationColor = (situation: string | null) => {
    switch (situation) {
      case 'stable': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'improving': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'worsening': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getResultsColor = (results: string | null) => {
    switch (results) {
      case 'excellent': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
      case 'good': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'average': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'bad': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'terrible': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getSituationLabel = (situation: string | null) => {
    switch (situation) {
      case 'stable': return 'Estável';
      case 'improving': return 'Melhorando';
      case 'worsening': return 'Piorando';
      default: return 'Indefinido';
    }
  };

  const getResultsLabel = (results: string | null) => {
    switch (results) {
      case 'excellent': return 'Excelentes';
      case 'good': return 'Bons';
      case 'average': return 'Médios';
      case 'bad': return 'Ruins';
      case 'terrible': return 'Péssimos';
      default: return 'Sem dados';
    }
  };

  // Estatísticas
  const stableClients = trafficControls.filter(tc => tc.situation === 'stable').length;
  const needsAttention = trafficControls.filter(tc => tc.situation === 'worsening').length;
  const totalBudget = trafficControls.reduce((sum, tc) => sum + (tc.daily_budget || 0), 0);

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acesso Restrito</h3>
            <p className="text-muted-foreground text-center">
              Esta página é restrita apenas para gestores de tráfego e administradores.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold tracking-tight">Controle de Tráfego</h1>
          <p className="text-muted-foreground">
            Monitore e gerencie as campanhas de tráfego dos clientes
          </p>
        </div>
        <TrafficControlForm onSuccess={fetchTrafficControls} />
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campanhas Estáveis</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stableClients}</div>
            <p className="text-xs text-muted-foreground">
              campanhas estáveis
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Precisam Atenção</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{needsAttention}</div>
            <p className="text-xs text-muted-foreground">
              campanhas piorando
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Diário Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              investimento diário
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Controles */}
      <div className="grid gap-4">
        {trafficControls.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum controle de tráfego encontrado</h3>
              <p className="text-muted-foreground text-center">
                Comece criando o primeiro controle de tráfego para seus clientes.
              </p>
            </CardContent>
          </Card>
        ) : (
          trafficControls.map((control) => (
            <Card key={control.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{getClientName(control.client_id)}</CardTitle>
                    <CardDescription>
                      Valor mensal: R$ {getClientBudget(control.client_id).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getSituationColor(control.situation)}>
                      {getSituationLabel(control.situation)}
                    </Badge>
                    <Badge className={getResultsColor(control.results)}>
                      {getResultsLabel(control.results)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Plataformas</h4>
                      <div className="flex flex-wrap gap-1">
                        {control.platforms && control.platforms.length > 0 ? (
                          control.platforms.map((platform, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {platform}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Não definidas</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Budget Diário</h4>
                      <p className="text-sm">
                        {control.daily_budget 
                          ? `R$ ${control.daily_budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : 'Não definido'}
                      </p>
                    </div>
                  </div>
                  
                  {control.last_optimization && (
                    <div>
                      <h4 className="font-medium mb-2">Última Otimização</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(control.last_optimization).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}
                  
                  {control.observations && (
                    <div>
                      <h4 className="font-medium mb-2">Observações</h4>
                      <p className="text-sm text-muted-foreground">{control.observations}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}