import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  MessageSquare,
  QrCode,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Smartphone,
  Save,
  MessageCircle,
  Layout,
  Unlink,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useMasterWhatsApp, type MasterWAStatus } from '@/hooks/useMasterWhatsApp';

function StatusBadge({ status }: { status: MasterWAStatus }) {
  const map: Record<MasterWAStatus, { label: string; cls: string; Icon: any }> = {
    connected:    { label: 'Conectado',     cls: 'text-green-600 bg-green-50 border-green-100',  Icon: CheckCircle2 },
    qr_pending:   { label: 'Aguardando QR', cls: 'text-amber-600 bg-amber-50 border-amber-100',  Icon: QrCode },
    provisioning: { label: 'Conectando…',   cls: 'text-blue-600 bg-blue-50 border-blue-100',     Icon: Loader2 },
    error:        { label: 'Erro',          cls: 'text-red-600 bg-red-50 border-red-100',        Icon: AlertTriangle },
    disconnected: { label: 'Desconectado',  cls: 'text-slate-600 bg-slate-50 border-slate-200',  Icon: XCircle },
  };
  const { label, cls, Icon } = map[status];
  return (
    <div className={`flex items-center text-sm font-medium px-3 py-1 rounded-full border ${cls}`}>
      <Icon className={`h-4 w-4 mr-2 ${status === 'provisioning' ? 'animate-spin' : ''}`} />
      {label}
    </div>
  );
}


