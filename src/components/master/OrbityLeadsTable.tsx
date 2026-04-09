import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, Search, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface OrbityLead {
  id: string;
  name: string;
  email: string;
  whatsapp: string | null;
  instagram: string | null;
  team_size: string | null;
  active_clients: string | null;
  avg_ticket: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'novo', label: 'Novo' },
  { value: 'em_contato', label: 'Em Contato' },
  { value: 'reuniao_agendada', label: 'Reunião Agendada' },
  { value: 'fechado', label: 'Fechado' },
  { value: 'desqualificado', label: 'Desqualificado' },
];

const STATUS_COLORS: Record<string, string> = {
  novo: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  em_contato: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  reuniao_agendada: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  fechado: 'bg-green-500/10 text-green-600 border-green-500/20',
  desqualificado: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

const PAGE_SIZE = 10;

export function OrbityLeadsTable() {
  const [leads, setLeads] = useState<OrbityLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('orbity_leads')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (search.trim()) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      setLeads((data || []) as OrbityLead[]);
      setTotal(count || 0);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Erro ao carregar leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [page, search]);

  const updateStatus = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orbity_leads')
        .update({ status: newStatus })
        .eq('id', leadId);
      if (error) throw error;
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
      toast.success('Status atualizado');
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const getTicketBadge = (ticket: string | null) => {
    if (!ticket) return '-';
    const isHigh = ticket === '>5k';
    return (
      <Badge className={isHigh
        ? 'bg-green-500/10 text-green-600 border-green-500/20'
        : 'bg-muted text-muted-foreground border-border'
      }>
        {ticket === '<1k' ? '< R$ 1k' : ticket === '1k-2.5k' ? 'R$ 1k-2.5k' : ticket === '2.5k-5k' ? 'R$ 2.5k-5k' : '> R$ 5k'}
      </Badge>
    );
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Aplicações / Leads ({total})</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchLeads} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Nome & Contato</TableHead>
                  <TableHead>Instagram</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Ticket Médio</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}><div className="h-10 bg-muted rounded animate-pulse" /></TableCell>
                    </TableRow>
                  ))
                ) : leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum lead encontrado
                    </TableCell>
                  </TableRow>
                ) : leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{lead.name}</span>
                        <span className="text-xs text-muted-foreground">{lead.email}</span>
                      </div>
                      {lead.whatsapp && (
                        <a
                          href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-green-600 hover:underline mt-1"
                        >
                          <MessageCircle className="h-3 w-3" />
                          {lead.whatsapp}
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {lead.instagram || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Equipe:</span> {lead.team_size || '-'}
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Clientes:</span> {lead.active_clients || '-'}
                      </div>
                    </TableCell>
                    <TableCell>{getTicketBadge(lead.avg_ticket)}</TableCell>
                    <TableCell>
                      <Select value={lead.status} onValueChange={(v) => updateStatus(lead.id, v)}>
                        <SelectTrigger className={`w-[160px] h-8 text-xs ${STATUS_COLORS[lead.status] || ''}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Página {page + 1} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
