import { useState, useEffect } from "react";
import { Users, UserPlus, MoreHorizontal, Trash2, Edit, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";
import { useLimitEnforcement } from "@/hooks/useLimitEnforcement";
import { useSubscription } from "@/hooks/useSubscription";

interface AgencyUser {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles: {
    name: string;
    email: string;
    avatar_url?: string;
  };
}

export function UsersManagement() {
  const [users, setUsers] = useState<AgencyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("agency_user");
  const [inviteLoading, setInviteLoading] = useState(false);
  const { currentAgency, isAgencyAdmin } = useAgency();
  const { toast } = useToast();
  const { checkLimitWithWarning } = useLimitEnforcement();
  const { currentSubscription, createCheckout } = useSubscription();

  useEffect(() => {
    if (currentAgency && isAgencyAdmin) {
      fetchUsers();
    }
  }, [currentAgency, isAgencyAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch agency users and their profiles separately and join manually
      const { data: agencyUsersData, error: agencyUsersError } = await supabase
        .from('agency_users')
        .select('id, user_id, role, joined_at')
        .eq('agency_id', currentAgency?.id);

      if (agencyUsersError) throw agencyUsersError;

      if (!agencyUsersData || agencyUsersData.length === 0) {
        setUsers([]);
        return;
      }

      // Get user IDs
      const userIds = agencyUsersData.map(user => user.user_id);

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email, avatar_url')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const combinedData = agencyUsersData.map(user => ({
        ...user,
        profiles: profilesData?.find(profile => profile.user_id === user.user_id) || {
          name: 'Usuário',
          email: '',
          avatar_url: null
        }
      }));

      setUsers(combinedData);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar usuários",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
      case 'owner':
        return 'Proprietário';
      case 'admin':
        return 'Administrador';
      case 'member':
        return 'Membro';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'member':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const inviteUser = async () => {
    try {
      setInviteLoading(true);
      
      // Verificar se ainda há limite de usuários disponível
      const currentUserCount = users.length;
      const canAddUser = checkLimitWithWarning('users', currentUserCount + 1);
      if (!canAddUser) {
        toast({
          title: "Limite de usuários atingido",
          description: "Você atingiu o limite máximo de usuários do seu plano. Faça upgrade para adicionar mais usuários.",
          variant: "destructive",
        });
        return;
      }
      
      // Primeiro, verificar se o email já existe nos profiles
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', inviteEmail)
        .maybeSingle();

      if (existingProfile) {
        // Verificar se já é membro da agência
        const { data: existingMember } = await supabase
          .from('agency_users')
          .select('id')
          .eq('agency_id', currentAgency?.id)
          .eq('user_id', existingProfile.user_id)
          .maybeSingle();

        if (existingMember) {
          toast({
            title: "Usuário já é membro",
            description: "Este usuário já faz parte da agência.",
            variant: "destructive",
          });
          return;
        }

        // Adicionar usuário existente à agência
        const { error } = await supabase
          .from('agency_users')
          .insert({
            agency_id: currentAgency?.id,
            user_id: existingProfile.user_id,
            role: inviteRole,
          });

        if (error) throw error;

        toast({
          title: "Usuário adicionado!",
          description: `${inviteEmail} foi adicionado à agência como ${getRoleLabel(inviteRole)}.`,
        });
      } else {
        // Implementar convite por email para novos usuários
        toast({
          title: "Funcionalidade em desenvolvimento",
          description: "O convite para novos usuários será implementado em breve. Por enquanto, apenas usuários já cadastrados podem ser adicionados.",
        });
        return;
      }

      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("agency_user");
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Erro ao convidar usuário",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('agency_users')
        .update({ role: newRole })
        .eq('agency_id', currentAgency?.id)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Função atualizada!",
        description: "A função do usuário foi alterada com sucesso.",
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar função",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('agency_users')
        .delete()
        .eq('agency_id', currentAgency?.id)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Usuário removido!",
        description: "O usuário foi removido da agência.",
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Erro ao remover usuário",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!isAgencyAdmin) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Acesso Restrito</h3>
            <p className="text-muted-foreground">
              Apenas administradores podem gerenciar usuários da agência.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gerenciar Usuários
              </CardTitle>
              <CardDescription>
                Gerencie os membros da sua agência, convide novos usuários e controle permissões
                {currentSubscription && (
                  <span className="block text-sm mt-1">
                    {users.length} de {(() => {
                      const planLimits = {
                        'Free': 5,
                        'Basic': 10, 
                        'Pro': 25,
                        'Enterprise': 50
                      };
                      return planLimits[currentSubscription.plan_name as keyof typeof planLimits] || 5;
                    })()} usuários utilizados
                  </span>
                )}
              </CardDescription>
            </div>
            {(() => {
              const currentUserCount = users.length;
              const userLimitReached = !checkLimitWithWarning('users', currentUserCount + 1);
              const planLimits = {
                'Free': 5,
                'Basic': 10,
                'Pro': 25,
                'Enterprise': 50
              };
              const maxUsers = planLimits[currentSubscription?.plan_name as keyof typeof planLimits] || 5;
              
              return (
                <div className="flex flex-col gap-2">
                  <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button disabled={userLimitReached}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Convidar Usuário
                      </Button>
                    </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Convidar Novo Usuário</DialogTitle>
                  <DialogDescription>
                    Adicione um novo membro à sua agência
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="usuario@exemplo.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Função</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Membro</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={inviteUser} disabled={inviteLoading || !inviteEmail}>
                    {inviteLoading ? "Enviando..." : "Convidar"}
                  </Button>
                </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                {userLimitReached && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      Limite máximo de {maxUsers} usuários atingido
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => createCheckout('basic')} // ou mostrar modal de planos
                    >
                      Fazer Upgrade
                    </Button>
                  </div>
                )}
              </div>
              );
            })()}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando usuários...</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Membro desde</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.profiles?.avatar_url || ""} />
                          <AvatarFallback className="text-xs">
                            {getInitials(user.profiles?.name || "User")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.profiles?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.profiles?.email}</TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.joined_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Dialog>
                              <DialogTrigger className="w-full text-left">
                                <Edit className="h-4 w-4 mr-2" />
                                Alterar Função
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Alterar Função do Usuário</DialogTitle>
                                  <DialogDescription>
                                    Altere a função de {user.profiles?.name}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>Nova Função</Label>
                                    <Select 
                                      defaultValue={user.role}
                                      onValueChange={(value) => updateUserRole(user.user_id, value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="member">Membro</SelectItem>
                                        <SelectItem value="admin">Administrador</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </DropdownMenuItem>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remover Acesso
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover Usuário</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja remover {user.profiles?.name} da agência?
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => removeUser(user.user_id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {!loading && users.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Nenhum usuário encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Comece convidando membros para sua agência.
              </p>
              <Button onClick={() => setInviteDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Convidar Primeiro Usuário
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}