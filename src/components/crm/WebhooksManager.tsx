import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Copy, ExternalLink, CheckCircle2, AlertCircle, Download, ChevronDown, Code2, TestTube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLeadStatuses } from "@/hooks/useLeadStatuses";
import { normalizeLeadStatusToDb } from "@/lib/crm/leadStatus";

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

// Map display names to db status slugs
const STATUS_SLUG_MAP: Record<string, string> = {
  'Leads': 'leads',
  'Em contato': 'em_contato',
  'Qualificados': 'qualified',
  'Agendamentos': 'scheduled',
  'Reuniões': 'meeting',
  'Propostas': 'proposal',
  'Vendas': 'won',
};

export function WebhooksManager() {
  const { currentAgency } = useAgency();
  const { statuses: pipelineStatuses } = useLeadStatuses();
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [defaultValues, setDefaultValues] = useState({
    status: 'leads',
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

      const leadWebhook = data?.find(w => w.events.includes('lead_capture'));
      if (leadWebhook?.headers) {
        const config = leadWebhook.headers as any;
        if (config.default_values) {
          setDefaultValues(prev => ({
            ...prev,
            status: config.default_values.status || 'leads',
            source: config.default_values.source || 'webhook'
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
      const config = {
        default_values: {
          status: defaultValues.status,
          source: defaultValues.source
        }
      };

      let leadWebhook = webhooks.find(w => w.events.includes('lead_capture'));

      if (leadWebhook) {
        const { error } = await supabase
          .from('agency_webhooks')
          .update({ headers: config, is_active: true })
          .eq('id', leadWebhook.id);
        if (error) throw error;
      } else {
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
    toast.success('Copiado!');
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
    if (!currentAgency?.id) return;
    try {
      toast.info('Enviando lead de teste...');
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'João Silva - Teste Webhook',
          email: 'joao.teste@email.com',
          phone: '(11) 99999-9999',
          company: 'Empresa Teste Ltda',
          notes: 'Lead de teste criado via botão de teste do CRM',
          value: '1500',
          source: 'teste_webhook'
        })
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
      toast.error(`❌ Erro de conexão: ${error.message}`);
    }
  };

  const downloadIntegrationGuide = () => {
    const guide = `# Guia de Integração - Webhook de Captura de Leads

## URL do Webhook
${webhookUrl}

## Métodos Suportados
- **POST**: JSON no body da requisição
- **GET**: Query parameters na URL

## Campos Aceitos
- **name** (obrigatório): Nome do lead
- **email**: Email
- **phone**: Telefone
- **company**: Empresa
- **position**: Cargo
- **source**: Origem
- **notes**: Observações
- **value**: Valor estimado

> Campos adicionais serão salvos automaticamente como campos customizados e usados na qualificação automática.

## Exemplos

### JavaScript (POST)
\`\`\`javascript
fetch('${webhookUrl}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Nome do Lead',
    email: 'email@exemplo.com',
    phone: '11999999999',
    company: 'Empresa ABC'
  })
});
\`\`\`

### cURL
\`\`\`bash
curl -X POST '${webhookUrl}' \\
  -H 'Content-Type: application/json' \\
  -d '{"name":"Nome do Lead","email":"email@exemplo.com","phone":"11999999999"}'
\`\`\`

## Resposta
### Sucesso (200)
\`\`\`json
{ "success": true, "lead_id": "uuid", "message": "Lead captured successfully" }
\`\`\`

---
Gerado em ${new Date().toLocaleString('pt-BR')}
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
    toast.success('Guia baixado');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const leadWebhook = webhooks.find(w => w.events.includes('lead_capture'));

  // Build status options from pipeline statuses
  const statusOptions = pipelineStatuses
    .filter(s => s.name !== 'Perdido' && s.name !== 'Lost')
    .map(s => ({
      label: s.name,
      value: STATUS_SLUG_MAP[s.name] || normalizeLeadStatusToDb(s.name),
    }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ExternalLink className="h-5 w-5" />
            Webhook de Captura de Leads
          </CardTitle>
          <CardDescription>
            Receba leads automaticamente de formulários externos, landing pages ou integrações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* URL */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">URL do Webhook</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Aceita POST (JSON, form-urlencoded) e GET (query params). Campos extras são salvos e usados na qualificação automática.
            </p>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-1.5">
              {leadWebhook?.is_active ? (
                <><CheckCircle2 className="h-4 w-4 text-green-500" /><span className="text-green-600">Ativo</span></>
              ) : (
                <><AlertCircle className="h-4 w-4 text-orange-500" /><span className="text-orange-600">Inativo</span></>
              )}
            </div>
            {leadWebhook && (
              <>
                <div className="text-muted-foreground">
                  <span className="font-semibold text-green-600">{leadWebhook.success_count || 0}</span> capturados
                </div>
                <div className="text-muted-foreground">
                  <span className="font-semibold text-red-600">{leadWebhook.error_count || 0}</span> erros
                </div>
                {leadWebhook.last_triggered && (
                  <div className="text-muted-foreground text-xs">
                    Último: {new Date(leadWebhook.last_triggered).toLocaleString('pt-BR')}
                  </div>
                )}
              </>
            )}
          </div>

          <Separator />

          {/* Default values */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Configurações Padrão</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Etapa inicial do pipeline</Label>
                <Select
                  value={defaultValues.status}
                  onValueChange={(value) => setDefaultValues(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Origem padrão</Label>
                <Input
                  value={defaultValues.source}
                  onChange={(e) => setDefaultValues(prev => ({ ...prev, source: e.target.value }))}
                  placeholder="webhook"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={saveConfiguration} size="sm">
              Salvar Configuração
            </Button>
            {leadWebhook && (
              <Button variant="outline" size="sm" onClick={() => toggleWebhook(leadWebhook.id, leadWebhook.is_active)}>
                {leadWebhook.is_active ? 'Desativar' : 'Ativar'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={testWebhook}>
              <TestTube className="h-4 w-4 mr-1.5" />
              Testar
            </Button>
            <Button variant="outline" size="sm" onClick={downloadIntegrationGuide}>
              <Download className="h-4 w-4 mr-1.5" />
              Guia
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Collapsible code examples */}
      <Collapsible open={examplesOpen} onOpenChange={setExamplesOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Code2 className="h-4 w-4" />
                  Exemplos de Integração
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${examplesOpen ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <Tabs defaultValue="javascript">
                <TabsList className="h-8">
                  <TabsTrigger value="javascript" className="text-xs px-2 py-1">JavaScript</TabsTrigger>
                  <TabsTrigger value="curl" className="text-xs px-2 py-1">cURL</TabsTrigger>
                  <TabsTrigger value="html" className="text-xs px-2 py-1">HTML Form</TabsTrigger>
                </TabsList>

                <TabsContent value="javascript">
                  <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                    <code>{`fetch('${webhookUrl}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    // ── Campos padrão (mapeados automaticamente) ──
    name: 'João Silva',           // obrigatório
    email: 'joao@email.com',
    phone: '11999999999',
    company: 'Empresa ABC',
    position: 'Diretor',
    value: 5000,                  // valor estimado do lead
    notes: 'Interessado no plano Pro',

    // ── Campos customizados (usados na qualificação) ──
    // Qualquer campo extra vira pergunta de qualificação
    qual_seu_faturamento: 'Acima de R$50.000',
    quantos_funcionarios: '11 a 50',
    segmento: 'Tecnologia',
    como_conheceu: 'Google',
    tem_site: 'Sim'
  })
});`}</code>
                  </pre>
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Campos extras além de name/email/phone/company/position/value/notes são salvos como <strong>campos customizados</strong> e aparecem na aba de Qualificação.
                  </p>
                </TabsContent>

                <TabsContent value="curl">
                  <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                    <code>{`curl -X POST '${webhookUrl}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "11999999999",
    "company": "Empresa ABC",
    "qual_seu_faturamento": "Acima de R$50.000",
    "quantos_funcionarios": "11 a 50",
    "segmento": "Tecnologia"
  }'`}</code>
                  </pre>
                </TabsContent>

                <TabsContent value="html">
                  <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                    <code>{`<form action="${webhookUrl}" method="GET">
  <!-- Campos padrão -->
  <input type="text" name="name" placeholder="Nome" required>
  <input type="email" name="email" placeholder="Email">
  <input type="tel" name="phone" placeholder="Telefone">
  <input type="text" name="company" placeholder="Empresa">

  <!-- Campos de qualificação (customize!) -->
  <select name="qual_seu_faturamento">
    <option value="">Qual seu faturamento?</option>
    <option value="Até R$10.000">Até R$10.000</option>
    <option value="R$10.000 a R$50.000">R$10.000 a R$50.000</option>
    <option value="Acima de R$50.000">Acima de R$50.000</option>
  </select>

  <select name="segmento">
    <option value="">Segmento</option>
    <option value="Tecnologia">Tecnologia</option>
    <option value="Saúde">Saúde</option>
    <option value="Educação">Educação</option>
  </select>

  <button type="submit">Enviar</button>
</form>`}</code>
                  </pre>
                </TabsContent>
              </Tabs>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
