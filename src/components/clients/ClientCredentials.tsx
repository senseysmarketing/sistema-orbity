import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Key, Eye, EyeOff, Copy, ExternalLink, Pencil, Trash2, Globe, Instagram, Facebook, Mail, Server, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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

export function ClientCredentials({ clientId }: ClientCredentialsProps) {
  const queryClient = useQueryClient();
  const { currentAgency } = useAgency();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("client_credentials").insert({
        client_id: clientId,
        agency_id: currentAgency?.id,
        created_by: user?.id,
        ...data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-credentials", clientId] });
      queryClient.invalidateQueries({ queryKey: ["client-stats", clientId] });
      toast.success("Acesso cadastrado com sucesso!");
      resetForm();
    },
    onError: () => toast.error("Erro ao cadastrar acesso"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("client_credentials")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
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
      updateMutation.mutate({ id: editingCredential.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
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
                                  onClick={() => copyToClipboard(credential.username, "Usuário")}
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
                                  onClick={() =>
                                    setShowPasswords((p) => ({ ...p, [credential.id]: !p[credential.id] }))
                                  }
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
                                  onClick={() => copyToClipboard(credential.password, "Senha")}
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
