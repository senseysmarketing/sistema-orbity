import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, Target, AlertCircle, Eye, Edit, Trash2, MoreVertical } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [selectedControl, setSelectedControl] = useState<TrafficControl | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [controlToDelete, setControlToDelete] = useState<string | null>(null);
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

  const handleViewDetails = (control: TrafficControl) => {
    console.log('Visualizando detalhes do controle:', control.id);
    setSelectedControl(control);
    setIsDetailsOpen(true);
  };

  const handleEdit = (control: TrafficControl) => {
    console.log('Editando controle:', control.id);
    setSelectedControl(control);
    setIsEditOpen(true);
  };

  const handleDeleteClick = (controlId: string) => {
    console.log('Iniciando exclusão do controle:', controlId);
    setControlToDelete(controlId);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!controlToDelete) return;

    try {
      console.log('Excluindo controle:', controlToDelete);
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
      console.error('Erro ao excluir:', error);
      toast({
        title: "Erro ao excluir controle",
        description: error.message,
        variant: "destructive",
      });
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
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header com nome do cliente, badges e menu de ações */}
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">{getClientName(control.client_id)}</h3>
                      <div className="flex gap-2">
                        <Badge className={getSituationColor(control.situation)}>
                          {getSituationLabel(control.situation)}
                        </Badge>
                        <Badge className={getResultsColor(control.results)}>
                          {getResultsLabel(control.results)}
                        </Badge>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleViewDetails(control)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Visualizar detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(control)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive" 
                          onClick={() => handleDeleteClick(control.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Informações em linha única */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">Budget:</span>
                      <p className="font-semibold">
                        {control.daily_budget 
                          ? `R$ ${control.daily_budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : 'N/D'}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Última Otimização:</span>
                      <p className="font-semibold">
                        {control.last_optimization 
                          ? new Date(control.last_optimization).toLocaleDateString('pt-BR')
                          : 'N/D'}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Plataformas:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {control.platforms && control.platforms.length > 0 ? (
                          control.platforms.slice(0, 2).map((platform, index) => (
                            <Badge key={index} variant="outline" className="text-xs px-1.5 py-0.5">
                              {platform}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">N/D</span>
                        )}
                        {control.platforms && control.platforms.length > 2 && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                            +{control.platforms.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Observações (se houver) */}
                  {control.observations && (
                    <div>
                      <span className="font-medium text-muted-foreground text-sm">Observações:</span>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{control.observations}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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
                  <p className="text-sm">{new Date(selectedControl.last_optimization).toLocaleDateString('pt-BR')}</p>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Controle de Tráfego</DialogTitle>
            <DialogDescription>
              Edite as informações do controle de tráfego
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <p className="text-muted-foreground">Funcionalidade de edição será implementada em breve.</p>
          </div>
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