import { useState } from 'react';
import { useMaster } from '@/hooks/useMaster';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  MoreHorizontal, 
  Eye, 
  Pause, 
  Play, 
  RefreshCw 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function AgenciesTable() {
  const { agencies, loading, refreshAgencies, suspendAgency, reactivateAgency } = useMaster();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleSuspend = async (agencyId: string) => {
    setActionLoading(agencyId);
    await suspendAgency(agencyId);
    setActionLoading(null);
  };

  const handleReactivate = async (agencyId: string) => {
    setActionLoading(agencyId);
    await reactivateAgency(agencyId);
    setActionLoading(null);
  };

  const getStatusBadge = (isActive: boolean, subscriptionStatus: string) => {
    if (!isActive) {
      return <Badge variant="destructive">Suspensa</Badge>;
    }
    
    switch (subscriptionStatus) {
      case 'active':
        return <Badge variant="default">Ativa</Badge>;
      case 'trial':
        return <Badge variant="secondary">Trial</Badge>;
      case 'canceled':
        return <Badge variant="outline">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">Indefinido</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agências</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Agências ({agencies.length})</CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshAgencies}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Usuários</TableHead>
                <TableHead>Clientes</TableHead>
                <TableHead>Receita</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agencies.map((agency) => (
                <TableRow key={agency.agency_id}>
                  <TableCell className="font-medium">
                    {agency.agency_name}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(agency.is_active, agency.subscription_status)}
                  </TableCell>
                  <TableCell>
                    {agency.subscription_plan || 'Sem plano'}
                  </TableCell>
                  <TableCell>{agency.user_count}</TableCell>
                  <TableCell>{agency.client_count}</TableCell>
                  <TableCell>{formatCurrency(Number(agency.total_revenue))}</TableCell>
                  <TableCell>{formatDate(agency.created_at)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actionLoading === agency.agency_id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar Detalhes
                        </DropdownMenuItem>
                        {agency.is_active ? (
                          <DropdownMenuItem
                            onClick={() => handleSuspend(agency.agency_id)}
                            className="text-destructive"
                          >
                            <Pause className="h-4 w-4 mr-2" />
                            Suspender
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleReactivate(agency.agency_id)}
                            className="text-green-600"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Reativar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}