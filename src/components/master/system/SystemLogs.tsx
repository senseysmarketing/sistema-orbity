import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, RefreshCw, AlertCircle, CheckCircle, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface SystemLog {
  log_type: string;
  id: string;
  created_at: string;
  agency_id: string;
  status: string;
  description: string;
  details: string | null;
}

interface Agency {
  id: string;
  name: string;
}

export function SystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [agencyFilter, setAgencyFilter] = useState<string>('all');
  const [stats, setStats] = useState({ total: 0, success: 0, errors: 0 });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Fetch logs from the view using raw query
      const { data: logsData, error: logsError } = await supabase
        .from('master_system_logs' as any)
        .select('*')
        .limit(200);

      if (logsError) throw logsError;

      // Fetch agencies for filter
      const { data: agenciesData } = await supabase
        .from('agencies')
        .select('id, name')
        .order('name');

      setAgencies(agenciesData || []);

      // Cast and apply filters
      let filteredLogs = (logsData as unknown as SystemLog[]) || [];
      
      if (typeFilter !== 'all') {
        filteredLogs = filteredLogs.filter(l => l.log_type === typeFilter);
      }
      if (statusFilter !== 'all') {
        filteredLogs = filteredLogs.filter(l => l.status === statusFilter);
      }
      if (agencyFilter !== 'all') {
        filteredLogs = filteredLogs.filter(l => l.agency_id === agencyFilter);
      }

      setLogs(filteredLogs);

      // Calculate stats
      const allLogs = (logsData as unknown as SystemLog[]) || [];
      setStats({
        total: allLogs.length,
        success: allLogs.filter(l => l.status === 'success').length,
        errors: allLogs.filter(l => l.status === 'error').length,
      });
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [typeFilter, statusFilter, agencyFilter]);

  const exportToCSV = () => {
    const headers = ['Data', 'Tipo', 'Agência', 'Status', 'Descrição', 'Detalhes'];
    const rows = logs.map(log => [
      format(new Date(log.created_at), 'dd/MM/yyyy HH:mm'),
      log.log_type,
      agencies.find(a => a.id === log.agency_id)?.name || log.agency_id,
      log.status,
      log.description,
      log.details || ''
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `system-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const getAgencyName = (agencyId: string) => {
    return agencies.find(a => a.id === agencyId)?.name || 'Desconhecida';
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Logs</p>
                <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sucesso</p>
                <p className="text-2xl font-bold text-green-600">{stats.success.toLocaleString()}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Erros</p>
                <p className="text-2xl font-bold text-red-600">{stats.errors.toLocaleString()}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Logs do Sistema</CardTitle>
          <CardDescription>Visualize e filtre os logs de todas as operações</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="api">API Facebook</SelectItem>
                <SelectItem value="import">Importação</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
              </SelectContent>
            </Select>

            <Select value={agencyFilter} onValueChange={setAgencyFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Agência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as agências</SelectItem>
                {agencies.map(agency => (
                  <SelectItem key={agency.id} value={agency.id}>{agency.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1" />

            <Button variant="outline" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button variant="outline" onClick={exportToCSV} disabled={logs.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>

          {/* Logs Table */}
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Agência</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum log encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.slice(0, 100).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {log.log_type === 'api' ? 'API' : 'Import'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {getAgencyName(log.agency_id)}
                        </TableCell>
                        <TableCell>
                          {log.status === 'success' ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              Sucesso
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Erro</Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {log.description}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                          {log.details || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          
          {logs.length > 100 && (
            <p className="text-sm text-muted-foreground text-center">
              Exibindo 100 de {logs.length} logs
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
