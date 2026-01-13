import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Shield, Users, Wifi } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface MasterUser {
  user_id: string;
  name: string;
  email: string;
  role: string;
  joined_at: string;
  last_activity: string;
}

interface FacebookConnection {
  id: string;
  agency_id: string;
  agency_name: string;
  is_active: boolean;
  last_sync: string;
  token_expires_at: string | null;
}

export function SystemSecurity() {
  const [masterUsers, setMasterUsers] = useState<MasterUser[]>([]);
  const [fbConnections, setFbConnections] = useState<FacebookConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch master users from view
        const { data: users, error: usersError } = await supabase
          .from('master_users' as any)
          .select('*');

        if (usersError) {
          console.error('Error fetching master users:', usersError);
        } else {
          setMasterUsers((users as unknown as MasterUser[]) || []);
        }

        // Fetch Facebook connections from view
        const { data: connections, error: connectionsError } = await supabase
          .from('master_facebook_connections' as any)
          .select('*');

        if (connectionsError) {
          console.error('Error fetching FB connections:', connectionsError);
        } else {
          setFbConnections((connections as unknown as FacebookConnection[]) || []);
        }
      } catch (error) {
        console.error('Error fetching security data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const isTokenExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Master Users */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Usuários Master</CardTitle>
          </div>
          <CardDescription>
            Administradores com acesso ao painel de controle (Agência Senseys)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {masterUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum usuário master encontrado
            </p>
          ) : (
            <div className="space-y-4">
              {masterUsers.map((user) => (
                <div 
                  key={user.user_id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(user.name || user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name || 'Sem nome'}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge variant={user.role === 'owner' ? 'default' : 'secondary'}>
                      {user.role === 'owner' ? 'Proprietário' : 'Admin'}
                    </Badge>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Desde {format(new Date(user.joined_at), 'dd/MM/yyyy', { locale: ptBR })}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Facebook Integrations */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Wifi className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Integrações Facebook Ativas</CardTitle>
          </div>
          <CardDescription>
            Status das conexões com Facebook Ads de todas as agências
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fbConnections.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma integração Facebook encontrada
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agência</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última Sync</TableHead>
                  <TableHead>Token Expira</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fbConnections.map((connection) => (
                  <TableRow key={connection.id}>
                    <TableCell className="font-medium">
                      {connection.agency_name}
                    </TableCell>
                    <TableCell>
                      {connection.is_active ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(connection.last_sync), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {connection.token_expires_at ? (
                        <span className={isTokenExpired(connection.token_expires_at) ? 'text-red-600 font-medium' : ''}>
                          {isTokenExpired(connection.token_expires_at) 
                            ? 'Expirado' 
                            : format(new Date(connection.token_expires_at), "dd/MM/yy", { locale: ptBR })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/10 dark:border-yellow-900/50">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-yellow-600" />
            <CardTitle className="text-lg text-yellow-800 dark:text-yellow-200">Dicas de Segurança</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
            <li className="flex items-start space-x-2">
              <span>•</span>
              <span>Revise regularmente os usuários com acesso master</span>
            </li>
            <li className="flex items-start space-x-2">
              <span>•</span>
              <span>Monitore tokens do Facebook próximos de expirar</span>
            </li>
            <li className="flex items-start space-x-2">
              <span>•</span>
              <span>Mantenha os logs de API para auditoria por pelo menos 30 dias</span>
            </li>
            <li className="flex items-start space-x-2">
              <span>•</span>
              <span>Verifique erros frequentes de API para identificar problemas</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
