import { useState, useEffect } from "react";
import { Users, UserPlus, MoreHorizontal, Trash2, Edit, Mail, Key, ShieldCheck } from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { RolePermissionsManager } from "./RolePermissionsManager";
import { AppPermissions } from "@/lib/rolePresets";


interface AgencyUser {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  custom_role?: string | null;
  app_permissions?: AppPermissions | null;
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
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [permissionsTarget, setPermissionsTarget] = useState<AgencyUser | null>(null);
  const [roleDialogUser, setRoleDialogUser] = useState<AgencyUser | null>(null);
  const { currentAgency, isAgencyAdmin } = useAgency();
  const { user: currentAuthUser } = useAuth();
  const { toast } = useToast();
  

  useEffect(() => {
    if (currentAgency && isAgencyAdmin()) {
      fetchUsers();
    }
  }, [currentAgency]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch agency users and their profiles separately and join manually
      const { data: agencyUsersData, error: agencyUsersError } = await supabase
        .from('agency_users')
        .select('id, user_id, role, joined_at, custom_role, app_permissions')
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

      setUsers(combinedData as unknown as AgencyUser[]);
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
      
      // Criar usuário usando edge function
      const trimmedEmail = inviteEmail.trim().toLowerCase();
      const trimmedPassword = invitePassword.trim();
      const trimmedName = inviteName.trim();
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: trimmedEmail,
          password: trimmedPassword,
          role: inviteRole,
          agency_id: currentAgency?.id,
          name: trimmedName || null
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Usuário criado!",
        description: `${inviteEmail} foi criado e adicionado à agência como ${getRoleLabel(inviteRole)}.`,
      });

      setInviteDialogOpen(false);
      setInviteName("");
      setInviteEmail("");
      setInvitePassword("");
      setInviteRole("member");
      fetchUsers();
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

  const updatePassword = async () => {
    try {
      setPasswordLoading(true);
      
      const { data, error } = await supabase.functions.invoke('update-user-password', {
        body: {
          target_user_id: selectedUserId,
          new_password: newPassword,
          agency_id: currentAgency?.id
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Senha alterada!",
        description: "A senha do usuário foi alterada com sucesso.",
      });

      setPasswordDialogOpen(false);
      setNewPassword("");
      setSelectedUserId("");
    } catch (error: any) {
      toast({
        title: "Erro ao alterar senha",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPasswordLoading(false);
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
      const { data, error } = await supabase
        .from('agency_users')
        .delete()
        .eq('agency_id', currentAgency?.id)
        .eq('user_id', userId)
        .select();

      if (error) throw error;

      // Verificar se algo foi realmente deletado
      if (!data || data.length === 0) {
        throw new Error('Você não tem permissão para remover este usuário ou ele não existe.');
      }

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

  if (!isAgencyAdmin()) {
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
          <div className="flex items-center justify-end">
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Criar Usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Usuário</DialogTitle>
                  <DialogDescription>
                    Crie um novo usuário para sua agência
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-name">Nome Completo</Label>
                    <Input
                      id="invite-name"
                      type="text"
                      placeholder="Nome do usuário"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                    />
                  </div>
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
                    <Label htmlFor="invite-password">Senha</Label>
                    <Input
                      id="invite-password"
                      type="password"
                      placeholder="Digite a senha"
                      value={invitePassword}
                      onChange={(e) => setInvitePassword(e.target.value)}
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
                  <Button onClick={inviteUser} disabled={inviteLoading || !inviteEmail || !invitePassword}>
                    {inviteLoading ? "Criando..." : "Criar Usuário"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUserId(user.user_id);
                              setPasswordDialogOpen(true);
                            }}
                          >
                            <Key className="h-4 w-4 mr-2" />
                            Alterar Senha
                          </DropdownMenuItem>

                          {user.role !== 'owner' && user.user_id !== currentAuthUser?.id && (
                            <DropdownMenuItem onClick={() => setPermissionsTarget(user)}>
                              <ShieldCheck className="h-4 w-4 mr-2" />
                              Permissões
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuItem onClick={() => setRoleDialogUser(user)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Alterar Função
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
                Criar Primeiro Usuário
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Update Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Digite uma nova senha para o usuário
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={updatePassword} disabled={passwordLoading || !newPassword}>
              {passwordLoading ? "Alterando..." : "Alterar Senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {permissionsTarget && (
        <RolePermissionsManager
          open={!!permissionsTarget}
          onOpenChange={(o) => !o && setPermissionsTarget(null)}
          userId={permissionsTarget.user_id}
          userName={permissionsTarget.profiles?.name || 'Usuário'}
          userEmail={permissionsTarget.profiles?.email || ''}
          currentPermissions={permissionsTarget.app_permissions ?? null}
          currentCustomRole={permissionsTarget.custom_role ?? null}
          onSaved={fetchUsers}
        />
      )}
    </div>
  );
}