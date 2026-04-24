import { useState, useEffect } from "react";
import { Facebook, Loader2, Shield, Users, Check, Unlink, Wrench } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { META_MAINTENANCE_ACTIVE, META_MAINTENANCE_RETURN_DATE, META_MAINTENANCE_MESSAGE } from "@/components/traffic/utils/metaMaintenanceNotice";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";
import { FacebookConnectionDialog } from "@/components/traffic/FacebookConnectionDialog";
import { format, differenceInDays, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FacebookConnection {
  id: string;
  business_name: string;
  facebook_user_id: string | null;
  token_expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

const getTokenStatus = (expiresAt: string | null) => {
  if (!expiresAt) return { label: "Desconhecido", variant: "secondary" as const };
  const expirationDate = new Date(expiresAt);
  if (isPast(expirationDate)) return { label: "Expirado", variant: "danger" as const };
  const daysLeft = differenceInDays(expirationDate, new Date());
  if (daysLeft <= 30) return { label: `Expira em ${daysLeft}d`, variant: "warning" as const };
  return { label: `Válido (${daysLeft}d)`, variant: "success" as const };
};

export const FacebookIntegration = () => {
  const [connections, setConnections] = useState<FacebookConnection[]>([]);
  const [adAccountCount, setAdAccountCount] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { currentAgency } = useAgency();
  const { toast } = useToast();

  const fetchConnections = async () => {
    if (!currentAgency) return;
    try {
      const { data, error } = await supabase
        .from('facebook_connections')
        .select('id, business_name, facebook_user_id, token_expires_at, is_active, created_at')
        .eq('agency_id', currentAgency.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConnections(data || []);

      const { count, error: countError } = await supabase
        .from('selected_ad_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', currentAgency.id)
        .eq('is_active', true);

      if (!countError) setAdAccountCount(count || 0);

      const { data: syncData, error: syncError } = await supabase
        .from('selected_ad_accounts')
        .select('last_sync')
        .eq('agency_id', currentAgency.id)
        .eq('is_active', true)
        .order('last_sync', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (!syncError && syncData?.last_sync) {
        setLastSync(syncData.last_sync);
      }
    } catch (error: any) {
      console.error('Erro ao carregar conexões Facebook:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentAgency) {
      fetchConnections();
    } else {
      setLoading(false);
    }
  }, [currentAgency?.id]);

  const handleConnectionSuccess = () => {
    fetchConnections();
    setIsDialogOpen(false);
    toast({
      title: "Conexão estabelecida!",
      description: "Facebook conectado com sucesso.",
    });
  };

  const handleDisconnect = async () => {
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

      setConnections([]);
      setAdAccountCount(0);
      setLastSync(null);
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

  const isConnected = connections.length > 0;
  const activeConnection = connections[0];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const tokenStatus = activeConnection ? getTokenStatus(activeConnection.token_expires_at) : null;

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
              <Facebook className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base sm:text-lg">Meta Ads</CardTitle>
                {isConnected && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 flex-shrink-0">
                    <Check className="mr-1 h-3 w-3" />
                    Conectado
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Conecte Facebook e Instagram Ads para monitorar campanhas e métricas</span>
                <span className="sm:hidden">Monitore campanhas do Facebook e Instagram</span>
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
        {isConnected && activeConnection ? (
          <>
            {/* Conta conectada */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 border rounded-lg bg-muted/30">
              <div className="space-y-0.5 sm:space-y-1 min-w-0">
                <p className="text-sm font-medium">{activeConnection.business_name}</p>
                {activeConnection.facebook_user_id && (
                  <p className="text-xs text-muted-foreground font-mono">
                    ID: {activeConnection.facebook_user_id}
                  </p>
                )}
                {lastSync && (
                  <p className="text-xs text-muted-foreground">
                    <span className="hidden sm:inline">Última sincronização: </span>
                    <span className="sm:hidden">Sinc.: </span>
                    {format(new Date(lastSync), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
              </div>
            </div>

            {/* Contas de anúncio */}
            <div className="flex items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg">
              <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                <p className="text-sm font-medium">Contas de anúncio</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {adAccountCount} conta{adAccountCount !== 1 ? 's' : ''} vinculada{adAccountCount !== 1 ? 's' : ''}
                </p>
              </div>
              <Users className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </div>

            {/* Token */}
            <div className="flex items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg">
              <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                <p className="text-sm font-medium">Token de acesso</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Conectado em {format(new Date(activeConnection.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              {tokenStatus && (
                <Badge variant={tokenStatus.variant} className="flex-shrink-0">
                  <Shield className="mr-1 h-3 w-3" />
                  {tokenStatus.label}
                </Badge>
              )}
            </div>

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="w-full sm:w-auto">
                    <Unlink className="mr-2 h-4 w-4" />
                    Desconectar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Desconectar Meta Ads?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso removerá todas as contas de anúncios selecionadas e dados associados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDisconnect} className="bg-destructive text-destructive-foreground">
                      Desconectar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {META_MAINTENANCE_ACTIVE && (
              <Alert variant="warning">
                <Wrench className="h-4 w-4" />
                <AlertTitle>Meta Ads em manutenção</AlertTitle>
                <AlertDescription>{META_MAINTENANCE_MESSAGE}</AlertDescription>
              </Alert>
            )}

            <div className="p-3 sm:p-4 border rounded-lg bg-muted/30 space-y-2">
              <p className="text-sm font-medium">Recursos disponíveis:</p>
              <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                <li>• Monitoramento de campanhas em tempo real</li>
                <li>• Métricas de desempenho (CPC, CPM, CTR)</li>
                <li>• Controle de saldo das contas de anúncio</li>
                <li className="hidden sm:list-item">• Alertas de saldo baixo automáticos</li>
                <li className="hidden sm:list-item">• Relatórios consolidados por cliente</li>
              </ul>
            </div>

            {META_MAINTENANCE_ACTIVE ? (
              <Button className="w-full" disabled>
                <Wrench className="mr-2 h-4 w-4" />
                Conexão indisponível — previsão {META_MAINTENANCE_RETURN_DATE}
              </Button>
            ) : (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Facebook className="mr-2 h-4 w-4" />
                    Conectar Meta Ads
                  </Button>
                </DialogTrigger>
                <FacebookConnectionDialog
                  onSuccess={handleConnectionSuccess}
                  onClose={() => setIsDialogOpen(false)}
                />
              </Dialog>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
