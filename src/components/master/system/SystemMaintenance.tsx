import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Trash2, 
  RefreshCw, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Database,
  Wifi,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HealthCheckResult {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  lastCheck: Date;
}

interface SystemConfigRow {
  key: string;
  value: string;
}

export function SystemMaintenance() {
  const [cleaning, setCleaning] = useState(false);
  const [checking, setChecking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [healthResults, setHealthResults] = useState<HealthCheckResult[]>([]);
  const [lastClean, setLastClean] = useState<Date | null>(null);
  const { toast } = useToast();

  const cleanOldLogs = async () => {
    setCleaning(true);
    try {
      // Get config for retention days
      const { data: config } = await supabase
        .from('system_config' as any)
        .select('value')
        .eq('key', 'max_api_logs_days')
        .single();

      const configRow = config as unknown as SystemConfigRow | null;
      const retentionDays = configRow?.value ? parseInt(configRow.value) : 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Count logs to be deleted
      const { count: apiLogCount } = await supabase
        .from('facebook_api_audit')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', cutoffDate.toISOString());

      // Delete old API logs
      const { error: apiError } = await supabase
        .from('facebook_api_audit')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (apiError) throw apiError;

      setLastClean(new Date());
      toast({
        title: 'Limpeza concluída',
        description: `${apiLogCount || 0} logs removidos (mais de ${retentionDays} dias)`,
      });
    } catch (error) {
      console.error('Error cleaning logs:', error);
      toast({
        title: 'Erro na limpeza',
        description: 'Não foi possível limpar os logs antigos',
        variant: 'destructive',
      });
    } finally {
      setCleaning(false);
    }
  };

  const runHealthCheck = async () => {
    setChecking(true);
    const results: HealthCheckResult[] = [];

    try {
      // Check database connection
      const { error: dbError } = await supabase.from('agencies').select('id').limit(1);
      results.push({
        name: 'Conexão com banco',
        status: dbError ? 'error' : 'ok',
        message: dbError ? 'Falha na conexão' : 'Conexão estável',
        lastCheck: new Date(),
      });

      // Check Facebook connections
      const { data: fbConnections, error: fbError } = await supabase
        .from('facebook_connections')
        .select('id, is_active, token_expires_at')
        .eq('is_active', true);

      const expiredTokens = (fbConnections || []).filter(c => 
        c.token_expires_at && new Date(c.token_expires_at) < new Date()
      );

      results.push({
        name: 'Integrações Facebook',
        status: fbError ? 'error' : expiredTokens.length > 0 ? 'warning' : 'ok',
        message: fbError 
          ? 'Erro ao verificar' 
          : expiredTokens.length > 0 
            ? `${expiredTokens.length} token(s) expirado(s)` 
            : `${(fbConnections || []).length} conexão(ões) ativa(s)`,
        lastCheck: new Date(),
      });

      // Check subscription status
      const { data: subscriptions, error: subError } = await supabase
        .from('agency_subscriptions')
        .select('status')
        .in('status', ['trial', 'active']);

      results.push({
        name: 'Assinaturas',
        status: subError ? 'error' : 'ok',
        message: subError ? 'Erro ao verificar' : `${(subscriptions || []).length} assinatura(s) ativa(s)`,
        lastCheck: new Date(),
      });

      // Check recent errors in API logs
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const { count: errorCount } = await supabase
        .from('facebook_api_audit')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'error')
        .gte('created_at', oneDayAgo.toISOString());

      results.push({
        name: 'Erros de API (24h)',
        status: (errorCount || 0) > 100 ? 'warning' : 'ok',
        message: `${errorCount || 0} erro(s) nas últimas 24h`,
        lastCheck: new Date(),
      });

      setHealthResults(results);
      toast({
        title: 'Health Check concluído',
        description: `${results.filter(r => r.status === 'ok').length}/${results.length} verificações OK`,
      });
    } catch (error) {
      console.error('Error running health check:', error);
      toast({
        title: 'Erro no Health Check',
        variant: 'destructive',
      });
    } finally {
      setChecking(false);
    }
  };

  const syncSubscriptionLimits = async () => {
    setSyncing(true);
    try {
      // Get all agencies with their subscriptions
      const { data: agencies, error } = await supabase
        .from('agencies')
        .select(`
          id,
          name,
          max_users,
          max_clients,
          max_leads,
          max_tasks,
          agency_subscriptions (
            plan_id,
            subscription_plans (
              max_users,
              max_clients,
              max_leads,
              max_tasks
            )
          )
        `);

      if (error) throw error;

      let updatedCount = 0;
      for (const agency of agencies || []) {
        const subscription = (agency as any).agency_subscriptions?.[0];
        const plan = subscription?.subscription_plans;
        
        if (plan) {
          const needsUpdate = 
            agency.max_users !== plan.max_users ||
            agency.max_clients !== plan.max_clients ||
            agency.max_leads !== plan.max_leads ||
            agency.max_tasks !== plan.max_tasks;

          if (needsUpdate) {
            await supabase
              .from('agencies')
              .update({
                max_users: plan.max_users,
                max_clients: plan.max_clients,
                max_leads: plan.max_leads,
                max_tasks: plan.max_tasks,
              })
              .eq('id', agency.id);
            updatedCount++;
          }
        }
      }

      toast({
        title: 'Sincronização concluída',
        description: `${updatedCount} agência(s) atualizada(s)`,
      });
    } catch (error) {
      console.error('Error syncing limits:', error);
      toast({
        title: 'Erro na sincronização',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const getStatusIcon = (status: 'ok' | 'warning' | 'error') => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Maintenance Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Trash2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Limpar Logs Antigos</CardTitle>
            </div>
            <CardDescription>
              Remove logs de API com mais de X dias (configurável)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Esta ação remove permanentemente logs antigos para liberar espaço no banco de dados.
            </p>
            {lastClean && (
              <p className="text-sm text-muted-foreground">
                Última limpeza: {format(lastClean, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
            <Button onClick={cleanOldLogs} disabled={cleaning} variant="outline" className="w-full">
              {cleaning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Limpando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar Logs
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Health Check</CardTitle>
            </div>
            <CardDescription>
              Verifica o status geral do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Executa verificações de saúde em banco de dados, integrações e serviços.
            </p>
            <Button onClick={runHealthCheck} disabled={checking} variant="outline" className="w-full">
              {checking ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4 mr-2" />
                  Executar Check
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Wifi className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Verificar Integrações</CardTitle>
            </div>
            <CardDescription>
              Testa todas as conexões Facebook ativas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Identifica tokens expirados e problemas de conexão com o Facebook.
            </p>
            <Button variant="outline" className="w-full" disabled>
              <Wifi className="h-4 w-4 mr-2" />
              Verificar (Em breve)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Sincronizar Planos</CardTitle>
            </div>
            <CardDescription>
              Atualiza limites das agências com base nos planos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Propaga alterações de limites dos planos para todas as agências.
            </p>
            <Button onClick={syncSubscriptionLimits} disabled={syncing} variant="outline" className="w-full">
              {syncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Sincronizar
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Health Check Results */}
      {healthResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resultados do Health Check</CardTitle>
            <CardDescription>
              Última verificação: {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {healthResults.map((result, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <p className="font-medium">{result.name}</p>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                    </div>
                  </div>
                  <Badge 
                    variant={result.status === 'ok' ? 'default' : result.status === 'warning' ? 'secondary' : 'destructive'}
                  >
                    {result.status === 'ok' ? 'OK' : result.status === 'warning' ? 'Atenção' : 'Erro'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
