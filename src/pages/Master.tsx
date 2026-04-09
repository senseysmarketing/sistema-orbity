import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMaster } from '@/hooks/useMaster';
import { useAgency } from '@/hooks/useAgency';
import { MasterMetricsCards } from '@/components/master/MasterMetricsCards';
import { AgenciesTable } from '@/components/master/AgenciesTable';
import { SubscriptionPlansManager } from '@/components/master/SubscriptionPlansManager';
import { MasterAnalytics } from '@/components/master/MasterAnalytics';
import { OrbityLeadsTable } from '@/components/master/OrbityLeadsTable';
import { CreateAgencyDialog } from '@/components/master/CreateAgencyDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gauge, BarChart3, Building2, Settings, UserPlus } from 'lucide-react';
import { isMasterAgencyAdmin } from '@/lib/masterAccess';

export default function Master() {
  const navigate = useNavigate();
  const { loading, refreshAgencies } = useMaster();
  const { currentAgency, agencyRole, loading: agencyLoading } = useAgency();

  const hasAccess = isMasterAgencyAdmin(currentAgency?.id, agencyRole);

  useEffect(() => {
    if (!loading && !agencyLoading && !hasAccess) {
      navigate('/dashboard');
    }
  }, [hasAccess, loading, agencyLoading, navigate]);

  if (loading || agencyLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasAccess) return null;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Gauge className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Painel de Controle</h1>
            <p className="text-muted-foreground">Controle total sobre todas as agências do sistema</p>
          </div>
        </div>
      </div>

      <MasterMetricsCards />

      <Tabs defaultValue="agencies" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="agencies" className="flex items-center space-x-2">
            <Building2 className="h-4 w-4" />
            <span>Agências</span>
          </TabsTrigger>
          <TabsTrigger value="leads" className="flex items-center space-x-2">
            <UserPlus className="h-4 w-4" />
            <span>Aplicações / Leads</span>
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
            <Settings className="h-4 w-4" />
            <span>Sistema</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agencies" className="space-y-6">
          <div className="flex justify-end">
            <CreateAgencyDialog onCreated={refreshAgencies} />
          </div>
          <AgenciesTable />
        </TabsContent>

        <TabsContent value="leads" className="space-y-6">
          <OrbityLeadsTable />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <MasterAnalytics />
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
