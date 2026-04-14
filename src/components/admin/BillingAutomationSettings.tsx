import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, Clock, AlertTriangle, ShieldAlert, Save, Loader2, Info, Mail, MessageCircle, CheckCircle2, AlertCircle, Percent } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePaymentGateway, PaymentSettings } from "@/hooks/usePaymentGateway";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { useToast } from "@/hooks/use-toast";

interface BillingAutomationSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TEMPLATE_VARS = ['{nome_cliente}', '{valor}', '{data_vencimento}', '{link_pagamento}'];

type FormData = Omit<PaymentSettings, 'id' | 'agency_id' | 'asaas_api_key' | 'asaas_sandbox' | 'asaas_enabled' | 'conexa_api_key' | 'conexa_token' | 'conexa_enabled' | 'active_gateway' | 'asaas_webhook_token' | 'conexa_webhook_token'>;

const defaultFormData: FormData = {
  reminder_before_enabled: false,
  reminder_before_days: 3,
  reminder_due_date_enabled: false,
  reminder_overdue_enabled: false,
  reminder_overdue_days: 1,
  block_access_enabled: false,
  block_access_days: 5,
  whatsapp_template_reminder: null,
  whatsapp_template_overdue: null,
  notify_via_email: true,
  notify_via_whatsapp: true,
  default_fine_percentage: 2.00,
  default_interest_percentage: 1.00,
  discount_percentage: 0.00,
  discount_days_before: 0,
  conexa_subdomain: null,
  conexa_default_product_id: null,
  conexa_company_id: null,
};

