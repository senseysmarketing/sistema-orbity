import { useState, useEffect } from "react";
import { User, Lock, Bell, Palette, Save, Shield, CreditCard, Users, Puzzle, Trash2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/components/ui/theme-provider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";

import { SubscriptionDetails } from "@/components/subscription/SubscriptionDetails";
import { BillingHistory } from "@/components/subscription/BillingHistory";
import { UsersManagement } from "@/components/admin/UsersManagement";
import { NotificationSummaryCard } from "@/components/notifications/NotificationSummaryCard";
import { NotificationChannelsConfig } from "@/components/notifications/NotificationChannelsConfig";
import { GoogleCalendarIntegration } from "@/components/settings/GoogleCalendarIntegration";
import { WhatsAppIntegration } from "@/components/settings/WhatsAppIntegration";
import { AISettingsManager } from "@/components/settings/AISettingsManager";
import { AsaasIntegration } from "@/components/settings/AsaasIntegration";
import { ConexaIntegration } from "@/components/settings/ConexaIntegration";

export default function Settings() {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    avatar_url: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  
  const { theme, setTheme } = useTheme();
  const { profile: userProfile, signOut } = useAuth();
  const { isAgencyAdmin } = useAgency();
  const { toast } = useToast();

  useEffect(() => {
    if (userProfile) {
      setProfile({
        name: userProfile.name,
        email: userProfile.email,
        avatar_url: userProfile.avatar_url || '',
      });
    }
  }, [userProfile]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'agency_admin':
        return 'Administrador';
      case 'agency_user':
        return 'Usuário';
      case 'super_admin':
        return 'Super Admin';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'agency_admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'agency_user':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'super_admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const updateProfile = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          name: profile.name,
          avatar_url: profile.avatar_url,
        })
        .eq('user_id', userProfile?.user_id);

      if (error) throw error;

      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const { currentAgency } = useAgency();

  const updatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha a nova senha e a confirmação.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "A nova senha e a confirmação devem ser iguais.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUpdatingPassword(true);
      
      const { data, error } = await supabase.functions.invoke('update-user-password', {
        body: {
          target_user_id: userProfile?.user_id,
          new_password: newPassword,
          agency_id: currentAgency?.id,
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Senha alterada!",
        description: "Sua senha foi atualizada com sucesso.",
      });

      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordDialog(false);
    } catch (error: any) {
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleCacheReset = async () => {
    try {
      // 1. Desregistrar todos os Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log('[Settings] Desregistrando', registrations.length, 'Service Workers');
        await Promise.all(registrations.map(r => r.unregister()));
      }
      
      // 2. Limpar todos os caches do navegador
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log('[Settings] Limpando caches:', cacheNames);
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // 3. Preservar apenas autenticação no localStorage
      const authKey = 'sb-ovookkywclrqfmtumelw-auth-token';
      const authData = localStorage.getItem(authKey);
      
      // Limpar localStorage exceto auth
      const keysToPreserve = [authKey];
      Object.keys(localStorage).forEach(key => {
        if (!keysToPreserve.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      
      // Restaurar auth se existia
      if (authData) {
        localStorage.setItem(authKey, authData);
      }
      
      toast({
        title: "Cache limpo!",
        description: "A página será recarregada em instantes...",
      });
      
      // Recarregar após pequeno delay para mostrar o toast
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('[Settings] Erro ao limpar cache:', error);
      toast({
        title: "Erro ao limpar cache",
        description: "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas preferências e configurações da conta
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="flex w-full overflow-x-auto scrollbar-hide md:grid md:grid-cols-8">
          <TabsTrigger value="profile" className="flex-shrink-0 gap-1 md:gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex-shrink-0 gap-1 md:gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Assinatura</span>
          </TabsTrigger>
          {isAgencyAdmin && (
            <TabsTrigger value="users" className="flex-shrink-0 gap-1 md:gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Usuários</span>
            </TabsTrigger>
          )}
          {isAgencyAdmin && (
            <TabsTrigger value="ai" className="flex-shrink-0 gap-1 md:gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">IA</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="integrations" className="flex-shrink-0 gap-1 md:gap-2">
            <Puzzle className="h-4 w-4" />
            <span className="hidden sm:inline">Integrações</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex-shrink-0 gap-1 md:gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Conta</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex-shrink-0 gap-1 md:gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notificações</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex-shrink-0 gap-1 md:gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Aparência</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
              <CardDescription>
                Atualize suas informações pessoais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar e Role */}
              <div className="flex items-center space-x-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {getInitials(profile.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">{profile.name}</h3>
                  <Badge className={getRoleColor(userProfile?.role || '')}>
                    {getRoleLabel(userProfile?.role || '')}
                  </Badge>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                </div>
              </div>

              <Separator />

              {/* Formulário de edição */}
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    O email não pode ser alterado. Entre em contato com o administrador se necessário.
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="avatar">URL da Foto de Perfil</Label>
                  <Input
                    id="avatar"
                    type="url"
                    placeholder="https://exemplo.com/sua-foto.jpg"
                    value={profile.avatar_url}
                    onChange={(e) => setProfile(prev => ({ ...prev, avatar_url: e.target.value }))}
                  />
                </div>
              </div>

              <Button onClick={updateProfile} disabled={loading} className="w-full sm:w-auto">
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <CreditCard className="h-6 w-6" />
              Gerenciar Assinatura
            </h2>
            <p className="text-muted-foreground">
              Visualize e gerencie seu plano de assinatura atual
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SubscriptionDetails />
            <BillingHistory />
          </div>
        </TabsContent>

        {isAgencyAdmin && (
          <TabsContent value="users" className="space-y-4">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  Gerenciar Usuários
                </h2>
                <p className="text-muted-foreground">
                  Gerencie os membros da sua agência e suas permissões
                </p>
              </div>
              <UsersManagement />
            </div>
          </TabsContent>
        )}

        {isAgencyAdmin && (
          <TabsContent value="ai" className="space-y-4">
            <AISettingsManager />
          </TabsContent>
        )}

        <TabsContent value="integrations" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Puzzle className="h-6 w-6" />
              Integrações
            </h2>
            <p className="text-muted-foreground">
              Conecte serviços externos para expandir as funcionalidades
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GoogleCalendarIntegration />
            <WhatsAppIntegration />
            {isAgencyAdmin && <AsaasIntegration />}
            {isAgencyAdmin && <ConexaIntegration />}
          </div>
        </TabsContent>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Segurança da Conta</CardTitle>
              <CardDescription>
                Gerencie a segurança e acesso da sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">Alterar Senha</h4>
                    <p className="text-sm text-muted-foreground">
                      Atualize sua senha para manter sua conta segura
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setShowPasswordDialog(true)}>
                    <Lock className="mr-2 h-4 w-4" />
                    Alterar Senha
                  </Button>
                </div>

                {/* Dialog de Alteração de Senha */}
                <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Alterar Senha</DialogTitle>
                      <DialogDescription>
                        Digite sua nova senha. Ela deve ter pelo menos 6 caracteres.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-password">Nova Senha</Label>
                        <Input
                          id="new-password"
                          type="password"
                          placeholder="Digite a nova senha"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirmar Senha</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="Confirme a nova senha"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={updatePassword} disabled={updatingPassword}>
                        {updatingPassword ? 'Salvando...' : 'Alterar Senha'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">Autenticação de Dois Fatores</h4>
                    <p className="text-sm text-muted-foreground">
                      Adicione uma camada extra de segurança à sua conta
                    </p>
                  </div>
                  <Switch disabled />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
                  <div className="space-y-1">
                    <h4 className="font-medium text-orange-800 dark:text-orange-200">Limpar Cache do Aplicativo</h4>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      Resolve problemas de refresh automático e dados desatualizados
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleCacheReset} className="border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/50">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Limpar Cache
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                  <div className="space-y-1">
                    <h4 className="font-medium text-red-800 dark:text-red-200">Sair da Conta</h4>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Desconecte-se da sua conta em todos os dispositivos
                    </p>
                  </div>
                  <Button variant="destructive" onClick={signOut}>
                    <Shield className="mr-2 h-4 w-4" />
                    Sair
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationSummaryCard />

          {isAgencyAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Configurações da Agência (Admin)</CardTitle>
                <CardDescription>
                  Configure as integrações de notificação para toda a agência
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NotificationChannelsConfig />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
              <CardDescription>
                Personalize a aparência do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Tema
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Escolha o tema que será aplicado em todo o sistema, incluindo o menu lateral.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setTheme('light')}
                      className={`p-4 border rounded-lg text-center hover:bg-muted/50 transition-all duration-200 ${
                        theme === 'light' ? 'border-primary bg-primary/10 ring-2 ring-primary/20' : 'border-border'
                      }`}
                    >
                      <div className="w-full h-12 bg-background border border-border rounded mb-3 flex items-center justify-center">
                        <div className="w-2 h-2 bg-foreground rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium">Claro</span>
                      <p className="text-xs text-muted-foreground mt-1">Tema claro para uso diurno</p>
                    </button>
                    
                    <button
                      onClick={() => setTheme('dark')}
                      className={`p-4 border rounded-lg text-center hover:bg-muted/50 transition-all duration-200 ${
                        theme === 'dark' ? 'border-primary bg-primary/10 ring-2 ring-primary/20' : 'border-border'
                      }`}
                    >
                      <div className="w-full h-12 bg-slate-800 border border-slate-600 rounded mb-3 flex items-center justify-center">
                        <div className="w-2 h-2 bg-slate-100 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium">Escuro</span>
                      <p className="text-xs text-muted-foreground mt-1">Tema escuro para baixa luminosidade</p>
                    </button>
                    
                    <button
                      onClick={() => setTheme('system')}
                      className={`p-4 border rounded-lg text-center hover:bg-muted/50 transition-all duration-200 ${
                        theme === 'system' ? 'border-primary bg-primary/10 ring-2 ring-primary/20' : 'border-border'
                      }`}
                    >
                      <div className="w-full h-12 bg-gradient-to-r from-background via-muted to-slate-800 border border-border rounded mb-3 flex items-center justify-center">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium">Sistema</span>
                      <p className="text-xs text-muted-foreground mt-1">Segue configuração do sistema</p>
                    </button>
                  </div>
                  
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Tema atual:</strong> {theme === 'light' ? 'Claro' : theme === 'dark' ? 'Escuro' : 'Sistema'} 
                      {theme === 'system' && ` (${window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Escuro' : 'Claro'} detectado)`}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="text-sm text-muted-foreground">
                  <p>Mais opções de personalização serão adicionadas em futuras atualizações.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}