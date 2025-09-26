import { useState, useEffect } from "react";
import { AlertCircle, Facebook, Plus, Play, Settings, BarChart, FileText, DollarSign, Activity, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { TrafficDashboard } from "@/components/traffic/TrafficDashboard";
import { CampaignsTab } from "@/components/traffic/CampaignsTab";
import { ReportsTab } from "@/components/traffic/ReportsTab";
import { BalanceCheckerTab } from "@/components/traffic/BalanceCheckerTab";
import { FacebookConnectionDialog } from "@/components/traffic/FacebookConnectionDialog";
import { AdAccountsManager } from "@/components/traffic/AdAccountsManager";

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
  
  const { profile } = useAuth();
  const { toast } = useToast();
  const { currentSubscription } = useSubscription();

  // Verifica se o usuário tem permissão para acessar a página
  const hasAccess = profile?.role === 'agency_user' || profile?.role === 'agency_admin';

  useEffect(() => {
    if (hasAccess) {
      fetchConnections();
      fetchSelectedAdAccounts();
    } else {
      setLoading(false);
    }
  }, [hasAccess]);

  const fetchConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('facebook_connections')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFacebookConnections(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar conexões:', error);
    }
  };

  const fetchSelectedAdAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('selected_ad_accounts')
        .select('*')
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
      description: "Facebook conectado com sucesso. Agora selecione suas contas de anúncios.",
    });
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

  // Se não há conexões, mostrar tela de conexão
  if (facebookConnections.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold tracking-tight mb-4">Controle de Tráfego</h1>
          <p className="text-muted-foreground mb-8">
            Conecte suas contas de anúncios para começar a monitorar e otimizar suas campanhas
          </p>
          
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card className="border-2 border-dashed">
                <CardHeader className="text-center">
                  <Facebook className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <CardTitle className="text-xl">Meta Ads (Facebook/Instagram)</CardTitle>
                  <CardDescription>
                    Conecte suas contas de anúncios do Facebook e Instagram para monitoramento automático
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Dialog open={isConnectionDialogOpen} onOpenChange={setIsConnectionDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full" size="lg">
                        <Facebook className="mr-2 h-5 w-5" />
                        Conectar Facebook
                      </Button>
                    </DialogTrigger>
                    <FacebookConnectionDialog
                      onSuccess={handleConnectionSuccess}
                      onClose={() => setIsConnectionDialogOpen(false)}
                    />
                  </Dialog>
                </CardContent>
              </Card>

              <Card className="border-2 border-dashed opacity-60">
                <CardHeader className="text-center">
                  <div className="h-12 w-12 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Activity className="h-6 w-6 text-gray-500" />
                  </div>
                  <CardTitle className="text-xl">Google Ads</CardTitle>
                  <CardDescription>
                    Integração com Google Ads em breve
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button disabled size="lg" className="w-full">
                    <Badge variant="secondary" className="mr-2">Em Breve</Badge>
                    Google Ads
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
              <strong>Nota:</strong> Você poderá conectar até 10 contas de anúncios 
              de acordo com seu plano atual.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  // Se não há contas selecionadas, mostrar gerenciador
  if (selectedAdAccounts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Controle de Tráfego</h1>
            <p className="text-muted-foreground">
              Selecione as contas de anúncios que deseja monitorar
            </p>
          </div>
        </div>

        <AdAccountsManager
          onAccountsSelected={fetchSelectedAdAccounts}
        />
      </div>
    );
  }

  // Interface principal do controle de tráfego
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Controle de Tráfego</h1>
          <p className="text-muted-foreground">
            Painel completo para monitoramento e gestão de campanhas de Meta Ads
          </p>
        </div>
        <div className="flex gap-2">
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
                  Adicione, remova ou configure suas contas de anúncios conectadas
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

      {/* Status das conexões */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Facebook className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Facebook</span>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-600">
              Conectado
            </Badge>
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
            <Badge variant="outline">
              {selectedAdAccounts.length}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Abas principais */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Campanhas
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Relatórios
          </TabsTrigger>
          <TabsTrigger value="balance" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Verificador de Saldo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <TrafficDashboard selectedAdAccounts={selectedAdAccounts} />
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <CampaignsTab selectedAdAccounts={selectedAdAccounts} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <ReportsTab selectedAdAccounts={selectedAdAccounts} />
        </TabsContent>

        <TabsContent value="balance" className="space-y-6">
          <BalanceCheckerTab selectedAdAccounts={selectedAdAccounts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}