export function BillingAutomationSettings({ open, onOpenChange }: BillingAutomationSettingsProps) {
  const { settings, isAsaasActive, isConexaActive, updateSettings, isSaving } = usePaymentGateway();
  const { account, isConnected } = useWhatsApp();
  const { toast } = useToast();

  const [formData, setFormData] = useState<FormData>(defaultFormData);

  useEffect(() => {
    if (settings && settings.id) {
      setFormData({
        reminder_before_enabled: settings.reminder_before_enabled,
        reminder_before_days: settings.reminder_before_days,
        reminder_due_date_enabled: settings.reminder_due_date_enabled,
        reminder_overdue_enabled: settings.reminder_overdue_enabled,
        reminder_overdue_days: settings.reminder_overdue_days,
        block_access_enabled: settings.block_access_enabled,
        block_access_days: settings.block_access_days,
        whatsapp_template_reminder: settings.whatsapp_template_reminder,
        whatsapp_template_overdue: settings.whatsapp_template_overdue,
        notify_via_email: settings.notify_via_email,
        notify_via_whatsapp: settings.notify_via_whatsapp,
        default_fine_percentage: settings.default_fine_percentage ?? 2.00,
        default_interest_percentage: settings.default_interest_percentage ?? 1.00,
        discount_percentage: settings.discount_percentage ?? 0.00,
        discount_days_before: settings.discount_days_before ?? 0,
        conexa_subdomain: settings.conexa_subdomain ?? null,
        conexa_default_product_id: settings.conexa_default_product_id ?? null,
        conexa_company_id: settings.conexa_company_id ?? null,
      });
    }
  }, [settings]);

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      await updateSettings(formData);
      toast({ title: "Régua de cobrança salva!", description: "As configurações de automação foram atualizadas." });
      onOpenChange(false);
    } catch {
      // error handled by hook
    }
  };

  const insertVariable = (field: 'whatsapp_template_reminder' | 'whatsapp_template_overdue', variable: string) => {
    updateField(field, (formData[field] || '') + variable);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Régua de Cobrança
          </SheetTitle>
          <SheetDescription>Configure lembretes e cobranças automáticas via WhatsApp/Email</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Canais de Envio */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <Label className="font-semibold text-sm">Canais de Envio</Label>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-500" />
                  <Label className="font-medium text-sm">Notificar por E-mail</Label>
                </div>
                <Switch checked={formData.notify_via_email} onCheckedChange={v => updateField('notify_via_email', v)} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-green-500" />
                    <Label className="font-medium text-sm">Notificar por WhatsApp</Label>
                  </div>
                  <Switch checked={formData.notify_via_whatsapp} onCheckedChange={v => updateField('notify_via_whatsapp', v)} />
                </div>

                {formData.notify_via_whatsapp && (
                  isConnected ? (
                    <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-xs text-green-700 dark:text-green-300">
                        Conectado como: {account?.phone_number || 'WhatsApp da Agência'}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
                        WhatsApp desconectado. As mensagens não serão enviadas. Vá em <strong>Configurações &gt; Integrações</strong> para conectar.
                      </AlertDescription>
                    </Alert>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Event 1: Reminder before */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <Label className="font-medium">Lembrete antes do vencimento</Label>
                </div>
                <Switch checked={formData.reminder_before_enabled} onCheckedChange={v => updateField('reminder_before_enabled', v)} />
              </div>
              {formData.reminder_before_enabled && (
                <div className="flex items-center gap-2 pl-6">
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={formData.reminder_before_days}
                    onChange={e => updateField('reminder_before_days', Number(e.target.value) || 1)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">dias antes</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event 2: Due date */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-amber-500" />
                  <Label className="font-medium">Aviso no dia do vencimento</Label>
                </div>
                <Switch checked={formData.reminder_due_date_enabled} onCheckedChange={v => updateField('reminder_due_date_enabled', v)} />
              </div>
            </CardContent>
          </Card>

          {/* Event 3: Overdue */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <Label className="font-medium">Cobrança de atraso</Label>
                </div>
                <Switch checked={formData.reminder_overdue_enabled} onCheckedChange={v => updateField('reminder_overdue_enabled', v)} />
              </div>
              {formData.reminder_overdue_enabled && (
                <div className="flex items-center gap-2 pl-6">
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={formData.reminder_overdue_days}
                    onChange={e => updateField('reminder_overdue_days', Number(e.target.value) || 1)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">dia(s) após o vencimento</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event 4: Block access */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                  <Label className="font-medium">Bloqueio de acesso</Label>
                </div>
                <Switch checked={formData.block_access_enabled} onCheckedChange={v => updateField('block_access_enabled', v)} />
              </div>
              {formData.block_access_enabled && (
                <div className="flex items-center gap-2 pl-6">
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    value={formData.block_access_days}
                    onChange={e => updateField('block_access_days', Number(e.target.value) || 1)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">dias de atraso</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Gateway contextual hint */}
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 p-3">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {isAsaasActive
                ? "Gateway Asaas ativo — use a variável {link_pagamento} para incluir o link de cobrança automático."
                : isConexaActive
                ? "Gateway Conexa ativo — use a variável {link_pagamento} para incluir o link de cobrança automático."
                : "Gateway Manual ativo — inclua sua chave PIX ou dados bancários diretamente no texto do template."}
            </p>
          </div>

          {/* Template: Reminder */}
          <div className="space-y-2">
            <Label className="font-medium">Template para Lembretes (Antes/No Dia)</Label>
            <Textarea
              value={formData.whatsapp_template_reminder || ''}
              onChange={e => updateField('whatsapp_template_reminder', e.target.value || null)}
              placeholder="Olá {nome_cliente}, sua fatura no valor de {valor} vence em {data_vencimento}..."
              rows={4}
            />
            <div className="flex flex-wrap gap-1">
              {TEMPLATE_VARS.map(v => (
                <Badge
                  key={v}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 text-xs"
                  onClick={() => insertVariable('whatsapp_template_reminder', v)}
                >
                  {v}
                </Badge>
              ))}
            </div>
          </div>

          {/* Template: Overdue */}
          <div className="space-y-2">
            <Label className="font-medium">Template para Atrasos (Cobrança)</Label>
            <Textarea
              value={formData.whatsapp_template_overdue || ''}
              onChange={e => updateField('whatsapp_template_overdue', e.target.value || null)}
              placeholder="Olá {nome_cliente}, identificamos que sua fatura de {valor} está em atraso..."
              rows={4}
            />
            <div className="flex flex-wrap gap-1">
              {TEMPLATE_VARS.map(v => (
                <Badge
                  key={v}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 text-xs"
                  onClick={() => insertVariable('whatsapp_template_overdue', v)}
                >
                  {v}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Juros, Multas e Descontos */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-primary" />
                <Label className="font-semibold text-sm">Juros, Multas e Descontos</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Essas regras são enviadas ao gateway (Asaas/Conexa) na emissão da cobrança. O próprio gateway calcula os acréscimos ou descontos automaticamente.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <TooltipProvider>
                  <div className="space-y-1.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label className="text-xs cursor-help flex items-center gap-1">
                          Multa por Atraso (%)
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </Label>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px]">
                        <p className="text-xs">Multa fixa cobrada uma única vez após o vencimento.</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={formData.default_fine_percentage}
                      onChange={e => updateField('default_fine_percentage', Number(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label className="text-xs cursor-help flex items-center gap-1">
                          Juros de Mora (% ao mês)
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </Label>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px]">
                        <p className="text-xs">Juros calculados pro-rata die (por dia) sobre o valor do boleto.</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={formData.default_interest_percentage}
                      onChange={e => updateField('default_interest_percentage', Number(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label className="text-xs cursor-help flex items-center gap-1">
                          Desconto Pontualidade (%)
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </Label>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px]">
                        <p className="text-xs">Desconto aplicado se o pagamento for realizado até X dias antes do vencimento.</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.discount_percentage}
                      onChange={e => updateField('discount_percentage', Number(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label className="text-xs cursor-help flex items-center gap-1">
                          Dias limite p/ desconto
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </Label>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px]">
                        <p className="text-xs">Quantos dias antes do vencimento o desconto é válido. Ex: 0 = até o dia do vencimento.</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      max="30"
                      value={formData.discount_days_before}
                      onChange={e => updateField('discount_days_before', Number(e.target.value) || 0)}
                    />
                  </div>
                </TooltipProvider>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Régua de Cobrança
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
