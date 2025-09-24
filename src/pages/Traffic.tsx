import { useState, useEffect, useMemo } from "react";
import { TrendingUp, DollarSign, Target, AlertCircle, Eye, Edit, Trash2, MoreVertical, Search, Filter, BarChart3, PieChart, Activity, Clock, CheckCircle, AlertTriangle, TrendingDown, Users, Calendar, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { TrafficControlForm } from "@/components/admin/TrafficControlForm";
import { TrafficControlEditForm } from "@/components/admin/TrafficControlEditForm";

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
  const [selectedControl, setSelectedControl] = useState<TrafficControl | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [controlToDelete, setControlToDelete] = useState<string | null>(null);
  
  // Filtros e busca
  const [searchTerm, setSearchTerm] = useState("");
  const [situationFilter, setSituationFilter] = useState<string>("all");
  const [resultsFilter, setResultsFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [budgetFilter, setBudgetFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const { profile } = useAuth();
  const { toast } = useToast();

  // Verifica se o usuário tem permissão para acessar a página
  const hasAccess = profile?.role === 'agency_user' || profile?.role === 'agency_admin';

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

  // Dados filtrados
  const filteredControls = useMemo(() => {
    return trafficControls.filter(control => {
      const client = clients.find(c => c.id === control.client_id);
      const clientName = client?.name || '';
      
      // Filtro de busca
      const matchesSearch = clientName.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtro de situação
      const matchesSituation = situationFilter === 'all' || control.situation === situationFilter;
      
      // Filtro de resultados
      const matchesResults = resultsFilter === 'all' || control.results === resultsFilter;
      
      // Filtro de plataforma
      const matchesPlatform = platformFilter === 'all' || 
        (control.platforms && control.platforms.some(p => p.toLowerCase().includes(platformFilter.toLowerCase())));
      
      // Filtro de budget
      let matchesBudget = true;
      if (budgetFilter !== 'all') {
        const budget = control.daily_budget || 0;
        switch (budgetFilter) {
          case 'low': matchesBudget = budget < 50; break;
          case 'medium': matchesBudget = budget >= 50 && budget < 150; break;
          case 'high': matchesBudget = budget >= 150; break;
        }
      }
      
      return matchesSearch && matchesSituation && matchesResults && matchesPlatform && matchesBudget;
    });
  }, [trafficControls, clients, searchTerm, situationFilter, resultsFilter, platformFilter, budgetFilter]);

  // Análises e métricas
  const analytics = useMemo(() => {
    const totalBudget = filteredControls.reduce((sum, tc) => sum + (tc.daily_budget || 0), 0);
    const monthlyBudget = totalBudget * 30;
    
    const situationStats = {
      stable: filteredControls.filter(tc => tc.situation === 'stable').length,
      improving: filteredControls.filter(tc => tc.situation === 'improving').length,
      worsening: filteredControls.filter(tc => tc.situation === 'worsening').length,
    };
    
    const resultsStats = {
      excellent: filteredControls.filter(tc => tc.results === 'excellent').length,
      good: filteredControls.filter(tc => tc.results === 'good').length,
      average: filteredControls.filter(tc => tc.results === 'average').length,
      bad: filteredControls.filter(tc => tc.results === 'bad').length,
      terrible: filteredControls.filter(tc => tc.results === 'terrible').length,
    };
    
    const platformStats: { [key: string]: number } = {};
    filteredControls.forEach(tc => {
      if (tc.platforms) {
        tc.platforms.forEach(platform => {
          platformStats[platform] = (platformStats[platform] || 0) + 1;
        });
      }
    });
    
    const urgentActions = filteredControls.filter(tc => 
      tc.situation === 'worsening' || tc.results === 'bad' || tc.results === 'terrible'
    ).length;
    
    const optimizationNeeded = filteredControls.filter(tc => {
      if (!tc.last_optimization) return true;
      const lastOpt = new Date(tc.last_optimization + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysSince = Math.floor((today.getTime() - lastOpt.getTime()) / (1000 * 60 * 60 * 24));
      return daysSince > 7;
    }).length;
    
    return {
      totalBudget,
      monthlyBudget,
      situationStats,
      resultsStats,
      platformStats,
      urgentActions,
      optimizationNeeded,
      totalClients: filteredControls.length,
      averageBudget: filteredControls.length > 0 ? totalBudget / filteredControls.length : 0
    };
  }, [filteredControls]);

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Cliente desconhecido';
  };

  const getSituationColor = (situation: string | null) => {
    switch (situation) {
      case 'stable': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'improving': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'worsening': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  // Função para cor de fundo do card baseada na situação
  const getCardBackgroundColor = (situation: string | null) => {
    switch (situation) {
      case 'stable': return 'bg-green-50/50 dark:bg-green-950/20';
      case 'improving': return 'bg-blue-50/50 dark:bg-blue-950/20';
      case 'worsening': return 'bg-red-50/50 dark:bg-red-950/20';
      default: return 'bg-gray-50/50 dark:bg-gray-950/20';
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

  const getPriorityLevel = (control: TrafficControl) => {
    if (control.situation === 'worsening' && (control.results === 'bad' || control.results === 'terrible')) {
      return { level: 'critical', label: 'Crítico', color: 'bg-red-500 text-white' };
    }
    if (control.situation === 'worsening' || control.results === 'bad') {
      return { level: 'high', label: 'Alto', color: 'bg-orange-500 text-white' };
    }
    if (control.results === 'average' || !control.last_optimization) {
      return { level: 'medium', label: 'Médio', color: 'bg-yellow-500 text-white' };
    }
    return { level: 'low', label: 'Baixo', color: 'bg-green-500 text-white' };
  };

  const handleViewDetails = (control: TrafficControl) => {
    setSelectedControl(control);
    setIsDetailsOpen(true);
  };

  const handleEdit = (control: TrafficControl) => {
    setSelectedControl(control);
    setIsEditOpen(true);
  };

  const handleDeleteClick = (controlId: string) => {
    setControlToDelete(controlId);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!controlToDelete) return;

    try {
      const { error } = await supabase
        .from('traffic_controls')
        .delete()
        .eq('id', controlToDelete);

      if (error) throw error;

      toast({
        title: "Controle excluído!",
        description: "O controle de tráfego foi excluído com sucesso.",
      });

      fetchTrafficControls();
      setIsDeleteOpen(false);
      setControlToDelete(null);
    } catch (error: any) {
      toast({
        title: "Erro ao excluir controle",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSituationFilter("all");
    setResultsFilter("all");
    setPlatformFilter("all");
    setBudgetFilter("all");
  };

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acesso Restrito</h3>
            <p className="text-muted-foreground text-center">
              Esta página é acessível para todos os usuários da agência.
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Controle de Tráfego</h1>
          <p className="text-muted-foreground">
            Painel completo para monitoramento e gestão de campanhas
          </p>
        </div>
        <TrafficControlForm onSuccess={fetchTrafficControls} />
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="controls">Controles</TabsTrigger>
          <TabsTrigger value="analytics">Análises</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Estatísticas Principais */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalClients}</div>
                <p className="text-xs text-muted-foreground">
                  campanhas ativas
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Budget Diário</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {analytics.totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">
                  R$ {analytics.monthlyBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} mensais
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ações Urgentes</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{analytics.urgentActions}</div>
                <p className="text-xs text-muted-foreground">
                  precisam atenção imediata
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Precisam Otimização</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{analytics.optimizationNeeded}</div>
                <p className="text-xs text-muted-foreground">
                  +7 dias sem otimização
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos de Performance */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Distribuição por Situação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      Estáveis
                    </span>
                    <span>{analytics.situationStats.stable}</span>
                  </div>
                  <Progress value={(analytics.situationStats.stable / analytics.totalClients) * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      Melhorando
                    </span>
                    <span>{analytics.situationStats.improving}</span>
                  </div>
                  <Progress value={(analytics.situationStats.improving / analytics.totalClients) * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      Piorando
                    </span>
                    <span>{analytics.situationStats.worsening}</span>
                  </div>
                  <Progress value={(analytics.situationStats.worsening / analytics.totalClients) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Top Plataformas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(analytics.platformStats)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([platform, count]) => (
                    <div key={platform} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{platform}</span>
                        <span>{count} campanhas</span>
                      </div>
                      <Progress value={(count / analytics.totalClients) * 100} className="h-2" />
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="controls" className="space-y-6">
          {/* Filtros e Busca */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros e Busca ({filteredControls.length} clientes)
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Limpar Filtros
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setViewMode(viewMode === "cards" ? "table" : "cards")}
                  >
                    {viewMode === "cards" ? "Tabela" : "Cards"}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                
                <Select value={situationFilter} onValueChange={setSituationFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Situação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as situações</SelectItem>
                    <SelectItem value="stable">Estável</SelectItem>
                    <SelectItem value="improving">Melhorando</SelectItem>
                    <SelectItem value="worsening">Piorando</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={resultsFilter} onValueChange={setResultsFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Resultados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os resultados</SelectItem>
                    <SelectItem value="excellent">Excelentes</SelectItem>
                    <SelectItem value="good">Bons</SelectItem>
                    <SelectItem value="average">Médios</SelectItem>
                    <SelectItem value="bad">Ruins</SelectItem>
                    <SelectItem value="terrible">Péssimos</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={budgetFilter} onValueChange={setBudgetFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Budget" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os budgets</SelectItem>
                    <SelectItem value="low">Baixo (&lt; R$ 50)</SelectItem>
                    <SelectItem value="medium">Médio (R$ 50-150)</SelectItem>
                    <SelectItem value="high">Alto (&gt; R$ 150)</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Plataforma..."
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                />

                <Button variant="outline" onClick={clearFilters}>
                  Limpar Filtros
                </Button>
              </div>
              
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {filteredControls.length} de {trafficControls.length} controles
                </p>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'cards' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('cards')}
                  >
                    Cards
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                  >
                    Tabela
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Controles */}
          {viewMode === "cards" ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredControls.map((control) => {
                const priority = getPriorityLevel(control);
                const client = clients.find(c => c.id === control.client_id);
                
                return (
                  <Card 
                    key={control.id} 
                    className={`hover:shadow-lg transition-all duration-200 ${getCardBackgroundColor(control.situation)}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg leading-none">{getClientName(control.client_id)}</CardTitle>
                            <Badge variant="outline" className={`${priority.color} text-xs px-2 py-1`}>
                              {priority.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              <span className="font-medium">R$ {control.daily_budget?.toLocaleString('pt-BR') || '0'}/dia</span>
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background border shadow-md z-50">
                            <DropdownMenuItem onClick={() => handleViewDetails(control)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(control)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(control.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Plataformas */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Plataformas</span>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {control.platforms?.map((platform, index) => (
                            <Badge key={index} variant="secondary" className="text-xs bg-secondary/70">
                              {platform}
                            </Badge>
                          )) || <span className="text-sm text-muted-foreground">Nenhuma plataforma</span>}
                        </div>
                      </div>

                      {/* Status em Grid Compacto */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Situação</span>
                          </div>
                          <Badge variant="outline" className={`w-full justify-center text-xs ${getSituationColor(control.situation)}`}>
                            {getSituationLabel(control.situation)}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Resultados</span>
                          </div>
                          <Badge variant="outline" className={`w-full justify-center text-xs ${getResultsColor(control.results)}`}>
                            {getResultsLabel(control.results)}
                          </Badge>
                        </div>
                      </div>

                      {/* Última Otimização */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Última Otimização</span>
                        </div>
                        <div className="text-sm font-medium">
                          {control.last_optimization 
                            ? (() => {
                                const date = new Date(control.last_optimization + 'T00:00:00');
                                return date.toLocaleDateString('pt-BR');
                              })()
                            : 'Nunca otimizado'
                          }
                        </div>
                      </div>

                      {/* Observações (se houver) */}
                      {control.observations && (
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Observações</span>
                          <p className="text-sm bg-muted/50 rounded p-2 line-clamp-2">{control.observations}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* Visualização em Tabela */
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="p-4 text-left font-medium">Cliente</th>
                        <th className="p-4 text-left font-medium">Plataformas</th>
                        <th className="p-4 text-left font-medium">Budget Diário</th>
                        <th className="p-4 text-left font-medium">Situação</th>
                        <th className="p-4 text-left font-medium">Resultados</th>
                        <th className="p-4 text-left font-medium">Última Otimização</th>
                        <th className="p-4 text-left font-medium">Prioridade</th>
                        <th className="p-4 text-left font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredControls.map((control) => {
                        const priority = getPriorityLevel(control);
                        return (
                          <tr key={control.id} className="border-b hover:bg-muted/25">
                            <td className="p-4 font-medium">{getClientName(control.client_id)}</td>
                            <td className="p-4">
                              <div className="flex gap-1 flex-wrap max-w-xs">
                                {control.platforms?.map((platform, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {platform}
                                  </Badge>
                                )) || <span className="text-muted-foreground">-</span>}
                              </div>
                            </td>
                            <td className="p-4">
                              R$ {control.daily_budget?.toLocaleString('pt-BR') || '0'}
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className={getSituationColor(control.situation)}>
                                {getSituationLabel(control.situation)}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className={getResultsColor(control.results)}>
                                {getResultsLabel(control.results)}
                              </Badge>
                            </td>
                            <td className="p-4">
                              {control.last_optimization 
                                ? (() => {
                                    const date = new Date(control.last_optimization + 'T00:00:00');
                                    return date.toLocaleDateString('pt-BR');
                                  })()
                                : 'Nunca'
                              }
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className={priority.color}>
                                {priority.label}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-background border shadow-md z-50">
                                  <DropdownMenuItem onClick={() => handleViewDetails(control)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Visualizar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEdit(control)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteClick(control.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {filteredControls.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum controle encontrado</h3>
                <p className="text-muted-foreground text-center">
                  {searchTerm || situationFilter !== "all" || resultsFilter !== "all" || platformFilter !== "all" || budgetFilter !== "all"
                    ? "Tente ajustar os filtros ou criar um novo controle."
                    : "Você ainda não possui controles de tráfego. Crie o primeiro!"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performance por Resultados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(analytics.resultsStats).map(([result, count]) => (
                  <div key={result} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{getResultsLabel(result as any)}</span>
                      <span>{count} ({analytics.totalClients > 0 ? Math.round((count / analytics.totalClients) * 100) : 0}%)</span>
                    </div>
                    <Progress value={analytics.totalClients > 0 ? (count / analytics.totalClients) * 100 : 0} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Insights e Recomendações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {analytics.urgentActions > 0 && (
                    <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-700 dark:text-red-300">Ação Urgente Necessária</p>
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {analytics.urgentActions} campanhas precisam de atenção imediata.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {analytics.optimizationNeeded > 0 && (
                    <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <Clock className="h-5 w-5 text-orange-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-orange-700 dark:text-orange-300">Otimização Pendente</p>
                        <p className="text-sm text-orange-600 dark:text-orange-400">
                          {analytics.optimizationNeeded} campanhas não foram otimizadas nos últimos 7 dias.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {analytics.situationStats.stable > analytics.totalClients * 0.7 && (
                    <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-300">Ótima Performance</p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Mais de 70% das campanhas estão estáveis. Continue o bom trabalho!
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Central de Alertas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredControls
                .filter(control => {
                  const priority = getPriorityLevel(control);
                  return priority.level === 'critical' || priority.level === 'high';
                })
                .map(control => {
                  const priority = getPriorityLevel(control);
                  return (
                    <div key={control.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${priority.level === 'critical' ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                        <div>
                          <p className="font-medium">{getClientName(control.client_id)}</p>
                          <p className="text-sm text-muted-foreground">
                            {priority.level === 'critical' ? 'Situação crítica - Ação imediata necessária' : 'Requer atenção'}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => handleViewDetails(control)}>
                        Ver Detalhes
                      </Button>
                    </div>
                  );
                })}
              
              {filteredControls.filter(control => {
                const priority = getPriorityLevel(control);
                return priority.level === 'critical' || priority.level === 'high';
              }).length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum alerta ativo</h3>
                  <p className="text-muted-foreground">
                    Todas as campanhas estão funcionando dentro dos parâmetros normais.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs existentes... */}
      {/* Dialog de Detalhes */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Controle de Tráfego</DialogTitle>
            <DialogDescription>
              Informações completas sobre o controle de tráfego
            </DialogDescription>
          </DialogHeader>
          {selectedControl && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Cliente</label>
                  <p className="text-lg font-semibold">{getClientName(selectedControl.client_id)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Budget Diário</label>
                  <p className="text-lg font-semibold">
                    {selectedControl.daily_budget 
                      ? `R$ ${selectedControl.daily_budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : 'Não definido'}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Situação</label>
                  <div className="mt-1">
                    <Badge className={getSituationColor(selectedControl.situation)}>
                      {getSituationLabel(selectedControl.situation)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Resultados</label>
                  <div className="mt-1">
                    <Badge className={getResultsColor(selectedControl.results)}>
                      {getResultsLabel(selectedControl.results)}
                    </Badge>
                  </div>
                </div>
              </div>

              {selectedControl.platforms && selectedControl.platforms.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Plataformas</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedControl.platforms.map((platform, index) => (
                      <Badge key={index} variant="outline">
                        {platform}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedControl.last_optimization && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Última Otimização</label>
                  <p className="text-sm">{(() => {
                    const date = new Date(selectedControl.last_optimization + 'T00:00:00');
                    return date.toLocaleDateString('pt-BR');
                  })()}</p>
                </div>
              )}

              {selectedControl.observations && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Observações</label>
                  <p className="text-sm mt-1">{selectedControl.observations}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  <label className="font-medium">Criado em</label>
                  <p>{new Date(selectedControl.created_at).toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <label className="font-medium">Atualizado em</label>
                  <p>{new Date(selectedControl.updated_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Controle de Tráfego</DialogTitle>
            <DialogDescription>
              Edite as informações do controle de tráfego
            </DialogDescription>
          </DialogHeader>
          {selectedControl && (
            <TrafficControlEditForm
              control={selectedControl}
              onSuccess={() => {
                setIsEditOpen(false);
                setSelectedControl(null);
                fetchTrafficControls();
              }}
              onCancel={() => {
                setIsEditOpen(false);
                setSelectedControl(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este controle de tráfego? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteOpen(false);
              setControlToDelete(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}