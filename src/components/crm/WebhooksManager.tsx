import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Copy, ExternalLink, Settings, CheckCircle2, AlertCircle, BarChart3, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LEAD_TEMPERATURES } from "@/lib/leadTemperature";

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  headers: any;
  success_count: number;
  error_count: number;
  last_triggered: string | null;
}

export function WebhooksManager() {
  const { currentAgency } = useAgency();
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [fieldMapping, setFieldMapping] = useState({
    name: 'name',
    email: 'email',
    phone: 'phone',
    company: 'company',
    position: 'position',
    source: 'source',
    notes: 'notes',
    value: 'value'
  });
  const [defaultValues, setDefaultValues] = useState({
    status: 'new',
    temperature: 'cold',
    source: 'webhook'
  });

  const webhookUrl = `https://ovookkywclrqfmtumelw.supabase.co/functions/v1/capture-lead/${currentAgency?.id}`;

  useEffect(() => {
    if (currentAgency?.id) {
      fetchWebhooks();
    }
  }, [currentAgency?.id]);

  const fetchWebhooks = async () => {
    try {
      const { data, error } = await supabase
        .from('agency_webhooks')
        .select('*')
        .eq('agency_id', currentAgency?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebhooks(data || []);

      // Load configuration for lead capture webhook
      const leadWebhook = data?.find(w => w.events.includes('lead_capture'));
      if (leadWebhook?.headers) {
        const config = leadWebhook.headers as any;
        if (config.field_mapping) {
          setFieldMapping(prev => ({ ...prev, ...config.field_mapping }));
        }
        if (config.default_values) {
          const loadedDefaults = { ...config.default_values };
          // Garantir que temperature existe (converter de priority legado se necessário)
          if (!loadedDefaults.temperature && loadedDefaults.priority) {
            loadedDefaults.temperature = loadedDefaults.priority;
          }
          // Garantir valor válido para temperature
          const validTemps = ['cold', 'warm', 'hot'];
          if (!validTemps.includes(loadedDefaults.temperature)) {
            loadedDefaults.temperature = 'cold';
          }
          setDefaultValues(prev => ({ 
            ...prev, 
            status: loadedDefaults.status || 'new',
            temperature: loadedDefaults.temperature || 'cold',
            source: loadedDefaults.source || 'webhook'
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      toast.error('Erro ao carregar webhooks');
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    try {
      // Salvar temperature como temperature (a edge function vai converter para priority)
      const config = {
        field_mapping: fieldMapping,
        default_values: {
          status: defaultValues.status,
          temperature: defaultValues.temperature,
          source: defaultValues.source
        }
      };

      // Check if lead capture webhook exists
      let leadWebhook = webhooks.find(w => w.events.includes('lead_capture'));

      if (leadWebhook) {
        // Update existing webhook
        const { error } = await supabase
          .from('agency_webhooks')
          .update({
            headers: config,
            is_active: true
          })
          .eq('id', leadWebhook.id);

        if (error) throw error;
      } else {
        // Create new webhook for lead capture
        const { error } = await supabase
          .from('agency_webhooks')
          .insert({
            agency_id: currentAgency?.id,
            name: 'Captura de Leads',
            url: webhookUrl,
            events: ['lead_capture'],
            headers: config,
            is_active: true,
            created_by: currentAgency?.id
          });

        if (error) throw error;
      }

      toast.success('Configuração salva com sucesso');
      fetchWebhooks();
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Erro ao salvar configuração');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('URL copiada para área de transferência');
  };

  const toggleWebhook = async (webhookId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('agency_webhooks')
        .update({ is_active: !isActive })
        .eq('id', webhookId);

      if (error) throw error;
      
      toast.success(isActive ? 'Webhook desativado' : 'Webhook ativado');
      fetchWebhooks();
    } catch (error) {
      console.error('Error toggling webhook:', error);
      toast.error('Erro ao alterar status do webhook');
    }
  };

  const testWebhook = async () => {
    if (!currentAgency?.id) {
      toast.error('Agência não encontrada');
      return;
    }

    try {
      // Dados de teste simples
      const testData = {
        name: 'João Silva - Teste Webhook',
        email: 'joao.teste@email.com',
        phone: '(11) 99999-9999',
        company: 'Empresa Teste Ltda',
        position: 'Diretor',
        notes: 'Lead de teste criado via botão de teste do CRM',
        value: '1500',
        source: 'teste_webhook'
      };

      toast.info('Enviando lead de teste...');

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`✅ Lead de teste criado! ID: ${result.lead_id}`);
        fetchWebhooks();
      } else {
        const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        toast.error(`❌ Erro: ${error.error || error.details || 'Falha ao criar lead'}`);
      }
    } catch (error: any) {
      console.error('Erro no teste:', error);
      toast.error(`❌ Erro de conexão: ${error.message}`);
    }
  };

  const downloadIntegrationGuide = () => {
    const guide = `# Guia de Integração - Webhook de Captura de Leads

## URL do Webhook
${webhookUrl}

## Métodos Suportados
- **POST**: Enviar dados via JSON no body da requisição
- **GET**: Enviar dados via query parameters na URL

## Campos Suportados
${Object.entries(fieldMapping).map(([field, mapping]) => `- **${field}**: ${mapping}`).join('\n')}

## Exemplos de Integração

### JavaScript (POST)
\`\`\`javascript
fetch('${webhookUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Nome do Lead',
    email: 'email@exemplo.com',
    phone: '11999999999',
    company: 'Empresa ABC',
    message: 'Mensagem do lead'
  })
});
\`\`\`

### cURL (POST)
\`\`\`bash
curl -X POST '${webhookUrl}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "name": "Nome do Lead",
    "email": "email@exemplo.com",
    "phone": "11999999999",
    "company": "Empresa ABC"
  }'
\`\`\`

### HTML Form (GET)
\`\`\`html
<form action="${webhookUrl}" method="GET">
  <input type="text" name="name" placeholder="Nome" required>
  <input type="email" name="email" placeholder="Email">
  <input type="tel" name="phone" placeholder="Telefone">
  <input type="text" name="company" placeholder="Empresa">
  <textarea name="notes" placeholder="Mensagem"></textarea>
  <button type="submit">Enviar</button>
</form>
\`\`\`

## Validações
- **Nome** é obrigatório
- **Email** deve ter formato válido (se fornecido)
- **Telefone** será automaticamente limpo (somente números e símbolos válidos)
- **Valor** será convertido para número (se fornecido)

## Resposta da API
### Sucesso (200)
\`\`\`json
{
  "success": true,
  "lead_id": "uuid-do-lead",
  "message": "Lead captured successfully"
}
\`\`\`

### Erro (400/500)
\`\`\`json
{
  "error": "Mensagem de erro"
}
\`\`\`

## Valores Padrão Aplicados
${Object.entries(defaultValues).map(([field, value]) => `- **${field}**: ${value}`).join('\n')}

---
Gerado automaticamente pelo sistema CRM
Data: ${new Date().toLocaleString('pt-BR')}
`;

    const blob = new Blob([guide], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'guia-integracao-webhook.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Guia de integração baixado com sucesso');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const leadWebhook = webhooks.find(w => w.events.includes('lead_capture'));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Webhook de Captura de Leads
          </CardTitle>
          <CardDescription>
            URL única para receber leads automaticamente de formulários externos, landing pages ou integrações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* URL do Webhook */}
          <div className="space-y-2">
            <Label>URL do Webhook</Label>
            <div className="flex gap-2">
              <Input
                value={webhookUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(webhookUrl)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Use esta URL para enviar dados via POST (JSON) ou GET (query parameters)
            </p>
          </div>

          <Separator />

          {/* Status e Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center gap-2">
                {leadWebhook?.is_active ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600">Ativo</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <span className="text-sm text-orange-600">Inativo</span>
                  </>
                )}
              </div>
            </div>
            
            {leadWebhook && (
              <>
                <div className="space-y-2">
                  <Label>Leads Capturados</Label>
                  <div className="text-2xl font-bold text-green-600">
                    {leadWebhook.success_count || 0}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Erros</Label>
                  <div className="text-2xl font-bold text-red-600">
                    {leadWebhook.error_count || 0}
                  </div>
                </div>
              </>
            )}
          </div>

          {leadWebhook?.last_triggered && (
            <div className="space-y-2">
              <Label>Última Atividade</Label>
              <p className="text-sm text-muted-foreground">
                {new Date(leadWebhook.last_triggered).toLocaleString('pt-BR')}
              </p>
            </div>
          )}

          <Separator />

          {/* Mapeamento de Campos */}
          <div className="space-y-4">
            <Label className="text-base">Mapeamento de Campos</Label>
            <p className="text-sm text-muted-foreground">
              Configure como os campos do JSON recebido serão mapeados para os campos do CRM
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(fieldMapping).map(([crmField, sourceField]) => (
                <div key={crmField} className="space-y-2">
                  <Label className="text-sm">
                    {crmField === 'name' ? 'Nome' : 
                     crmField === 'email' ? 'Email' :
                     crmField === 'phone' ? 'Telefone' :
                     crmField === 'company' ? 'Empresa' :
                     crmField === 'position' ? 'Cargo' :
                     crmField === 'source' ? 'Origem' :
                     crmField === 'notes' ? 'Observações' :
                     crmField === 'value' ? 'Valor' : crmField}
                    {crmField === 'name' && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    placeholder={`Campo JSON para ${crmField}`}
                    value={sourceField}
                    onChange={(e) => setFieldMapping(prev => ({
                      ...prev,
                      [crmField]: e.target.value
                    }))}
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Valores Padrão */}
          <div className="space-y-4">
            <Label className="text-base">Valores Padrão</Label>
            <p className="text-sm text-muted-foreground">
              Valores que serão aplicados automaticamente quando o lead for criado
            </p>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Status Padrão</Label>
                <Input
                  value={defaultValues.status}
                  onChange={(e) => setDefaultValues(prev => ({
                    ...prev,
                    status: e.target.value
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Temperatura Padrão</Label>
                <Select
                  value={defaultValues.temperature}
                  onValueChange={(value) => setDefaultValues(prev => ({
                    ...prev,
                    temperature: value
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEAD_TEMPERATURES).map(([key, temp]) => (
                      <SelectItem key={key} value={key}>
                        {temp.emoji} {temp.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Origem Padrão</Label>
                <Input
                  value={defaultValues.source}
                  onChange={(e) => setDefaultValues(prev => ({
                    ...prev,
                    source: e.target.value
                  }))}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={saveConfiguration} className="flex-1">
              Salvar Configuração
            </Button>
            {leadWebhook && (
              <Button
                variant="outline"
                onClick={() => toggleWebhook(leadWebhook.id, leadWebhook.is_active)}
              >
                {leadWebhook.is_active ? 'Desativar' : 'Ativar'}
              </Button>
            )}
            <Button variant="outline" onClick={testWebhook}>
              Testar Webhook
            </Button>
            <Button variant="outline" onClick={downloadIntegrationGuide}>
              <Download className="h-4 w-4 mr-2" />
              Guia de Integração
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Exemplo de Uso */}
      <Card>
        <CardHeader>
          <CardTitle>Exemplos de Uso</CardTitle>
          <CardDescription>
            Como enviar dados para o webhook
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="javascript">
            <TabsList>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="html">HTML Form</TabsTrigger>
            </TabsList>
            
            <TabsContent value="javascript" className="space-y-2">
              <Label>Exemplo via JavaScript (POST)</Label>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                <code>{`fetch('${webhookUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'João Silva',
    email: 'joao@email.com',
    phone: '11999999999',
    company: 'Empresa ABC',
    message: 'Interessado no produto'
  })
});`}</code>
              </pre>
            </TabsContent>
            
            <TabsContent value="curl" className="space-y-2">
              <Label>Exemplo via cURL</Label>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                <code>{`curl -X POST '${webhookUrl}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "11999999999",
    "company": "Empresa ABC"
  }'`}</code>
              </pre>
            </TabsContent>
            
            <TabsContent value="html" className="space-y-2">
              <Label>Exemplo via HTML Form (GET)</Label>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                <code>{`<form action="${webhookUrl}" method="GET">
  <input type="text" name="name" placeholder="Nome" required>
  <input type="email" name="email" placeholder="Email">
  <input type="tel" name="phone" placeholder="Telefone">
  <input type="text" name="company" placeholder="Empresa">
  <textarea name="notes" placeholder="Mensagem"></textarea>
  <button type="submit">Enviar</button>
</form>`}</code>
              </pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}