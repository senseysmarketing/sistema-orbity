import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Save, Settings, Clock, ToggleLeft, Database } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface SystemConfigItem {
  key: string;
  value: string;
  description: string | null;
}

export function SystemConfig() {
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_config' as any)
        .select('*');

      if (error) throw error;

      const configMap: Record<string, any> = {};
      ((data || []) as unknown as SystemConfigItem[]).forEach((c) => {
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

  const saveConfig = async (key: string, value: any) => {
    try {
      const { error } = await supabase
        .from('system_config' as any)
        .update({ 
          value: JSON.stringify(value),
          updated_at: new Date().toISOString()
        })
        .eq('key', key);

      if (error) throw error;

      setConfigs(prev => ({ ...prev, [key]: value }));
      toast({
        title: 'Configuração salva',
        description: `${key} atualizado com sucesso`,
      });
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: 'Erro ao salvar',
        variant: 'destructive',
      });
    }
  };

  const saveAllConfigs = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(configs)) {
        await supabase
          .from('system_config' as any)
          .update({ 
            value: JSON.stringify(value),
            updated_at: new Date().toISOString()
          })
          .eq('key', key);
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
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const featuresEnabled = configs.features_enabled || { crm: true, social_media: true, traffic: true, contracts: true };

  return (
    <div className="space-y-6">
      {/* Trial Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Período de Trial</CardTitle>
          </div>
          <CardDescription>Configure a duração e lembretes do período de teste</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trial_days">Dias de trial</Label>
              <Input
                id="trial_days"
                type="number"
                min={1}
                max={30}
                value={configs.trial_days || 14}
                onChange={(e) => setConfigs(prev => ({ ...prev, trial_days: parseInt(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground">Duração padrão do período de teste para novas agências</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder_days">Dias para lembrete</Label>
              <Input
                id="reminder_days"
                value={Array.isArray(configs.trial_reminder_days) ? configs.trial_reminder_days.join(', ') : '7, 3, 1'}
                onChange={(e) => {
                  const days = e.target.value.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
                  setConfigs(prev => ({ ...prev, trial_reminder_days: days }));
                }}
              />
              <p className="text-xs text-muted-foreground">Dias antes do fim do trial para enviar lembrete (separados por vírgula)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <ToggleLeft className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Feature Flags</CardTitle>
          </div>
          <CardDescription>Ative ou desative módulos globalmente para todas as agências</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">CRM</p>
                <p className="text-sm text-muted-foreground">Gestão de leads e funil de vendas</p>
              </div>
              <Switch
                checked={featuresEnabled.crm}
                onCheckedChange={(checked) => {
                  const newFeatures = { ...featuresEnabled, crm: checked };
                  setConfigs(prev => ({ ...prev, features_enabled: newFeatures }));
                }}
              />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Social Media</p>
                <p className="text-sm text-muted-foreground">Gestão de posts e calendário</p>
              </div>
              <Switch
                checked={featuresEnabled.social_media}
                onCheckedChange={(checked) => {
                  const newFeatures = { ...featuresEnabled, social_media: checked };
                  setConfigs(prev => ({ ...prev, features_enabled: newFeatures }));
                }}
              />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Gestão de Tráfego</p>
                <p className="text-sm text-muted-foreground">Integração Facebook Ads</p>
              </div>
              <Switch
                checked={featuresEnabled.traffic}
                onCheckedChange={(checked) => {
                  const newFeatures = { ...featuresEnabled, traffic: checked };
                  setConfigs(prev => ({ ...prev, features_enabled: newFeatures }));
                }}
              />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Contratos</p>
                <p className="text-sm text-muted-foreground">Geração de contratos PDF</p>
              </div>
              <Switch
                checked={featuresEnabled.contracts}
                onCheckedChange={(checked) => {
                  const newFeatures = { ...featuresEnabled, contracts: checked };
                  setConfigs(prev => ({ ...prev, features_enabled: newFeatures }));
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Maintenance */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Manutenção</CardTitle>
          </div>
          <CardDescription>Configurações de manutenção e retenção de dados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="log_retention">Retenção de logs (dias)</Label>
              <Input
                id="log_retention"
                type="number"
                min={7}
                max={365}
                value={configs.max_api_logs_days || 30}
                onChange={(e) => setConfigs(prev => ({ ...prev, max_api_logs_days: parseInt(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground">Logs de API mais antigos serão removidos automaticamente</p>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Modo Manutenção</p>
                <p className="text-sm text-muted-foreground">Bloqueia acesso ao sistema temporariamente</p>
              </div>
              <Switch
                checked={configs.maintenance_mode === true || configs.maintenance_mode === 'true'}
                onCheckedChange={(checked) => setConfigs(prev => ({ ...prev, maintenance_mode: checked }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveAllConfigs} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Todas as Alterações'}
        </Button>
      </div>
    </div>
  );
}
