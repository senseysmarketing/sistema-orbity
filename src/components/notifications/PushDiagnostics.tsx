import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  RefreshCw, 
  Copy, 
  Trash2, 
  Send, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Smartphone,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface DiagnosticLog {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface PushDiagnosticsProps {
  token: string | null;
  permission: NotificationPermission;
  isStandaloneMode: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSupported: boolean;
}

export function PushDiagnostics({
  token,
  permission,
  isStandaloneMode,
  isIOS,
  isAndroid,
  isSupported: _isSupported,
}: PushDiagnosticsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);
  const [swStatus, setSwStatus] = useState<'active' | 'installing' | 'waiting' | 'none'>('none');
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [isClearingTokens, setIsClearingTokens] = useState(false);
  const [isUpdatingSW, setIsUpdatingSW] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toLocaleTimeString('pt-BR'));

  const addLog = useCallback((message: string, type: DiagnosticLog['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('pt-BR');
    setLogs(prev => [{ time, message, type }, ...prev].slice(0, 50));
  }, []);

  const checkSwStatus = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      setSwStatus('none');
      addLog('Service Worker não suportado', 'error');
      return;
    }

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      // Procurar especificamente pelo Firebase SW
      const fcmReg = registrations.find(r => 
        r.active?.scriptURL?.includes('firebase-messaging-sw.js')
      );
      
      if (fcmReg) {
        setSwStatus('active');
        addLog('Firebase SW ativo ✓', 'success');
        return;
      }
      
      // Procurar qualquer SW com escopo raiz
      const anyReg = registrations.find(r => r.scope.endsWith('/'));
      if (anyReg) {
        if (anyReg.installing) {
          setSwStatus('installing');
          addLog('Service Worker instalando...', 'warning');
        } else if (anyReg.waiting) {
          setSwStatus('waiting');
          addLog('SW aguardando - clique "Atualizar SW" para ativar', 'warning');
        } else if (anyReg.active) {
          // SW ativo, mas não é o Firebase SW
          const scriptName = anyReg.active.scriptURL?.split('/').pop() || 'desconhecido';
          setSwStatus('active');
          addLog(`SW ativo: ${scriptName}`, 'success');
        }
      } else {
        setSwStatus('none');
        addLog('Nenhum Service Worker encontrado', 'error');
      }
    } catch (error) {
      console.error('[Diagnostics] SW check error:', error);
      setSwStatus('none');
      addLog(`Erro ao verificar SW: ${error}`, 'error');
    }
  }, [addLog]);

  const refreshDiagnostics = useCallback(async () => {
    setLastUpdate(new Date().toLocaleTimeString('pt-BR'));
    addLog('Atualizando diagnóstico...', 'info');
    await checkSwStatus();
    
    // Check permission
    if (permission === 'granted') {
      addLog(`Permissão: ${permission} ✓`, 'success');
    } else {
      addLog(`Permissão: ${permission}`, permission === 'denied' ? 'error' : 'warning');
    }
    
    // Check standalone
    if (isIOS && !isStandaloneMode) {
      addLog('⚠️ iOS detectado fora da PWA - push não funcionará', 'error');
    } else if (isStandaloneMode) {
      addLog('Modo PWA Standalone ✓', 'success');
    }
    
    // Check token
    if (token) {
      addLog(`Token FCM presente (${token.substring(0, 20)}...)`, 'success');
    } else {
      addLog('Token FCM não encontrado', 'warning');
    }
  }, [checkSwStatus, permission, isStandaloneMode, isIOS, token, addLog]);

  useEffect(() => {
    refreshDiagnostics();
  }, []);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copiado!` });
      addLog(`${label} copiado para clipboard`, 'success');
    } catch (_error) {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  const sendTestPush = async () => {
    if (!user) {
      addLog('Usuário não autenticado', 'error');
      return;
    }

    setIsTestingPush(true);
    addLog('Enviando notificação de teste...', 'info');

    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: user.id,
          title: '🔔 Teste de Push',
          body: 'Se você está vendo isso, as notificações funcionam!',
          data: { 
            action_url: '/settings', 
            test: 'true',
            play_sound: 'true'
          },
        }
      });

      if (error) {
        addLog(`Erro do servidor: ${error.message}`, 'error');
        toast({ 
          title: "Erro ao enviar teste", 
          description: error.message,
          variant: "destructive" 
        });
      } else {
        addLog(`Resposta FCM: ${JSON.stringify(data)}`, 'success');
        toast({ 
          title: "Teste enviado!", 
          description: "Aguarde alguns segundos pela notificação." 
        });
        
        // Log detailed response
        if (data?.results) {
          data.results.forEach((result: any, index: number) => {
            if (result.success) {
              addLog(`Token ${index + 1}: Enviado com sucesso ✓`, 'success');
            } else {
              addLog(`Token ${index + 1}: Falhou - ${result.error || 'erro desconhecido'}`, 'error');
            }
          });
        }
      }
    } catch (error: any) {
      addLog(`Exceção: ${error.message}`, 'error');
      toast({ 
        title: "Erro ao enviar teste", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setIsTestingPush(false);
    }
  };

  const clearOldTokens = async () => {
    if (!user) return;

    setIsClearingTokens(true);
    addLog('Limpando tokens antigos...', 'info');

    try {
      // Deactivate all tokens except current
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .neq('fcm_token', token || '');

      // Count separately for feedback
      const { count } = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', false);

      if (error) {
        addLog(`Erro ao limpar: ${error.message}`, 'error');
      } else {
        addLog(`${count || 0} tokens antigos desativados ✓`, 'success');
        toast({ title: "Tokens antigos limpos!" });
      }
    } catch (error: any) {
      addLog(`Exceção: ${error.message}`, 'error');
    } finally {
      setIsClearingTokens(false);
    }
  };

  const updateServiceWorker = async () => {
    setIsUpdatingSW(true);
    addLog('Forçando ativação do Service Worker...', 'info');

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      for (const registration of registrations) {
        // Se há um SW esperando, forçar skipWaiting
        if (registration.waiting) {
          addLog('SW em espera encontrado - enviando SKIP_WAITING', 'warning');
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        
        await registration.update();
        addLog(`SW atualizado: ${registration.scope}`, 'success');
      }

      // Aguardar um pouco e verificar novamente
      await new Promise(resolve => setTimeout(resolve, 1000));
      await checkSwStatus();
      
      toast({ title: "Service Worker atualizado!" });
    } catch (error: any) {
      addLog(`Erro ao atualizar SW: ${error.message}`, 'error');
    } finally {
      setIsUpdatingSW(false);
    }
  };

  const getStatusBadge = (status: 'active' | 'installing' | 'waiting' | 'none') => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">active</Badge>;
      case 'installing':
        return <Badge variant="secondary" className="bg-yellow-500">installing</Badge>;
      case 'waiting':
        return <Badge variant="secondary" className="bg-yellow-500">waiting</Badge>;
      default:
        return <Badge variant="destructive">none</Badge>;
    }
  };

  const getLogIcon = (type: DiagnosticLog['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'error':
        return <XCircle className="h-3 w-3 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-3 w-3 text-yellow-500" />;
      default:
        return <Smartphone className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              ⚙️ Diagnóstico Firebase
            </CardTitle>
            <CardDescription className="text-xs">
              Informações técnicas para debug
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshDiagnostics}
            className="h-8"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Atualizar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
            <span className="text-muted-foreground">Dispositivo iOS</span>
            <div className="flex items-center gap-1">
              <span>{isIOS ? 'Sim' : 'Não'}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5"
                onClick={() => copyToClipboard(String(isIOS), 'iOS status')}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
            <span className="text-muted-foreground">Dispositivo Android</span>
            <div className="flex items-center gap-1">
              <span>{isAndroid ? 'Sim' : 'Não'}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5"
                onClick={() => copyToClipboard(String(isAndroid), 'Android status')}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
            <span className="text-muted-foreground">Modo PWA</span>
            <div className="flex items-center gap-1">
              <span>{isStandaloneMode ? 'Sim' : 'Não'}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5"
                onClick={() => copyToClipboard(String(isStandaloneMode), 'Standalone status')}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
            <span className="text-muted-foreground">User ID</span>
            <div className="flex items-center gap-1">
              <span className="font-mono text-[10px] truncate max-w-[80px]">
                {user?.id ? `${user.id.substring(0, 8)}...` : 'N/A'}
              </span>
              {user?.id && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5"
                  onClick={() => copyToClipboard(user.id, 'User ID')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
            <span className="text-muted-foreground">Service Worker</span>
            {getStatusBadge(swStatus)}
          </div>

          <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
            <span className="text-muted-foreground">Permissão</span>
            <Badge variant={permission === 'granted' ? 'default' : 'destructive'}>
              {permission}
            </Badge>
          </div>

          <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
            <span className="text-muted-foreground">Inscrito</span>
            <Badge variant={token ? 'default' : 'secondary'}>
              {token ? 'Sim' : 'Não'}
            </Badge>
          </div>

          <div className="col-span-2 flex justify-between items-center p-2 bg-muted/50 rounded">
            <span className="text-muted-foreground">Última atualização</span>
            <span>{lastUpdate}</span>
          </div>
        </div>

        <Separator />

        {/* Token Display */}
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Token FCM Completo (para testes)</span>
          <div className="relative">
            <pre className="text-[10px] font-mono bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap break-all max-h-20">
              {token || 'Nenhum token gerado'}
            </pre>
            {token && (
              <Button
                variant="secondary"
                size="sm"
                className="mt-2 w-full h-7 text-xs"
                onClick={() => copyToClipboard(token, 'Token FCM')}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copiar Token
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={sendTestPush}
              disabled={isTestingPush || !token}
            >
              {isTestingPush ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Send className="h-3 w-3 mr-1" />
              )}
              Testar Push
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={clearOldTokens}
              disabled={isClearingTokens}
            >
              {isClearingTokens ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3 mr-1" />
              )}
              Limpar Tokens
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={updateServiceWorker}
            disabled={isUpdatingSW}
          >
            {isUpdatingSW ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Atualizar Service Worker
          </Button>
        </div>

        <Separator />

        {/* Logs */}
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Logs em Tempo Real</span>
          <ScrollArea className="h-32 rounded border bg-muted/30 p-2">
            {logs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhum log ainda
              </p>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="flex items-start gap-1 text-[10px]">
                    <span className="text-muted-foreground shrink-0">[{log.time}]</span>
                    {getLogIcon(log.type)}
                    <span className={
                      log.type === 'error' ? 'text-red-500' :
                      log.type === 'success' ? 'text-green-500' :
                      log.type === 'warning' ? 'text-yellow-500' :
                      'text-foreground'
                    }>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
