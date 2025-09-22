import { useState, useEffect } from "react";
import { User, Lock, Bell, Palette, Save, Shield, Mail, Phone, BarChart3 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    avatar_url: '',
  });
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    taskReminders: true,
    paymentAlerts: true,
    weeklyReports: false,
  });
  const [loading, setLoading] = useState(false);
  const { theme, setTheme } = useTheme();
  const { profile: userProfile, signOut } = useAuth();
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
      case 'gestor_trafego':
        return 'Gestor de Tráfego';
      case 'designer':
        return 'Designer';
      case 'administrador':
        return 'Administrador';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'administrador':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'gestor_trafego':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'designer':
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

  const updatePassword = async () => {
    try {
      // Implementar mudança de senha via Supabase
      toast({
        title: "Funcionalidade em desenvolvimento",
        description: "A alteração de senha será implementada em breve.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao alterar senha",
        description: error.message,
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
        <TabsList>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="account">Conta</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="appearance">Aparência</TabsTrigger>
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
                  <Button variant="outline" onClick={updatePassword}>
                    <Lock className="mr-2 h-4 w-4" />
                    Alterar Senha
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">Autenticação de Dois Fatores</h4>
                    <p className="text-sm text-muted-foreground">
                      Adicione uma camada extra de segurança à sua conta
                    </p>
                  </div>
                  <Switch disabled />
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

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Notificação</CardTitle>
              <CardDescription>
                Configure como você quer receber notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span className="font-medium">Notificações por Email</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Receba notificações importantes por email
                    </p>
                  </div>
                  <Switch
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, emailNotifications: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      <span className="font-medium">Lembretes de Tarefas</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Receba lembretes sobre prazos de tarefas
                    </p>
                  </div>
                  <Switch
                    checked={notifications.taskReminders}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, taskReminders: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span className="font-medium">Alertas de Pagamento</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Notificações sobre pagamentos pendentes e recebidos
                    </p>
                  </div>
                  <Switch
                    checked={notifications.paymentAlerts}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, paymentAlerts: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      <span className="font-medium">Relatórios Semanais</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Receba um resumo semanal das atividades
                    </p>
                  </div>
                  <Switch
                    checked={notifications.weeklyReports}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, weeklyReports: checked }))
                    }
                  />
                </div>
              </div>

              <Button className="w-full sm:w-auto">
                <Save className="mr-2 h-4 w-4" />
                Salvar Preferências
              </Button>
            </CardContent>
          </Card>
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
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setTheme('light')}
                      className={`p-3 border rounded-lg text-center hover:bg-muted/50 transition-colors ${
                        theme === 'light' ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <div className="w-full h-8 bg-white border rounded mb-2"></div>
                      <span className="text-sm">Claro</span>
                    </button>
                    
                    <button
                      onClick={() => setTheme('dark')}
                      className={`p-3 border rounded-lg text-center hover:bg-muted/50 transition-colors ${
                        theme === 'dark' ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <div className="w-full h-8 bg-gray-800 border rounded mb-2"></div>
                      <span className="text-sm">Escuro</span>
                    </button>
                    
                    <button
                      onClick={() => setTheme('system')}
                      className={`p-3 border rounded-lg text-center hover:bg-muted/50 transition-colors ${
                        theme === 'system' ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <div className="w-full h-8 bg-gradient-to-r from-white to-gray-800 border rounded mb-2"></div>
                      <span className="text-sm">Sistema</span>
                    </button>
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