import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ContactRound,
  CheckSquare,
  Calendar,
  Instagram,
  TrendingUp,
  DollarSign,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAgency } from "@/hooks/useAgency";
import {
  AppPermissions,
  DEFAULT_PERMISSIONS,
  ROLE_PRESETS,
  detectPresetFromPermissions,
} from "@/lib/rolePresets";

interface RolePermissionsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  userEmail: string;
  currentPermissions: AppPermissions | null;
  currentCustomRole: string | null;
  onSaved?: () => void;
}

const PERMISSION_ITEMS: Array<{
  key: keyof AppPermissions;
  label: string;
  description: string;
  icon: typeof ContactRound;
}> = [
  { key: "crm", label: "CRM & Leads", description: "Pipeline de vendas, leads e clientes.", icon: ContactRound },
  { key: "tasks", label: "Tarefas", description: "Tarefas gerais da equipe.", icon: CheckSquare },
  { key: "agenda", label: "Agenda", description: "Reuniões e calendário.", icon: Calendar },
  { key: "social_media", label: "Social Media", description: "Planejamento e posts.", icon: Instagram },
  { key: "traffic", label: "Tráfego", description: "Campanhas e contas de anúncio.", icon: TrendingUp },
  { key: "financial", label: "Financeiro", description: "Faturamento, despesas e metas.", icon: DollarSign },
];

export function RolePermissionsManager({
  open,
  onOpenChange,
  userId,
  userName,
  userEmail,
  currentPermissions,
  currentCustomRole,
  onSaved,
}: RolePermissionsManagerProps) {
  const { toast } = useToast();
  const { currentAgency } = useAgency();
  const queryClient = useQueryClient();
  const [permissions, setPermissions] = useState<AppPermissions>(currentPermissions ?? DEFAULT_PERMISSIONS);
  const [presetId, setPresetId] = useState<string>("Personalizado");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const initial = currentPermissions ?? DEFAULT_PERMISSIONS;
      setPermissions(initial);
      setPresetId(currentCustomRole && ROLE_PRESETS.some(p => p.id === currentCustomRole)
        ? currentCustomRole
        : detectPresetFromPermissions(initial));
    }
  }, [open, currentPermissions, currentCustomRole]);

  const isCustom = useMemo(() => presetId === "Personalizado", [presetId]);

  const handlePresetChange = (value: string) => {
    setPresetId(value);
    const preset = ROLE_PRESETS.find(p => p.id === value);
    if (preset && !preset.isCustom) {
      setPermissions({ ...preset.permissions });
    }
  };

  const togglePermission = (key: keyof AppPermissions, value: boolean) => {
    const next = { ...permissions, [key]: value };
    setPermissions(next);
    setPresetId(detectPresetFromPermissions(next));
  };

  const handleSave = async () => {
    if (!currentAgency?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("agency_users")
        .update({
          custom_role: presetId,
          app_permissions: permissions as any,
        })
        .eq("user_id", userId)
        .eq("agency_id", currentAgency.id);
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["app-permissions", userId, currentAgency.id] });

      toast({
        title: "Permissões atualizadas",
        description: `Cargo e acessos de ${userName} foram salvos.`,
      });
      onSaved?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar permissões",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Permissões de Acesso
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{userName}</span>
            <span className="text-muted-foreground"> · {userEmail}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Cargo</Label>
            <Select value={presetId} onValueChange={handlePresetChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_PRESETS.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <span>{p.emoji}</span>
                      <span>{p.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {ROLE_PRESETS.find(p => p.id === presetId)?.description}
            </p>
          </div>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Acessos do App</Label>
                {!isCustom && (
                  <span className="text-xs text-muted-foreground">Aplicado pelo preset</span>
                )}
              </div>
              <div className="space-y-1">
                {PERMISSION_ITEMS.map(item => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between gap-3 py-2.5 border-b border-border/40 last:border-0"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight">{item.label}</p>
                          <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={permissions[item.key]}
                        onCheckedChange={v => togglePermission(item.key, v)}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar permissões"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
