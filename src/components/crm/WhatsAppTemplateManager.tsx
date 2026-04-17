import { useState, useRef, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SendingScheduleManager } from "./SendingScheduleManager";
import { AllowedSourcesManager } from "./AllowedSourcesManager";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import {
  MessageSquare, Plus, Trash2, Save, Clock, Loader2, Variable,
  Pause, Shield, Send, CheckCheck, Smartphone, Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { cn } from "@/lib/utils";

interface Template {
  id?: string;
  phase: string;
  step_position: number;
  message_template: string;
  delay_minutes: number;
  is_active: boolean;
}

const STANDARD_FIELDS = [
  'full_name', 'email', 'phone_number', 'city', 'state',
  'country', 'zip_code', 'street_address', 'job_title',
  'company_name', 'date_of_birth', 'gender', 'marital_status',
  'military_status', 'work_email', 'work_phone_number',
];

const META_SYSTEM_FIELDS = [
  'form_name', 'form_id', 'page_name', 'page_id',
  'ad_id', 'adset_id', 'campaign_id', 'platform',
  'leadgen_id', 'sync_method', 'REF', 'ref',
];

const FIXED_VARIABLES = [
  { key: '{{nome}}', label: 'Nome' },
  { key: '{{empresa}}', label: 'Empresa' },
  { key: '{{email}}', label: 'Email' },
  { key: '{{telefone}}', label: 'Telefone' },
];

const GREETING_DELAY_OPTIONS = [
  { value: '0', label: 'Imediato' },
  { value: '1', label: '1 minuto' },
  { value: '5', label: '5 minutos' },
  { value: '10', label: '10 minutos' },
];

const FOLLOWUP_DELAY_OPTIONS = [
  { value: '60', label: '1 hora' },
  { value: '120', label: '2 horas' },
  { value: '360', label: '6 horas' },
  { value: '720', label: '12 horas' },
  { value: '1440', label: '24 horas' },
  { value: '2880', label: '48 horas' },
  { value: '4320', label: '72 horas' },
];

function formatFieldName(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDelay(min: number): string {
  if (!min || min === 0) return "Imediato";
  if (min < 60) return `${min} min`;
  if (min < 1440) {
    const h = min / 60;
    return `${h % 1 === 0 ? h : h.toFixed(1)}h`;
  }
  const d = min / 1440;
  return `${d % 1 === 0 ? d : d.toFixed(1)}d`;
}

/**
 * Renderiza o preview do template substituindo:
 *  1) Variáveis {{nome}}, {{empresa}}, {{email}}, {{telefone}}, {{formulario:campo}}
 *  2) Spintax {opção1|opção2} → primeira opção
 * A ordem garante que `{{...}}` é processado antes do regex de spintax `{...}`.
 */
function renderPreview(text: string): string {
  let out = text
    .replace(/\{\{nome\}\}/g, "Gabriel")
    .replace(/\{\{empresa\}\}/g, "Senseys")
    .replace(/\{\{email\}\}/g, "gabriel@senseys.com.br")
    .replace(/\{\{telefone\}\}/g, "(11) 99999-9999")
    .replace(/\{\{formulario:([^}]+)\}\}/g, (_, k: string) => `[${k.replace(/_/g, " ")}]`);

  // Spintax: {a|b|c} → a (apenas substrings sem chaves duplas internas)
  out = out.replace(/\{([^{}]+)\}/g, (_, opts: string) => opts.split('|')[0].trim());

  return out;
}

function useFormFieldKeys(agencyId?: string) {
  return useQuery({
    queryKey: ['whatsapp-form-fields', agencyId],
    queryFn: async () => {
      if (!agencyId) return {} as Record<string, string[]>;

      const { data: integrations, error: intError } = await supabase
        .from('facebook_lead_integrations')
        .select('id, form_name')
        .eq('agency_id', agencyId);
      if (intError) throw intError;

      const integrationMap: Record<string, string> = {};
      for (const integration of integrations || []) {
        integrationMap[integration.id] = integration.form_name;
      }

      const { data: syncLogs, error: syncError } = await supabase
        .from('facebook_lead_sync_log')
        .select('lead_id, integration_id, facebook_lead_id')
        .eq('agency_id', agencyId);
      if (syncError) throw syncError;

      const leadIdToFormMap: Record<string, string> = {};
      const facebookLeadIdToFormMap: Record<string, string> = {};

      for (const log of syncLogs || []) {
        const mappedFormName = integrationMap[log.integration_id];
        if (!mappedFormName) continue;
        if (log.lead_id) leadIdToFormMap[log.lead_id] = mappedFormName;
        if (log.facebook_lead_id) facebookLeadIdToFormMap[log.facebook_lead_id] = mappedFormName;
      }

      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id, custom_fields')
        .eq('agency_id', agencyId)
        .eq('source', 'facebook_leads')
        .not('custom_fields', 'is', null)
        .limit(300);
      if (leadsError) throw leadsError;

      const grouped: Record<string, Set<string>> = {};

      for (const row of leads || []) {
        const cf = row.custom_fields as Record<string, unknown> | null;
        if (!cf || typeof cf !== 'object') continue;

        const cfFormName = typeof cf.form_name === 'string' ? cf.form_name.trim() : '';
        const cfLeadgenId = typeof cf.leadgen_id === 'string' ? cf.leadgen_id.trim() : '';
        const cfRef = typeof cf.REF === 'string'
          ? cf.REF.trim()
          : typeof cf.ref === 'string' ? cf.ref.trim() : '';

        const resolvedFormName =
          leadIdToFormMap[row.id] ||
          (cfLeadgenId ? facebookLeadIdToFormMap[cfLeadgenId] : undefined) ||
          (cfFormName || undefined) ||
          (cfRef || undefined) ||
          'Outros';

        if (!grouped[resolvedFormName]) grouped[resolvedFormName] = new Set();

        for (const key of Object.keys(cf)) {
          if (!STANDARD_FIELDS.includes(key) && !META_SYSTEM_FIELDS.includes(key)) {
            grouped[resolvedFormName].add(key);
          }
        }
      }

      const result: Record<string, string[]> = {};
      for (const [name, keys] of Object.entries(grouped)) {
        result[name] = Array.from(keys).sort();
      }
      return result;
    },
    enabled: !!agencyId,
    staleTime: 60_000,
  });
}

export function WhatsAppTemplateManager() {
  const { currentAgency } = useAgency();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { account, isConnected, sendMessage } = useWhatsApp('general');

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['whatsapp-templates', currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      const { data, error } = await supabase
        .from('whatsapp_message_templates')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .order('phase')
        .order('step_position');
      if (error) throw error;
      return data as Template[];
    },
    enabled: !!currentAgency?.id,
  });

  const { data: formFields = {} } = useFormFieldKeys(currentAgency?.id);

  const greetingTemplates = useMemo(
    () => templates.filter(t => t.phase === 'greeting').sort((a, b) => a.step_position - b.step_position),
    [templates],
  );
  const followupTemplates = useMemo(
    () => templates.filter(t => t.phase === 'followup').sort((a, b) => a.step_position - b.step_position),
    [templates],
  );

  const saveMutation = useMutation({
    mutationFn: async (template: Template) => {
      if (template.id) {
        const { error } = await supabase
          .from('whatsapp_message_templates')
          .update({
            message_template: template.message_template,
            delay_minutes: template.delay_minutes,
            is_active: template.is_active,
          })
          .eq('id', template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('whatsapp_message_templates')
          .insert({
            agency_id: currentAgency?.id,
            phase: template.phase,
            step_position: template.step_position,
            message_template: template.message_template,
            delay_minutes: template.delay_minutes,
            is_active: template.is_active,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast({ title: 'Template salvo!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('whatsapp_message_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast({ title: 'Template removido' });
    },
  });

  const addTemplate = (phase: string) => {
    const existingCount = templates.filter(t => t.phase === phase).length;
    if (existingCount >= 3) {
      toast({ title: 'Limite atingido', description: 'Máximo de 3 etapas por fase', variant: 'destructive' });
      return;
    }
    saveMutation.mutate({
      phase,
      step_position: existingCount + 1,
      message_template: '',
      delay_minutes: phase === 'greeting' ? (existingCount === 0 ? 0 : 1) : 1440,
      is_active: true,
    });
  };

  const handleSendTest = async (content: string) => {
    if (!isConnected || !account?.phone_number) {
      toast({
        title: 'WhatsApp não conectado',
        description: 'Conecte uma instância do WhatsApp antes de enviar testes.',
        variant: 'destructive',
      });
      return;
    }
    if (!content.trim()) {
      toast({ title: 'Mensagem vazia', variant: 'destructive' });
      return;
    }
    try {
      const rendered = renderPreview(content);
      await sendMessage.mutateAsync({
        phone_number: account.phone_number,
        message: `🧪 [TESTE] ${rendered}`,
      });
      toast({
        title: 'Teste enviado!',
        description: `Mensagem enviada para ${account.phone_number}`,
      });
    } catch {
      // Erro já tratado pelo hook sendMessage (toast destrutivo)
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Cadência de Mensagens
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure o fluxo de mensagens automáticas. Veja em tempo real como cada mensagem ficará no telemóvel do lead.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="gap-1.5">
            <Pause className="h-3 w-3" /> Pausa automática em caso de resposta
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <Shield className="h-3 w-3" /> Escudo Anti-Bot ativo
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="greeting" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="greeting">Saudação</TabsTrigger>
          <TabsTrigger value="followup">Follow-up</TabsTrigger>
        </TabsList>

        <TabsContent value="greeting" className="mt-4">
          <PhaseFlow
            phase="greeting"
            templates={greetingTemplates}
            onSave={(t) => saveMutation.mutate(t)}
            onDelete={(id) => deleteMutation.mutate(id)}
            onAdd={() => addTemplate('greeting')}
            isSaving={saveMutation.isPending}
            formFields={formFields}
            onSendTest={handleSendTest}
            isSendingTest={sendMessage.isPending}
            canSendTest={isConnected}
          />
        </TabsContent>

        <TabsContent value="followup" className="mt-4">
          <PhaseFlow
            phase="followup"
            templates={followupTemplates}
            onSave={(t) => saveMutation.mutate(t)}
            onDelete={(id) => deleteMutation.mutate(id)}
            onAdd={() => addTemplate('followup')}
            isSaving={saveMutation.isPending}
            formFields={formFields}
            onSendTest={handleSendTest}
            isSendingTest={sendMessage.isPending}
            canSendTest={isConnected}
          />
        </TabsContent>
      </Tabs>

      <Accordion type="single" collapsible className="border rounded-lg">
        <AccordionItem value="global-config" className="border-0">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Settings className="h-4 w-4" />
              Configurações Globais de Disparo
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-6">
            <SendingScheduleManager />
            <Separator />
            <AllowedSourcesManager />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function PhaseFlow({
  phase,
  templates,
  onSave,
  onDelete,
  onAdd,
  isSaving,
  formFields,
  onSendTest,
  isSendingTest,
  canSendTest,
}: {
  phase: string;
  templates: Template[];
  onSave: (t: Template) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  isSaving: boolean;
  formFields: Record<string, string[]>;
  onSendTest: (content: string) => void;
  isSendingTest: boolean;
  canSendTest: boolean;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Auto-selecionar primeiro template quando lista muda
  useEffect(() => {
    if (templates.length === 0) {
      setActiveId(null);
      return;
    }
    if (!activeId || !templates.find(t => t.id === activeId)) {
      setActiveId(templates[0].id ?? null);
    }
  }, [templates, activeId]);

  const activeTemplate = templates.find(t => t.id === activeId) ?? null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Coluna 1 — Timeline */}
      <div className="lg:col-span-4">
        <Card className="h-full">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold">Fluxo</h4>
              {templates.length < 3 && (
                <Button variant="ghost" size="sm" onClick={onAdd} className="h-7 text-xs">
                  <Plus className="mr-1 h-3 w-3" />
                  Etapa
                </Button>
              )}
            </div>

            {templates.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma etapa configurada
                </p>
                <Button variant="outline" size="sm" onClick={onAdd}>
                  <Plus className="mr-1 h-3 w-3" />
                  Adicionar primeira etapa
                </Button>
              </div>
            ) : (
              <ScrollArea className="max-h-[600px] pr-2">
                <div className="space-y-0">
                  {templates.map((t, i) => (
                    <div key={t.id ?? `new-${i}`}>
                      <TimelineNode
                        template={t}
                        index={i}
                        active={activeId === t.id}
                        onClick={() => t.id && setActiveId(t.id)}
                      />
                      {i < templates.length - 1 && (
                        <TimelineConnector delay={templates[i + 1].delay_minutes} />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coluna 2 — Editor + Preview */}
      <div className="lg:col-span-8 space-y-4">
        {activeTemplate ? (
          <>
            <TemplateEditor
              key={activeTemplate.id}
              template={activeTemplate}
              phase={phase}
              onSave={onSave}
              onDelete={onDelete}
              isSaving={isSaving}
              formFields={formFields}
              onSendTest={onSendTest}
              isSendingTest={isSendingTest}
              canSendTest={canSendTest}
            />
            <WhatsAppPreview content={activeTemplate.message_template} />
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Selecione uma etapa do fluxo para editar.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function TimelineNode({
  template,
  index,
  active,
  onClick,
}: {
  template: Template;
  index: number;
  active: boolean;
  onClick: () => void;
}) {
  const preview = template.message_template.trim()
    ? renderPreview(template.message_template).slice(0, 60)
    : 'Mensagem vazia';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 text-left rounded-lg p-2 transition-colors",
        active ? "bg-accent" : "hover:bg-muted/50",
      )}
    >
      <div className="relative flex flex-col items-center pt-0.5">
        <div
          className={cn(
            "h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors",
            active
              ? "bg-primary text-primary-foreground border-primary"
              : template.is_active
                ? "bg-background border-primary/40 text-primary"
                : "bg-muted border-muted-foreground/30 text-muted-foreground",
          )}
        >
          {index + 1}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">Etapa {template.step_position}</span>
          {!template.is_active && (
            <Badge variant="outline" className="text-[10px] h-4 px-1">Inativa</Badge>
          )}
        </div>
        <p className={cn(
          "text-xs truncate mt-0.5",
          template.message_template.trim() ? "text-muted-foreground" : "text-muted-foreground/50 italic",
        )}>
          {preview}
        </p>
      </div>
    </button>
  );
}

function TimelineConnector({ delay }: { delay: number }) {
  return (
    <div className="relative flex items-center justify-start py-2 ml-[19px]">
      <div className="absolute inset-y-0 left-0 border-l-2 border-dashed border-muted" />
      <Badge variant="outline" className="bg-background relative z-10 text-[10px] gap-1 ml-3 h-5 px-1.5">
        <Clock className="h-2.5 w-2.5" />
        Aguardar {formatDelay(delay)}
      </Badge>
    </div>
  );
}

function WhatsAppPreview({ content }: { content: string }) {
  const rendered = content.trim() ? renderPreview(content) : '';
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');

  return (
    <Card>
      <CardContent className="p-0 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30">
          <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Live Preview</span>
        </div>

        <div className="bg-muted/30 p-4 min-h-[200px]">
          {/* Header do contato */}
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">G</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium leading-tight">Gabriel</p>
              <p className="text-[10px] text-muted-foreground leading-tight">online</p>
            </div>
          </div>

          {/* Balão */}
          {rendered ? (
            <div className="flex justify-end">
              <div className="max-w-[85%] flex flex-col items-end">
                <div className="bg-[#dcf8c6] dark:bg-[#005c4b] text-foreground dark:text-white rounded-2xl rounded-tr-sm px-3 py-2 shadow-sm">
                  <p className="text-sm whitespace-pre-wrap break-words">{rendered}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[10px] opacity-60">{hh}:{mm}</span>
                    <CheckCheck className="h-3 w-3 text-blue-500" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <p className="text-xs text-muted-foreground italic">
                Digite uma mensagem para ver o preview
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function VariableInserter({
  formFields,
  onInsert,
}: {
  formFields: Record<string, string[]>;
  onInsert: (variable: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const formNames = Object.keys(formFields).sort();

  const handleInsert = (variable: string) => {
    onInsert(variable);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Inserir variável">
          <Variable className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2 max-h-80 overflow-y-auto" align="start">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground px-1">Variáveis fixas</p>
          <div className="flex flex-wrap gap-1">
            {FIXED_VARIABLES.map((v) => (
              <Badge
                key={v.key}
                variant="secondary"
                className="cursor-pointer text-xs hover:bg-accent"
                onClick={() => handleInsert(v.key)}
              >
                {v.label}
              </Badge>
            ))}
          </div>

          {formNames.map((formName) => (
            <div key={formName}>
              <Separator className="my-1" />
              <p className="text-xs font-semibold text-muted-foreground px-1 flex items-center gap-1">
                📋 {formName}
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {(Array.isArray(formFields[formName]) ? formFields[formName] : Array.from(formFields[formName] || [])).map((field: string) => (
                  <Badge
                    key={`${formName}-${field}`}
                    variant="outline"
                    className="cursor-pointer text-xs hover:bg-accent"
                    onClick={() => handleInsert(`{{formulario:${field}}}`)}
                  >
                    {formatFieldName(field)}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TemplateEditor({
  template,
  phase,
  onSave,
  onDelete,
  isSaving,
  formFields,
  onSendTest,
  isSendingTest,
  canSendTest,
}: {
  template: Template;
  phase: string;
  onSave: (t: Template) => void;
  onDelete: (id: string) => void;
  isSaving: boolean;
  formFields: Record<string, string[]>;
  onSendTest: (content: string) => void;
  isSendingTest: boolean;
  canSendTest: boolean;
}) {
  const [message, setMessage] = useState(template.message_template);
  const [delay, setDelay] = useState(template.delay_minutes.toString());
  const [active, setActive] = useState(template.is_active);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasChanges = message !== template.message_template ||
    parseInt(delay) !== template.delay_minutes ||
    active !== template.is_active;

  const handleInsertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMessage = message.slice(0, start) + variable + message.slice(end);
      setMessage(newMessage);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    } else {
      setMessage(message + variable);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Etapa {template.step_position}
            </Badge>
            <Badge variant="outline" className="text-xs gap-1">
              <Clock className="h-3 w-3" />
              {formatDelay(template.delay_minutes)}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <VariableInserter formFields={formFields} onInsert={handleInsertVariable} />
            <Switch checked={active} onCheckedChange={setActive} className="scale-75" />
            {template.id && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={() => onDelete(template.id!)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Mensagem da etapa ${template.step_position}...`}
          rows={5}
          className="text-sm"
        />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <Label className="text-xs text-muted-foreground">Delay:</Label>
            <Select value={delay} onValueChange={setDelay}>
              <SelectTrigger className="w-36 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(phase === 'greeting' ? GREETING_DELAY_OPTIONS : FOLLOWUP_DELAY_OPTIONS).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSendTest(message)}
              disabled={isSendingTest || !message.trim() || !canSendTest}
              title={!canSendTest ? 'Conecte o WhatsApp para enviar testes' : undefined}
            >
              {isSendingTest ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Send className="mr-1 h-3 w-3" />
              )}
              Enviar teste
            </Button>

            <Button
              size="sm"
              onClick={() => onSave({
                ...template,
                message_template: message,
                delay_minutes: parseInt(delay) || 0,
                is_active: active,
              })}
              disabled={isSaving || !message || !hasChanges}
            >
              <Save className="mr-1 h-3 w-3" />
              Salvar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
