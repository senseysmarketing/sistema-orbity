import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SendingScheduleManager } from "./SendingScheduleManager";
import { AllowedSourcesManager } from "./AllowedSourcesManager";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Plus, Trash2, Save, Clock, Loader2, Variable } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";

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
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function useFormFieldKeys(agencyId?: string) {
  return useQuery({
    queryKey: ['whatsapp-form-fields', agencyId],
    queryFn: async () => {
      if (!agencyId) return {} as Record<string, string[]>;

      // 1) Integrations map: integration_id -> form_name
      const { data: integrations, error: intError } = await supabase
        .from('facebook_lead_integrations')
        .select('id, form_name')
        .eq('agency_id', agencyId);
      if (intError) throw intError;

      const integrationMap: Record<string, string> = {};
      for (const integration of integrations || []) {
        integrationMap[integration.id] = integration.form_name;
      }

      // 2) Sync log maps (when available)
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

        if (log.lead_id) {
          leadIdToFormMap[log.lead_id] = mappedFormName;
        }

        if (log.facebook_lead_id) {
          facebookLeadIdToFormMap[log.facebook_lead_id] = mappedFormName;
        }
      }

      // 3) Leads with custom fields from Facebook source
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id, custom_fields')
        .eq('agency_id', agencyId)
        .eq('source', 'facebook_leads')
        .not('custom_fields', 'is', null)
        .limit(300);
      if (leadsError) throw leadsError;

      // 4) Group variable keys by resolved form name
      const grouped: Record<string, Set<string>> = {};

      for (const row of leads || []) {
        const cf = row.custom_fields as Record<string, unknown> | null;
        if (!cf || typeof cf !== 'object') continue;

        const cfFormName = typeof cf.form_name === 'string' ? cf.form_name.trim() : '';
        const cfLeadgenId = typeof cf.leadgen_id === 'string' ? cf.leadgen_id.trim() : '';
        const cfRef = typeof cf.REF === 'string'
          ? cf.REF.trim()
          : typeof cf.ref === 'string'
            ? cf.ref.trim()
            : '';

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

  const greetingTemplates = templates.filter(t => t.phase === 'greeting');
  const followupTemplates = templates.filter(t => t.phase === 'followup');

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
      toast({ title: 'Limite atingido', description: `Máximo de 3 etapas por fase`, variant: 'destructive' });
      return;
    }

    const newTemplate: Template = {
      phase,
      step_position: existingCount + 1,
      message_template: '',
      delay_minutes: phase === 'greeting' ? (existingCount === 0 ? 0 : 1) : 1440,
      is_active: true,
    };

    saveMutation.mutate(newTemplate);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SendingScheduleManager />
        <AllowedSourcesManager />
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Templates de Mensagens Automáticas
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Configure as mensagens enviadas automaticamente para novos leads.
          Use o botão <Variable className="inline h-3.5 w-3.5" /> no editor para inserir variáveis disponíveis.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <TemplatePhaseSection
            title="Saudação"
            description="Mensagens enviadas imediatamente quando o lead entra no CRM"
            phase="greeting"
            templates={greetingTemplates}
            onSave={(t) => saveMutation.mutate(t)}
            onDelete={(id) => deleteMutation.mutate(id)}
            onAdd={() => addTemplate('greeting')}
            isSaving={saveMutation.isPending}
            formFields={formFields}
          />
        </Card>

        <Card className="p-4">
          <TemplatePhaseSection
            title="Follow-up"
            description="Mensagens enviadas se o lead não responder"
            phase="followup"
            templates={followupTemplates}
            onSave={(t) => saveMutation.mutate(t)}
            onDelete={(id) => deleteMutation.mutate(id)}
            onAdd={() => addTemplate('followup')}
            isSaving={saveMutation.isPending}
            formFields={formFields}
          />
        </Card>
      </div>
    </div>
  );
}

function TemplatePhaseSection({
  title,
  description,
  phase,
  templates,
  onSave,
  onDelete,
  onAdd,
  isSaving,
  formFields,
}: {
  title: string;
  description: string;
  phase: string;
  templates: Template[];
  onSave: (t: Template) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  isSaving: boolean;
  formFields: Record<string, string[]>;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {templates.length < 3 && (
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus className="mr-1 h-3 w-3" />
            Adicionar
          </Button>
        )}
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Nenhum template configurado. Clique em "Adicionar" para criar.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <TemplateEditor
              key={template.id}
              template={template}
              phase={phase}
              onSave={onSave}
              onDelete={onDelete}
              isSaving={isSaving}
              formFields={formFields}
            />
          ))}
        </div>
      )}
    </div>
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
}: {
  template: Template;
  phase: string;
  onSave: (t: Template) => void;
  onDelete: (id: string) => void;
  isSaving: boolean;
  formFields: Record<string, string[]>;
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
      // Set cursor after inserted variable
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
          <Badge variant="secondary" className="text-xs">
            Etapa {template.step_position}
          </Badge>
          <div className="flex items-center gap-2">
            <VariableInserter formFields={formFields} onInsert={handleInsertVariable} />
            <Switch
              checked={active}
              onCheckedChange={setActive}
              className="scale-75"
            />
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
          rows={3}
          className="text-sm"
        />

        <div className="flex items-center justify-between gap-3">
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

          {hasChanges && (
            <Button
              size="sm"
              onClick={() => onSave({
                ...template,
                message_template: message,
                delay_minutes: parseInt(delay) || 0,
                is_active: active,
              })}
              disabled={isSaving || !message}
            >
              <Save className="mr-1 h-3 w-3" />
              Salvar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
