import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Users,
  CheckSquare,
  Bell,
  Calendar,
  ContactRound,
  Instagram,
  TrendingUp,
  FileText,
  MessageSquareHeart,
  Trophy,
  DollarSign,
  BarChart3,
  Upload,
  ShieldCheck,
  ChevronDown,
  Briefcase,
  Megaphone,
  Settings2,
  type LucideIcon,
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

interface PermissionItem {
  key: keyof AppPermissions;
  label: string;
  description: string;
  icon: LucideIcon;
}

interface PermissionGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: PermissionItem[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: "operational",
    label: "Operacional",
    icon: Briefcase,
    items: [
      { key: "clients", label: "Clientes", description: "Carteira e detalhes de clientes.", icon: Users },
      { key: "tasks", label: "Tarefas", description: "Tarefas gerais da equipe.", icon: CheckSquare },
      { key: "reminders", label: "Lembretes", description: "Lembretes pessoais.", icon: Bell },
      { key: "agenda", label: "Agenda", description: "Reuniões e calendário.", icon: Calendar },
      { key: "crm", label: "CRM & Leads", description: "Pipeline de vendas e leads.", icon: ContactRound },
    ],
  },
  {
    id: "marketing",
    label: "Marketing & Vendas",
    icon: Megaphone,
    items: [
      { key: "social_media", label: "Social Media", description: "Planejamento e posts.", icon: Instagram },
      { key: "traffic", label: "Tráfego", description: "Campanhas e contas de anúncio.", icon: TrendingUp },
      { key: "contracts", label: "Contratos", description: "Geração e gestão de contratos.", icon: FileText },
    ],
  },
  {
    id: "admin",
    label: "Administração",
    icon: Settings2,
    items: [
      { key: "nps", label: "NPS", description: "Pesquisas de satisfação.", icon: MessageSquareHeart },
      { key: "goals", label: "Metas & Bônus", description: "PPR, scorecards e bonificações.", icon: Trophy },
      { key: "financial", label: "Administrativo (Financeiro)", description: "DRE, fluxo de caixa e despesas.", icon: DollarSign },
      { key: "reports", label: "Relatórios", description: "Relatórios analíticos.", icon: BarChart3 },
      { key: "import_data", label: "Importação", description: "Importar dados em massa.", icon: Upload },
    ],
  },
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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    operational: true,
    marketing: true,
    admin: true,
  });
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

  const setGroupAll = (group: PermissionGroup, value: boolean) => {
    const next = { ...permissions };
    for (const item of group.items) {
      next[item.key] = value;
    }
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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
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

          <Card className="border-border/60">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Acessos por categoria</Label>
                {!isCustom && (
                  <span className="text-xs text-muted-foreground">Aplicado pelo preset</span>
                )}
              </div>

              <div className="space-y-3">
                {PERMISSION_GROUPS.map(group => {
                  const GroupIcon = group.icon;
                  const total = group.items.length;
                  const active = group.items.filter(i => permissions[i.key]).length;
                  const isOpen = openGroups[group.id] ?? true;

                  return (
                    <Collapsible
                      key={group.id}
                      open={isOpen}
                      onOpenChange={(v) => setOpenGroups(prev => ({ ...prev, [group.id]: v }))}
                      className="border border-border/60 rounded-md"
                    >
                      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                        <CollapsibleTrigger className="flex items-center gap-2 flex-1 min-w-0 text-left">
                          <ChevronDown
                            className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`}
                          />
                          <GroupIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{group.label}</span>
                          <span className="text-xs text-muted-foreground ml-1">
                            {active}/{total} ativos
                          </span>
                        </CollapsibleTrigger>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => setGroupAll(group, true)}
                          >
                            Ativar tudo
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => setGroupAll(group, false)}
                          >
                            Desativar
                          </Button>
                        </div>
                      </div>

                      <CollapsibleContent>
                        <div className="border-t border-border/60 px-3 py-1">
                          {group.items.map(item => {
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
                      </CollapsibleContent>
                    </Collapsible>
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