export function MasterSystem() {
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const wa = useMasterWhatsApp();

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('*');

      if (error) throw error;

      const configMap: Record<string, any> = {};
      (data || []).forEach((c) => {
        try {
          configMap[c.key] = JSON.parse(c.value);
        } catch {
          configMap[c.key] = c.value;
        }
      });
      setConfigs(configMap);
    } catch (error) {
      console.error('Error fetching configs:', error);
      toast({
        title: 'Erro ao carregar configurações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const saveAllConfigs = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(configs)) {
        await supabase
          .from('system_config')
          .upsert({ 
            key,
            value: JSON.stringify(value),
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' });
      }
      
      toast({
        title: 'Configurações salvas',
        description: 'Todas as configurações foram atualizadas',
      });
    } catch (error) {
      console.error('Error saving configs:', error);
      toast({
        title: 'Erro ao salvar',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const trialSettings = configs.trial_settings || { 
    days: 7, 
    message_template: "Olá {name}! Seu período de teste na Orbity começou. Você tem {days} dias para explorar todas as funcionalidades.",
    reminders: [
      { days_before: 2, message: "Olá {name}! Seu trial expira em 2 dias." },
      { days_before: 1, message: "Olá {name}! Seu trial expira amanhã." }
    ]
  };

  const verificationTemplate = configs.whatsapp_verification_template || "Para finalizar seu acesso à Orbity, use o código: {code}";

  return (
    <div className="space-y-6">
      <Tabs defaultValue="whatsapp" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="trial" className="flex items-center gap-2">
            <Layout className="h-4 w-4" />
            Trial & Mensagens
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Conexão WhatsApp Orbity</CardTitle>
                </div>
                <StatusBadge status={wa.state.status} />
              </div>
              <CardDescription>
                Número oficial para envio de códigos de verificação e lembretes de trial
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {wa.state.status === 'provisioning' && (
                <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                  <p className="text-sm text-slate-600">Preparando instância…</p>
                </div>
              )}

              {wa.state.status === 'qr_pending' && wa.state.qr_code && (
                <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                  <div className="bg-white p-4 rounded-xl shadow-sm mb-4">
                    <img
                      src={wa.state.qr_code.startsWith('data:') ? wa.state.qr_code : `data:image/png;base64,${wa.state.qr_code}`}
                      alt="QR Code"
                      className="w-64 h-64"
                    />
                  </div>
                  <p className="text-sm text-slate-600 mb-4 text-center">
                    Escaneie com o WhatsApp oficial da Orbity
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => wa.refreshQr.mutate()}
                      disabled={wa.refreshQr.isPending}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${wa.refreshQr.isPending ? 'animate-spin' : ''}`} />
                      Atualizar QR
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => wa.hardReset.mutate()}
                      disabled={wa.hardReset.isPending}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {wa.state.status === 'disconnected' && (
                <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                  <QrCode className="h-12 w-12 text-slate-300 mb-4" />
                  <p className="text-slate-500 mb-6">Nenhuma conexão ativa detectada</p>
                  <Button
                    onClick={() => wa.connect.mutate()}
                    disabled={wa.connect.isPending}
                    className="bg-primary hover:bg-primary/90 text-white px-8"
                  >
                    {wa.connect.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <QrCode className="h-4 w-4 mr-2" />
                    )}
                    Gerar Novo QR Code
                  </Button>
                </div>
              )}

              {wa.state.status === 'connected' && (
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex items-center justify-between flex-wrap gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Número Conectado</p>
                    <p className="text-xl font-semibold text-slate-900">
                      {wa.state.phone_number || 'WhatsApp Oficial'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => wa.refetch()}
                      disabled={wa.isFetching}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${wa.isFetching ? 'animate-spin' : ''}`} />
                      Verificar Status
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => wa.disconnect.mutate()}
                      disabled={wa.disconnect.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
                    >
                      <Unlink className={`h-4 w-4 mr-2 ${wa.disconnect.isPending ? 'animate-spin' : ''}`} />
                      Desconectar
                    </Button>
                  </div>
                </div>
              )}

              {wa.state.status === 'error' && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Erro na conexão</AlertTitle>
                  <AlertDescription className="space-y-3">
                    <p>{wa.state.error || 'Falha desconhecida na conexão Uazapi.'}</p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => wa.refreshQr.mutate()} disabled={wa.refreshQr.isPending}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${wa.refreshQr.isPending ? 'animate-spin' : ''}`} />
                        Tentar novamente
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => wa.hardReset.mutate()}
                        disabled={wa.hardReset.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Hard Reset
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>


          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Template de Verificação</CardTitle>
              </div>
              <CardDescription>
                Mensagem enviada no onboarding para validar o número
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification_template">Mensagem de Código</Label>
                <Textarea 
                  id="verification_template"
                  value={verificationTemplate}
                  onChange={(e) => setConfigs(prev => ({ ...prev, whatsapp_verification_template: e.target.value }))}
                  placeholder="Para finalizar seu acesso, use o código: {code}"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">Use {'{code}'} onde o código numérico deve aparecer.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trial" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Layout className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Configurações de Trial</CardTitle>
              </div>
              <CardDescription>
                Controle o período gratuito e as mensagens automáticas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="trial_days">Dias de Trial Padrão</Label>
                  <Input 
                    id="trial_days"
                    type="number"
                    value={trialSettings.days}
                    onChange={(e) => setConfigs(prev => ({
                      ...prev,
                      trial_settings: { ...trialSettings, days: parseInt(e.target.value) }
                    }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trial_template">Mensagem de Boas-vindas (Início do Trial)</Label>
                <Textarea 
                  id="trial_template"
                  value={trialSettings.message_template}
                  onChange={(e) => setConfigs(prev => ({
                    ...prev,
                    trial_settings: { ...trialSettings, message_template: e.target.value }
                  }))}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Tags disponíveis: {'{name}'}, {'{days}'}</p>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Lembretes Automáticos</h4>
                {trialSettings.reminders.map((reminder: any, index: number) => (
                  <div key={index} className="space-y-3 p-4 border rounded-lg bg-slate-50/50">
                    <div className="flex items-center gap-4">
                      <div className="w-32">
                        <Label>Dias antes</Label>
                        <Input 
                          type="number" 
                          value={reminder.days_before} 
                          onChange={(e) => {
                            const newReminders = [...trialSettings.reminders];
                            newReminders[index].days_before = parseInt(e.target.value);
                            setConfigs(prev => ({
                              ...prev,
                              trial_settings: { ...trialSettings, reminders: newReminders }
                            }));
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <Label>Mensagem</Label>
                        <Input 
                          value={reminder.message}
                          onChange={(e) => {
                            const newReminders = [...trialSettings.reminders];
                            newReminders[index].message = e.target.value;
                            setConfigs(prev => ({
                              ...prev,
                              trial_settings: { ...trialSettings, reminders: newReminders }
                            }));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={saveAllConfigs} disabled={saving} size="lg" className="px-8">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Todas as Configurações'}
        </Button>
      </div>
    </div>
  );
}
