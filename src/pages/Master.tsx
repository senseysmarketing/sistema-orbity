import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMaster } from '@/hooks/useMaster';
import { MasterMetricsCards } from '@/components/master/MasterMetricsCards';
import { AgenciesTable } from '@/components/master/AgenciesTable';
import { SubscriptionPlansManager } from '@/components/master/SubscriptionPlansManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, BarChart3, Building2, Settings } from 'lucide-react';

export default function Master() {
  const navigate = useNavigate();
  const { isMasterUser, loading } = useMaster();

  useEffect(() => {
    if (!loading && !isMasterUser) {
      navigate('/');
    }
  }, [isMasterUser, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isMasterUser) {
    return null;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Master</h1>
          <p className="text-muted-foreground">Controle total sobre todas as agências</p>
        </div>
      </div>

      <MasterMetricsCards />

      <Tabs defaultValue="agencies" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="agencies" className="flex items-center space-x-2">
            <Building2 className="h-4 w-4" />
            <span>Agências</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Planos</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Sistema</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agencies" className="space-y-6">
          <AgenciesTable />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Placeholder for analytics charts */}
            <div className="p-8 border-2 border-dashed border-muted rounded-lg text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">Gráfico de Receita</h3>
              <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
            </div>
            <div className="p-8 border-2 border-dashed border-muted rounded-lg text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">Crescimento de Usuários</h3>
              <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <SubscriptionPlansManager />
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="p-8 border-2 border-dashed border-muted rounded-lg text-center">
            <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">Configurações do Sistema</h3>
            <p className="text-sm text-muted-foreground">Logs, configurações globais e administração avançada</p>
            <p className="text-sm text-muted-foreground mt-2">Em desenvolvimento</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}