import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Facebook, Plus, Settings, BarChart, Activity, LogOut, Users, TrendingUp, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";
import { FacebookConnectionDialog } from "@/components/traffic/FacebookConnectionDialog";
import { AdAccountsManager } from "@/components/traffic/AdAccountsManager";
import { ClientsPanel } from "@/components/traffic/ClientsPanel";
import { CampaignsAndReports } from "@/components/traffic/CampaignsAndReports";

interface FacebookConnection {
  id: string;
  business_name: string;
  is_active: boolean;
  created_at: string;
}

interface SelectedAdAccount {
  id: string;
  ad_account_id: string;
  ad_account_name: string;
  currency: string;
  is_active: boolean;
  last_sync: string | null;
}

export default function Traffic() {
  const [facebookConnections, setFacebookConnections] = useState<FacebookConnection[]>([]);
  const [selectedAdAccounts, setSelectedAdAccounts] = useState<SelectedAdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnectionDialogOpen, setIsConnectionDialogOpen] = useState(false);
  const [isManageAccountsOpen, setIsManageAccountsOpen] = useState(false);
  const [isDisconnectDialogOpen, setIsDisconnectDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('traffic-active-tab') || 'campaigns';
  });
  
  const { profile } = useAuth();
  const { currentAgency } = useAgency();
  const { toast } = useToast();

  const hasAccess = profile?.role === 'agency_user' || profile?.role === 'agency_admin';

  useEffect(() => {
    if (hasAccess && currentAgency) {
      fetchConnections();
      fetchSelectedAdAccounts();
    } else {
      setLoading(false);
    }
  }, [hasAccess, currentAgency?.id]);

  useEffect(() => {
    localStorage.setItem('traffic-active-tab', activeTab);
  }, [activeTab]);

  const fetchConnections = async () => {
    if (!currentAgency) return;
    
    try {
      const { data, error } = await supabase
        .from('facebook_connections')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFacebookConnections(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar conexões:', error);
    }
  };

  const fetchSelectedAdAccounts = async () => {
    if (!currentAgency) return;
    
    try {
      const { data, error } = await supabase
        .from('selected_ad_accounts')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .eq('is_active', true)
        .order('ad_account_name');

      if (error) throw error;
      setSelectedAdAccounts(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar contas de anúncio:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectionSuccess = () => {
    fetchConnections();
    fetchSelectedAdAccounts();
    setIsConnectionDialogOpen(false);
    toast({
      title: "Conexão estabelecida!",
      description: "Facebook conectado com sucesso.",
    });
  };

  const handleDisconnectFacebook = async () => {
    if (!currentAgency) return;
    
    try {
      await supabase
        .from('facebook_connections')
        .update({ is_active: false })
        .eq('agency_id', currentAgency.id)
        .eq('is_active', true);

      await supabase
        .from('selected_ad_accounts')
        .update({ is_active: false })
        .eq('agency_id', currentAgency.id)
        .eq('is_active', true);

      setFacebookConnections([]);
      setSelectedAdAccounts([]);
      setIsDisconnectDialogOpen(false);

      toast({
        title: "Desconectado com sucesso!",
        description: "Sua conta do Facebook foi desconectada.",
      });
    } catch (error: any) {
      console.error('Erro ao desconectar:', error);
      toast({
        title: "Erro ao desconectar",
        description: "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acesso Restrito</h3>
            <p className="text-muted-foreground text-center">
              Esta página é acessível para usuários da agência.
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

  if (facebookConnections.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold tracking-tight mb-4">Controle de Tráfego</h1>
          <p className="text-muted-foreground mb-8">
            Conecte suas contas de anúncios para monitorar suas campanhas
          </p>
          
          <div className="max-w-md mx-auto">
            <Card className="border-2 border-dashed">
              <CardHeader className="text-center">
                <Facebook className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Meta Ads</CardTitle>
                <CardDescription>
                  Configure a conexão do Facebook na aba de Integrações nas Configurações
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => navigate('/dashboard/settings?tab=integrations')}
                >
                  <Settings className="mr-2 h-5 w-5" />
                  Ir para Integrações
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (selectedAdAccounts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Controle de Tráfego</h1>
            <p className="text-muted-foreground">Selecione as contas de anúncios</p>
          </div>
        </div>
        <AdAccountsManager onAccountsSelected={fetchSelectedAdAccounts} />
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
            Painel de gestão de campanhas Meta Ads
          </p>
        </div>
        <div className="flex gap-2">
          <AlertDialog open={isDisconnectDialogOpen} onOpenChange={setIsDisconnectDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
                <LogOut className="mr-2 h-4 w-4" />
                Desconectar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Desconectar Facebook?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso removerá todas as contas de anúncios selecionadas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDisconnectFacebook} className="bg-destructive text-destructive-foreground">
                  Desconectar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Dialog open={isManageAccountsOpen} onOpenChange={setIsManageAccountsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Gerenciar Contas
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Gerenciar Contas de Anúncios</DialogTitle>
                <DialogDescription>
                  Adicione ou remova contas de anúncios
                </DialogDescription>
              </DialogHeader>
              <AdAccountsManager
                onAccountsSelected={() => {
                  fetchSelectedAdAccounts();
                  setIsManageAccountsOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Facebook className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Facebook</span>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-600">Conectado</Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-gray-400" />
              <span className="font-medium">Google Ads</span>
            </div>
            <Badge variant="secondary">Em Breve</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <BarChart className="h-5 w-5 text-primary" />
              <span className="font-medium">Contas Ativas</span>
            </div>
            <Badge variant="outline">{selectedAdAccounts.length}</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Tabs - 2 abas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Campanhas e Relatórios
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Painel de Clientes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-6">
          <CampaignsAndReports selectedAdAccounts={selectedAdAccounts} />
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <ClientsPanel 
            selectedAdAccounts={selectedAdAccounts} 
            onNavigateToCampaigns={() => setActiveTab('campaigns')}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}