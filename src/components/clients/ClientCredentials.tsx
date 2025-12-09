import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Plus, Key, Eye, EyeOff, Copy, ExternalLink, Pencil, Trash2, Globe, Instagram, Facebook, Mail, Server, MoreHorizontal, History, Clock } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClientCredentialsProps {
  clientId: string;
}

const CATEGORIES = [
  { value: "social", label: "Redes Sociais", icon: Instagram },
  { value: "hosting", label: "Hospedagem", icon: Server },
  { value: "email", label: "E-mail", icon: Mail },
  { value: "analytics", label: "Analytics", icon: Globe },
  { value: "ads", label: "Anúncios", icon: Facebook },
  { value: "other", label: "Outros", icon: Key },
];

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  created: { label: "Criado", color: "bg-green-500" },
  updated: { label: "Atualizado", color: "bg-blue-500" },
  password_viewed: { label: "Senha visualizada", color: "bg-yellow-500" },
  password_copied: { label: "Senha copiada", color: "bg-orange-500" },
  username_copied: { label: "Usuário copiado", color: "bg-purple-500" },
};

export function ClientCredentials({ clientId }: ClientCredentialsProps) {
  const queryClient = useQueryClient();
  const { currentAgency } = useAgency();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedCredentialId, setSelectedCredentialId] = useState<string | null>(null);
  const [editingCredential, setEditingCredential] = useState<any>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    platform: "",
    username: "",
    password: "",
    url: "",
    notes: "",
    category: "other",
  });

  const { data: credentials, isLoading } = useQuery({
    queryKey: ["client-credentials", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_credentials")
        .select("*")
        .eq("client_id", clientId)
        .order("platform");
      if (error) throw error;
      return data;
    },
  });

  const { data: credentialHistory } = useQuery({
    queryKey: ["credential-history", selectedCredentialId],
    queryFn: async () => {
      if (!selectedCredentialId) return [];
      const { data: historyData, error } = await supabase
        .from("client_credential_history")
        .select("*")
        .eq("credential_id", selectedCredentialId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      // Fetch profile names for each history entry
      const userIds = [...new Set(historyData?.map(h => h.changed_by) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.name]) || []);
      
      return historyData?.map(h => ({
        ...h,
        user_name: profileMap.get(h.changed_by) || "Usuário"
      })) || [];
    },
    enabled: !!selectedCredentialId,
  });

  const logHistoryMutation = useMutation({
    mutationFn: async ({ credentialId, action, changedFields }: { credentialId: string; action: string; changedFields?: Record<string, any> }) => {
      const { error } = await supabase.from("client_credential_history").insert({
        credential_id: credentialId,
        client_id: clientId,
        agency_id: currentAgency?.id,
        action,
        changed_fields: changedFields || {},
        changed_by: user?.id,
      });
      if (error) throw error;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: newCredential, error } = await supabase.from("client_credentials").insert({
        client_id: clientId,
        agency_id: currentAgency?.id,
        created_by: user?.id,
        ...data,
      }).select().single();
      if (error) throw error;
      return newCredential;
    },
    onSuccess: (newCredential) => {
      logHistoryMutation.mutate({ 
        credentialId: newCredential.id, 
        action: "created",
        changedFields: { platform: newCredential.platform }
      });
      queryClient.invalidateQueries({ queryKey: ["client-credentials", clientId] });
      queryClient.invalidateQueries({ queryKey: ["client-stats", clientId] });
      toast.success("Acesso cadastrado com sucesso!");
      resetForm();
    },
    onError: () => toast.error("Erro ao cadastrar acesso"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, oldData }: { id: string; data: typeof formData; oldData: any }) => {
      const { error } = await supabase
        .from("client_credentials")
        .update(data)
        .eq("id", id);
      if (error) throw error;
      return { id, data, oldData };
    },
    onSuccess: ({ id, data, oldData }) => {
      const changedFields: Record<string, { old: any; new: any }> = {};
      Object.keys(data).forEach((key) => {
        if (data[key as keyof typeof data] !== oldData[key]) {
          changedFields[key] = {
            old: key === "password" ? "***" : oldData[key],
            new: key === "password" ? "***" : data[key as keyof typeof data],
          };
        }
      });
      if (Object.keys(changedFields).length > 0) {
        logHistoryMutation.mutate({ credentialId: id, action: "updated", changedFields });
      }
      queryClient.invalidateQueries({ queryKey: ["client-credentials", clientId] });
      toast.success("Acesso atualizado!");
      resetForm();
    },
    onError: () => toast.error("Erro ao atualizar acesso"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_credentials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-credentials", clientId] });
      queryClient.invalidateQueries({ queryKey: ["client-stats", clientId] });
      toast.success("Acesso removido!");
    },
    onError: () => toast.error("Erro ao remover acesso"),
  });

  const resetForm = () => {
    setFormData({ platform: "", username: "", password: "", url: "", notes: "", category: "other" });
    setEditingCredential(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (credential: any) => {
    setFormData({
      platform: credential.platform,
      username: credential.username || "",
      password: credential.password || "",
      url: credential.url || "",
      notes: credential.notes || "",
      category: credential.category || "other",
    });
    setEditingCredential(credential);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCredential) {
      updateMutation.mutate({ id: editingCredential.id, data: formData, oldData: editingCredential });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleViewHistory = (credentialId: string) => {
    setSelectedCredentialId(credentialId);
    setHistoryDialogOpen(true);
  };

  const togglePasswordVisibility = (credentialId: string, credential: any) => {
    const newState = !showPasswords[credentialId];
    setShowPasswords((p) => ({ ...p, [credentialId]: newState }));
    if (newState) {
      logHistoryMutation.mutate({ credentialId, action: "password_viewed" });
    }
  };

  const copyToClipboard = (text: string, label: string, credentialId?: string, type?: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
    if (credentialId && type) {
      logHistoryMutation.mutate({ 
        credentialId, 
        action: type === "password" ? "password_copied" : "username_copied" 
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat?.icon || Key;
  };

  const groupedCredentials = credentials?.reduce((acc, cred) => {
    const cat = cred.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(cred);
    return acc;
  }, {} as Record<string, typeof credentials>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Acessos e Credenciais</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os acessos de plataformas do cliente
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Acesso
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCredential ? "Editar Acesso" : "Novo Acesso"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plataforma *</Label>
                  <Input
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    placeholder="Ex: Instagram, Google Ads"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Usuário/E-mail</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Usuário ou e-mail de acesso"
                />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Senha de acesso"
                />
              </div>
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Informações adicionais..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingCredential ? "Salvar" : "Cadastrar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Ações
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {credentialHistory && credentialHistory.length > 0 ? (
              <div className="space-y-3">
                {credentialHistory.map((entry: any) => (
                  <div key={entry.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <div className={`h-2 w-2 rounded-full mt-2 ${ACTION_LABELS[entry.action]?.color || "bg-gray-500"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">
                          {ACTION_LABELS[entry.action]?.label || entry.action}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(entry.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        por {entry.user_name || "Usuário"}
                      </p>
                      {entry.changed_fields && Object.keys(entry.changed_fields).length > 0 && entry.action === "updated" && (
                        <div className="mt-2 text-xs space-y-1">
                          {Object.entries(entry.changed_fields).map(([field, values]: [string, any]) => (
                            <div key={field} className="text-muted-foreground">
                              <span className="font-medium">{field}:</span>{" "}
                              <span className="line-through">{values.old || "(vazio)"}</span>{" → "}
                              <span className="text-foreground">{values.new || "(vazio)"}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum histórico registrado</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-32" />
            </Card>
          ))}
        </div>
      ) : !credentials?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Nenhum acesso cadastrado</h3>
            <p className="text-muted-foreground text-center">
              Cadastre os acessos das plataformas do cliente
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedCredentials || {}).map(([category, creds]) => {
            const categoryData = CATEGORIES.find((c) => c.value === category);
            const CategoryIcon = categoryData?.icon || Key;
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-medium">{categoryData?.label || "Outros"}</h4>
                  <Badge variant="secondary">{creds?.length}</Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {creds?.map((credential) => (
                    <Card key={credential.id} className="group">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                              <CategoryIcon className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-medium">{credential.platform}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100"
                              onClick={() => handleViewHistory(credential.id)}
                              title="Ver histórico"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(credential)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewHistory(credential.id)}>
                                  <History className="h-4 w-4 mr-2" />
                                  Histórico
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => deleteMutation.mutate(credential.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remover
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          {credential.username && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Usuário:</span>
                              <div className="flex items-center gap-1">
                                <span className="font-mono">{credential.username}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard(credential.username, "Usuário", credential.id, "username")}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                          {credential.password && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Senha:</span>
                              <div className="flex items-center gap-1">
                                <span className="font-mono">
                                  {showPasswords[credential.id] ? credential.password : "••••••••"}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => togglePasswordVisibility(credential.id, credential)}
                                >
                                  {showPasswords[credential.id] ? (
                                    <EyeOff className="h-3 w-3" />
                                  ) : (
                                    <Eye className="h-3 w-3" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard(credential.password, "Senha", credential.id, "password")}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                          {credential.url && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">URL:</span>
                              <a
                                href={credential.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-primary hover:underline"
                              >
                                Acessar
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                        </div>

                        {credential.notes && (
                          <p className="mt-3 text-xs text-muted-foreground border-t pt-2">
                            {credential.notes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}