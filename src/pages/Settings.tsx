import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { User, Lock, Bell, Palette, Save, Shield, CreditCard, Users, Puzzle, Trash2, Sparkles, Wand2, Building2, Cog, Receipt, type LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { UsersManagement, CreateUserButton } from "@/components/admin/UsersManagement";
import { NotificationSummaryCard } from "@/components/notifications/NotificationSummaryCard";
import { NotificationChannelsConfig } from "@/components/notifications/NotificationChannelsConfig";
import { GoogleCalendarIntegration } from "@/components/settings/GoogleCalendarIntegration";
import { WhatsAppIntegration } from "@/components/settings/WhatsAppIntegration";
import { AISettingsManager } from "@/components/settings/AISettingsManager";
import { AsaasIntegration } from "@/components/settings/AsaasIntegration";
import { ConexaIntegration } from "@/components/settings/ConexaIntegration";
import { StripeIntegration } from "@/components/settings/StripeIntegration";
import { FacebookIntegration } from "@/components/settings/FacebookIntegration";
import { BrandingTab } from "@/components/settings/BrandingTab";

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
  const isAdmin = isAgencyAdmin();
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

  type MacroTab = "account" | "agency" | "ops" | "billing";
  const VALID_TABS: MacroTab[] = ["account", "agency", "ops", "billing"];
  const ADMIN_TABS: MacroTab[] = ["agency", "ops", "billing"];

  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab") as MacroTab | null;
  const tab: MacroTab = (() => {
    if (!rawTab || !VALID_TABS.includes(rawTab)) return "account";
    if (ADMIN_TABS.includes(rawTab) && !isAdmin) return "account";
    return rawTab;
  })();

  // Security fallback: if URL points at admin tab but user isn't admin, normalize URL
  useEffect(() => {
    if (rawTab && (!VALID_TABS.includes(rawTab) || (ADMIN_TABS.includes(rawTab) && !isAdmin))) {
      const next = new URLSearchParams(searchParams);
      next.set("tab", "account");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawTab, isAdmin]);

  const setTab = (next: MacroTab) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: false });
  };

  const navItems: { key: MacroTab; label: string; icon: LucideIcon; adminOnly?: boolean }[] = ([
    { key: "account" as MacroTab, label: "Minha Conta", icon: User },
    { key: "agency" as MacroTab, label: "Minha Agência", icon: Building2, adminOnly: true },
    { key: "ops" as MacroTab, label: "Operação & IA", icon: Cog, adminOnly: true },
    { key: "billing" as MacroTab, label: "Faturamento", icon: Receipt, adminOnly: true },
  ]).filter((i) => !i.adminOnly || isAdmin);

  const SectionHeading = ({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description?: string }) => (
    <div className="space-y-1">
      <h3 className="text-lg font-medium flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </h3>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas preferências e configurações da conta
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Mobile: horizontal scrollable nav */}
        <nav className="flex md:hidden flex-row gap-2 overflow-x-auto whitespace-nowrap -mx-1 px-1 pb-2 scrollbar-hide">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors border ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Desktop: vertical sidebar */}
        <nav className="hidden md:flex md:flex-col md:w-64 shrink-0 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-left transition-colors ${
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Content area */}
        <div className="flex-1 min-w-0 space-y-8">
          {tab === "account" && (
            <>
              {/* Perfil */}
              <section className="space-y-4">
                <SectionHeading icon={User} title="Perfil" description="Atualize suas informações pessoais" />
                <Card>
                  <CardContent className="space-y-6 pt-6">
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
              </section>

              <Separator className="my-8" />

              {/* Conta / Segurança */}
              <section className="space-y-4">
                <SectionHeading icon={Shield} title="Conta e Segurança" description="Gerencie a segurança e acesso da sua conta" />
                <Card>
                  <CardContent className="space-y-4 pt-6">
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
                  </CardContent>
                </Card>
              </section>

              <Separator className="my-8" />

              {/* Notificações */}
              <section className="space-y-4">
                <SectionHeading icon={Bell} title="Notificações" description="Gerencie como e quando você recebe notificações" />
                <NotificationSummaryCard />
              </section>

              <Separator className="my-8" />

              {/* Aparência */}
              <section className="space-y-4">
                <SectionHeading icon={Palette} title="Aparência" description="Personalize a aparência do sistema" />
                <Card>
                  <CardContent className="space-y-6 pt-6">
                    <div>
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
                  </CardContent>
                </Card>
              </section>

              <Separator className="my-8" />

              {/* Integrações Pessoais (Google Calendar) */}
              <section className="space-y-4">
                <SectionHeading icon={Puzzle} title="Integrações Pessoais" description="Conecte ferramentas vinculadas à sua conta individual" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GoogleCalendarIntegration />
                </div>
              </section>
            </>
          )}

          {tab === "agency" && isAdmin && (
            <>
              <section className="space-y-4">
                <SectionHeading icon={Wand2} title="Branding e Identidade" description="Personalize a marca exibida nas páginas públicas" />
                <BrandingTab />
              </section>

              <Separator className="my-8" />

              <section className="space-y-4">
                <SectionHeading icon={Users} title="Usuários da Agência" description="Gerencie os membros da sua equipe e suas permissões" />
                <UsersTabContent />
              </section>
            </>
          )}

          {tab === "ops" && isAdmin && (
            <>
              <section className="space-y-4">
                <SectionHeading icon={Puzzle} title="Marketing e Tráfego" description="Gerencie suas conexões de anúncios e tráfego pago" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FacebookIntegration />
                </div>
              </section>

              <Separator className="my-8" />

              <section className="space-y-4">
                <SectionHeading icon={Bell} title="Comunicação" description="Canais de comunicação com clientes e leads" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <WhatsAppIntegration />
                </div>
              </section>

              <Separator className="my-8" />

              <section className="space-y-4">
                <SectionHeading icon={CreditCard} title="Gateways de Pagamento" description="Configure cobranças automatizadas para seus clientes" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AsaasIntegration />
                  <ConexaIntegration />
                  <StripeIntegration />
                </div>
              </section>

              <Separator className="my-8" />

              <section className="space-y-4">
                <SectionHeading icon={Bell} title="Notificações da Agência" description="Configure os canais globais de notificação" />
                <Card>
                  <CardContent className="pt-6">
                    <NotificationChannelsConfig />
                  </CardContent>
                </Card>
              </section>

              <Separator className="my-8" />

              <section className="space-y-4">
                <SectionHeading icon={Sparkles} title="Inteligência Artificial" description="Personalize prompts e comportamentos da IA" />
                <AISettingsManager />
              </section>
            </>
          )}

          {tab === "billing" && isAdmin && (
            <section className="space-y-4">
              <SectionHeading icon={CreditCard} title="Assinatura e Faturamento" description="Visualize e gerencie seu plano Orbity" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SubscriptionDetails />
                <BillingHistory />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function UsersTabContent() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" />
            Gerenciar Usuários
          </h2>
          <p className="text-muted-foreground">
            Gerencie os membros da sua agência e suas permissões
          </p>
        </div>
        <CreateUserButton onCreated={() => setRefreshKey((k) => k + 1)} />
      </div>
      <UsersManagement key={refreshKey} showCreateButton={false} />
    </div>
  );
}