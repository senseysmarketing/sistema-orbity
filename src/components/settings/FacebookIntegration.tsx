import { useState, useEffect } from "react";
import { Facebook, LogOut, Loader2, Shield, RefreshCw, Users } from "lucide-react";
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
  if (!expiresAt) return { label: "Desconhecido", variant: "secondary" as const, color: "" };
  const expirationDate = new Date(expiresAt);
  if (isPast(expirationDate)) return { label: "Expirado", variant: "danger" as const, color: "" };
  const daysLeft = differenceInDays(expirationDate, new Date());
  if (daysLeft <= 30) return { label: `Expira em ${daysLeft}d`, variant: "warning" as const, color: "" };
  return { label: `Válido (${daysLeft}d)`, variant: "success" as const, color: "" };
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

      // Fetch ad accounts info
      const { count, error: countError } = await supabase
        .from('selected_ad_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', currentAgency.id)
        .eq('is_active', true);

      if (!countError) setAdAccountCount(count || 0);

      // Fetch last sync
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Facebook className="h-8 w-8 text-blue-600" />
              <div>
                <CardTitle className="text-lg">Meta Ads</CardTitle>
                <CardDescription>Carregando...</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const tokenStatus = activeConnection ? getTokenStatus(activeConnection.token_expires_at) : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Facebook className="h-8 w-8 text-blue-600" />
            <div>
              <CardTitle className="text-lg">Meta Ads</CardTitle>
              <CardDescription>
                Conecte Facebook e Instagram Ads para monitorar campanhas
              </CardDescription>
            </div>
          </div>
          <Badge variant={isConnected ? "default" : "secondary"} className={isConnected ? "bg-green-600" : ""}>
            {isConnected ? "Conectado" : "Desconectado"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected && activeConnection ? (
          <>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Negócio</span>
                <span className="font-medium">{activeConnection.business_name}</span>
              </div>

              {activeConnection.facebook_user_id && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Facebook User ID</span>
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                    {activeConnection.facebook_user_id}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Contas de anúncio
                </span>
                <span className="font-medium">{adAccountCount} vinculada{adAccountCount !== 1 ? 's' : ''}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  Token
                </span>
                {tokenStatus && (
                  <Badge variant={tokenStatus.variant}>
                    {tokenStatus.label}
                  </Badge>
                )}
              </div>

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Última sincronização
                </span>
                <span className="font-medium">
                  {lastSync
                    ? format(new Date(lastSync), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                    : "Nunca"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Conectado em</span>
                <span className="font-medium">
                  {format(new Date(activeConnection.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
                  <LogOut className="mr-2 h-4 w-4" />
                  Desconectar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Desconectar Facebook?</AlertDialogTitle>
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
          </>
        ) : (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Facebook className="mr-2 h-4 w-4" />
                Conectar Facebook
              </Button>
            </DialogTrigger>
            <FacebookConnectionDialog
              onSuccess={handleConnectionSuccess}
              onClose={() => setIsDialogOpen(false)}
            />
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};
