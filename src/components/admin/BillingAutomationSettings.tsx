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
import { Bell, Clock, AlertTriangle, ShieldAlert, Save, Loader2, Info } from "lucide-react";
import { usePaymentGateway } from "@/hooks/usePaymentGateway";
import { useToast } from "@/hooks/use-toast";

interface BillingAutomationSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TEMPLATE_VARS = ['{nome_cliente}', '{valor}', '{data_vencimento}', '{link_pagamento}'];

export function BillingAutomationSettings({ open, onOpenChange }: BillingAutomationSettingsProps) {
  const { settings, isAsaasActive, updateSettings, isSaving } = usePaymentGateway();
  const { toast } = useToast();

  const [reminderBeforeEnabled, setReminderBeforeEnabled] = useState(false);
  const [reminderBeforeDays, setReminderBeforeDays] = useState(3);
  const [reminderDueDateEnabled, setReminderDueDateEnabled] = useState(false);
  const [reminderOverdueEnabled, setReminderOverdueEnabled] = useState(false);
  const [reminderOverdueDays, setReminderOverdueDays] = useState(1);
  const [blockAccessEnabled, setBlockAccessEnabled] = useState(false);
  const [blockAccessDays, setBlockAccessDays] = useState(5);
  const [templateReminder, setTemplateReminder] = useState("");
  const [templateOverdue, setTemplateOverdue] = useState("");

  useEffect(() => {
    if (settings) {
      setReminderBeforeEnabled(settings.reminder_before_enabled);
      setReminderBeforeDays(settings.reminder_before_days);
      setReminderDueDateEnabled(settings.reminder_due_date_enabled);
      setReminderOverdueEnabled(settings.reminder_overdue_enabled);
      setReminderOverdueDays(settings.reminder_overdue_days);
      setBlockAccessEnabled(settings.block_access_enabled);
      setBlockAccessDays(settings.block_access_days);
      setTemplateReminder(settings.whatsapp_template_reminder || "");
      setTemplateOverdue(settings.whatsapp_template_overdue || "");
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings({
        reminder_before_enabled: reminderBeforeEnabled,
        reminder_before_days: reminderBeforeDays,
        reminder_due_date_enabled: reminderDueDateEnabled,
        reminder_overdue_enabled: reminderOverdueEnabled,
        reminder_overdue_days: reminderOverdueDays,
        block_access_enabled: blockAccessEnabled,
        block_access_days: blockAccessDays,
        whatsapp_template_reminder: templateReminder || null,
        whatsapp_template_overdue: templateOverdue || null,
      });
      toast({ title: "Régua de cobrança salva!", description: "As configurações de automação foram atualizadas." });
      onOpenChange(false);
    } catch {
      // error handled by hook
    }
  };

  const insertVariable = (setter: React.Dispatch<React.SetStateAction<string>>, variable: string) => {
    setter(prev => prev + variable);
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
          {/* Event 1: Reminder before */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <Label className="font-medium">Lembrete antes do vencimento</Label>
                </div>
                <Switch checked={reminderBeforeEnabled} onCheckedChange={setReminderBeforeEnabled} />
              </div>
              {reminderBeforeEnabled && (
                <div className="flex items-center gap-2 pl-6">
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={reminderBeforeDays}
                    onChange={e => setReminderBeforeDays(Number(e.target.value) || 1)}
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
                <Switch checked={reminderDueDateEnabled} onCheckedChange={setReminderDueDateEnabled} />
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
                <Switch checked={reminderOverdueEnabled} onCheckedChange={setReminderOverdueEnabled} />
              </div>
              {reminderOverdueEnabled && (
                <div className="flex items-center gap-2 pl-6">
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={reminderOverdueDays}
                    onChange={e => setReminderOverdueDays(Number(e.target.value) || 1)}
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
                <Switch checked={blockAccessEnabled} onCheckedChange={setBlockAccessEnabled} />
              </div>
              {blockAccessEnabled && (
                <div className="flex items-center gap-2 pl-6">
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    value={blockAccessDays}
                    onChange={e => setBlockAccessDays(Number(e.target.value) || 1)}
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
                : "Gateway Manual ativo — inclua sua chave PIX ou dados bancários diretamente no texto do template."}
            </p>
          </div>

          {/* Template: Reminder */}
          <div className="space-y-2">
            <Label className="font-medium">Template para Lembretes (Antes/No Dia)</Label>
            <Textarea
              value={templateReminder}
              onChange={e => setTemplateReminder(e.target.value)}
              placeholder="Olá {nome_cliente}, sua fatura no valor de {valor} vence em {data_vencimento}..."
              rows={4}
            />
            <div className="flex flex-wrap gap-1">
              {TEMPLATE_VARS.map(v => (
                <Badge
                  key={v}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 text-xs"
                  onClick={() => insertVariable(setTemplateReminder, v)}
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
              value={templateOverdue}
              onChange={e => setTemplateOverdue(e.target.value)}
              placeholder="Olá {nome_cliente}, identificamos que sua fatura de {valor} está em atraso..."
              rows={4}
            />
            <div className="flex flex-wrap gap-1">
              {TEMPLATE_VARS.map(v => (
                <Badge
                  key={v}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 text-xs"
                  onClick={() => insertVariable(setTemplateOverdue, v)}
                >
                  {v}
                </Badge>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Régua de Cobrança
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
