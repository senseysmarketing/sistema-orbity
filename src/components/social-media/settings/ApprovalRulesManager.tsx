import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

const defaultStatuses = [
  { value: "draft", label: "Briefing" },
  { value: "in_creation", label: "Em Criação" },
  { value: "pending_approval", label: "Aguardando Aprovação" },
  { value: "approved", label: "Aprovado" },
  { value: "published", label: "Publicado" },
];

export function ApprovalRulesManager() {
  const { currentAgency } = useAgency();
  const queryClient = useQueryClient();
  const [newRule, setNewRule] = useState({
    name: "",
    from_status: "draft",
    to_status: "in_creation",
    requires_approval: true,
  });

  const { data: rules = [] } = useQuery({
    queryKey: ["approval-rules", currentAgency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_media_approval_rules")
        .select("*")
        .eq("agency_id", currentAgency?.id)
        .order("created_at");
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentAgency?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("social_media_approval_rules")
        .insert({
          agency_id: currentAgency?.id,
          ...newRule,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-rules"] });
      setNewRule({
        name: "",
        from_status: "draft",
        to_status: "in_creation",
        requires_approval: true,
      });
      toast.success("Regra criada");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("social_media_approval_rules")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-rules"] });
      toast.success("Regra excluída");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("social_media_approval_rules")
        .update({ is_active: isActive })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-rules"] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Regras de Aprovação</CardTitle>
        <CardDescription>
          Defina fluxos obrigatórios para transições de status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>Nome da Regra</Label>
            <Input
              value={newRule.name}
              onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              placeholder="Ex: Aprovação de Designer"
            />
          </div>
          <div>
            <Label>De</Label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3"
              value={newRule.from_status}
              onChange={(e) => setNewRule({ ...newRule, from_status: e.target.value })}
            >
              {defaultStatuses.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Para</Label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3"
              value={newRule.to_status}
              onChange={(e) => setNewRule({ ...newRule, to_status: e.target.value })}
            >
              {defaultStatuses.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newRule.name}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {rules.map((rule: any) => (
            <div
              key={rule.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex flex-col">
                <span className="font-medium">{rule.name}</span>
                <span className="text-xs text-muted-foreground">
                  {defaultStatuses.find(s => s.value === rule.from_status)?.label} → {defaultStatuses.find(s => s.value === rule.to_status)?.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={rule.is_active}
                  onCheckedChange={(checked) =>
                    toggleMutation.mutate({ id: rule.id, isActive: checked })
                  }
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(rule.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}