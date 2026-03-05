import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SendingScheduleManager } from "./SendingScheduleManager";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Plus, Trash2, Save, Clock, Loader2 } from "lucide-react";
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
      <SendingScheduleManager />

      <Separator />

      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Templates de Mensagens Automáticas
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Configure as mensagens enviadas automaticamente para novos leads.
          Use <code className="text-xs bg-muted px-1 py-0.5 rounded">{"{{nome}}"}</code>,
          <code className="text-xs bg-muted px-1 py-0.5 rounded ml-1">{"{{empresa}}"}</code>,
          <code className="text-xs bg-muted px-1 py-0.5 rounded ml-1">{"{{email}}"}</code>,
          <code className="text-xs bg-muted px-1 py-0.5 rounded ml-1">{"{{telefone}}"}</code> como variáveis.
        </p>
      </div>

      {/* Greeting Templates */}
      <TemplatePhaseSection
        title="Saudação"
        description="Mensagens enviadas imediatamente quando o lead entra no CRM"
        phase="greeting"
        templates={greetingTemplates}
        onSave={(t) => saveMutation.mutate(t)}
        onDelete={(id) => deleteMutation.mutate(id)}
        onAdd={() => addTemplate('greeting')}
        isSaving={saveMutation.isPending}
      />

      <Separator />

      {/* Follow-up Templates */}
      <TemplatePhaseSection
        title="Follow-up"
        description="Mensagens enviadas se o lead não responder"
        phase="followup"
        templates={followupTemplates}
        onSave={(t) => saveMutation.mutate(t)}
        onDelete={(id) => deleteMutation.mutate(id)}
        onAdd={() => addTemplate('followup')}
        isSaving={saveMutation.isPending}
      />
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
}: {
  title: string;
  description: string;
  phase: string;
  templates: Template[];
  onSave: (t: Template) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  isSaving: boolean;
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
              onSave={onSave}
              onDelete={onDelete}
              isSaving={isSaving}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateEditor({
  template,
  onSave,
  onDelete,
  isSaving,
}: {
  template: Template;
  onSave: (t: Template) => void;
  onDelete: (id: string) => void;
  isSaving: boolean;
}) {
  const [message, setMessage] = useState(template.message_template);
  const [delay, setDelay] = useState(template.delay_minutes.toString());
  const [active, setActive] = useState(template.is_active);

  const hasChanges = message !== template.message_template ||
    parseInt(delay) !== template.delay_minutes ||
    active !== template.is_active;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs">
            Etapa {template.step_position}
          </Badge>
          <div className="flex items-center gap-2">
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
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Mensagem da etapa ${template.step_position}...`}
          rows={3}
          className="text-sm"
        />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <Label className="text-xs text-muted-foreground">Delay (min):</Label>
            <Input
              type="number"
              value={delay}
              onChange={(e) => setDelay(e.target.value)}
              className="w-20 h-7 text-xs"
              min={0}
            />
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
