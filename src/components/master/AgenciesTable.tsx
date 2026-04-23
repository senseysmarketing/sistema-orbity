import { useState, useEffect } from 'react';
import { useMaster } from '@/hooks/useMaster';
import { AgencyDetailsSheet } from '@/components/master/AgencyDetailsSheet';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  MoreHorizontal, Eye, Pause, Play, RefreshCw,
  CheckCircle2, AlertTriangle, XCircle, Ban, Search,
  ChevronLeft, ChevronRight, Copy, Check, Trash2,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ITEMS_PER_PAGE = 10;

function CopyOnboardingLinks() {
  const [copied, setCopied] = useState<'subscription' | 'trial' | null>(null);

  const handleCopy = async (flow: string, type: 'subscription' | 'trial') => {
    const url = `${window.location.origin}/onboarding?flow=${flow}`;
    await navigator.clipboard.writeText(url);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleCopy('direct_monthly', 'subscription')}
      >
        {copied === 'subscription' ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
        Link Assinatura
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleCopy('trial', 'trial')}
      >
        {copied === 'trial' ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
        Link Trial
      </Button>
    </div>
  );
}

export function AgenciesTable() {
  const { agencies, loading, refreshAgencies, suspendAgency, reactivateAgency, deleteAgencyPermanently, getStatusCounts } = useMaster();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedAgency, setSelectedAgency] = useState<typeof agencies[0] | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogAgency, setDeleteDialogAgency] = useState<typeof agencies[0] | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredAgencies = agencies.filter(agency =>
    agency.agency_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredAgencies.length / ITEMS_PER_PAGE));
  const paginatedAgencies = filteredAgencies.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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

  const openDeleteDialog = (agency: typeof agencies[0]) => {
    setDeleteDialogAgency(agency);
    setDeleteConfirmText('');
  };

  const closeDeleteDialog = () => {
    if (deleting) return;
    setDeleteDialogAgency(null);
    setDeleteConfirmText('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialogAgency) return;
    setDeleting(true);
    const ok = await deleteAgencyPermanently(deleteDialogAgency.agency_id);
    setDeleting(false);
    if (ok) {
      setDeleteDialogAgency(null);
      setDeleteConfirmText('');
    }
  };

  const canDeleteAgency = (status: string) =>
    status === 'suspended' || status === 'canceled' || status === 'trial_expired';

  const openDetails = (agency: typeof agencies[0]) => {
    setSelectedAgency(agency);
    setSheetOpen(true);
  };

  const getStatusBadge = (agency: typeof agencies[0]) => {
    // Check for trial status — tricolor (azul / amarelo / vermelho)
    if (agency.subscription_status === 'trial') {
      const trialEnd = agency.trial_end ? new Date(agency.trial_end) : null;
      const now = new Date();
      if (trialEnd && trialEnd > now) {
        const hoursLeft = (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60);
        const dateLabel = format(trialEnd, 'dd/MM', { locale: ptBR });
        if (hoursLeft <= 48) {
          return (
            <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20 hover:bg-yellow-500/20">
              Trial: expira em {dateLabel} ⚠
            </Badge>
          );
        }
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20">
            Trial: expira em {dateLabel}
          </Badge>
        );
      }
      const expiredLabel = trialEnd ? format(trialEnd, 'dd/MM', { locale: ptBR }) : '';
      return (
        <Badge className="bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20">
          Trial expirado{expiredLabel ? ` em ${expiredLabel}` : ''}
        </Badge>
      );
    }
    
    switch (agency.computed_status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20">Ativa</Badge>;
      case 'past_due':
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/20">Pgto Pendente</Badge>;
      case 'canceled':
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20 hover:bg-gray-500/20">Cancelada</Badge>;
      case 'suspended':
        return <Badge className="bg-red-700/10 text-red-700 border-red-700/20 hover:bg-red-700/20">Suspensa</Badge>;
      default:
        return <Badge variant="secondary">Indefinido</Badge>;
    }
  };

  const getFinancialBadge = (agency: typeof agencies[0]) => {
    if (agency.computed_status === 'active') {
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Em dia</Badge>;
    }
    if (agency.computed_status === 'past_due') {
      const periodEnd = agency.current_period_end ? new Date(agency.current_period_end) : null;
      if (periodEnd) {
        const daysLate = differenceInDays(new Date(), periodEnd);
        if (daysLate > 5) {
          return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Inadimplente</Badge>;
        }
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Atrasado ({daysLate}d)</Badge>;
      }
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Atrasado</Badge>;
    }
    if (!agency.is_active || agency.computed_status === 'suspended') {
      return <Badge className="bg-red-700/10 text-red-700 border-red-700/20">Bloqueado</Badge>;
    }
    return <Badge variant="secondary">-</Badge>;
  };

  const getSituationText = (agency: typeof agencies[0]) => {
    const periodEnd = agency.current_period_end ? new Date(agency.current_period_end) : null;
    switch (agency.computed_status) {
      case 'active':
        if (periodEnd) {
          return <span className="text-green-600 text-sm">Renova em: {format(periodEnd, 'dd/MM/yyyy', { locale: ptBR })}</span>;
        }
        return null;
      case 'past_due':
        return <span className="text-orange-600 text-sm">Aguardando pagamento</span>;
      case 'suspended':
        return <span className="text-red-700 text-sm">Suspensa manualmente</span>;
      case 'canceled':
        return <span className="text-gray-600 text-sm">Assinatura cancelada</span>;
      default:
        return null;
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Agências</CardTitle></CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (<div key={i} className="h-16 bg-muted rounded" />))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusCounts = getStatusCounts();
  const statusCards = [
    { key: 'active', label: 'Ativas', count: statusCounts.active, icon: CheckCircle2, color: 'text-green-600 bg-green-500/10' },
    { key: 'past_due', label: 'Pgto Pendente', count: statusCounts.past_due, icon: AlertTriangle, color: 'text-orange-600 bg-orange-500/10' },
    { key: 'canceled', label: 'Canceladas', count: statusCounts.canceled, icon: XCircle, color: 'text-gray-600 bg-gray-500/10' },
    { key: 'suspended', label: 'Suspensas', count: statusCounts.suspended, icon: Ban, color: 'text-red-700 bg-red-700/10' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
          {statusCards.map((item) => (
            <div key={item.key} className={`flex items-center gap-3 p-3 rounded-lg border ${item.color}`}>
              <item.icon className="h-5 w-5" />
              <div>
                <div className="text-lg font-bold">{item.count}</div>
                <div className="text-xs opacity-80">{item.label}</div>
              </div>
            </div>
          ))}
        </div>
        <CopyOnboardingLinks />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Agências ({filteredAgencies.length})</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar agência..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-[200px] md:w-[260px]"
              />
            </div>
            <Button variant="outline" size="sm" onClick={refreshAgencies} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agência</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Status Financeiro</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Valor Mensal</TableHead>
                  <TableHead>Usuários</TableHead>
                  <TableHead>Clientes</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAgencies.map((agency) => (
                  <TableRow key={agency.agency_id}>
                    <TableCell className="font-medium">{agency.agency_name}</TableCell>
                    <TableCell>{getStatusBadge(agency)}</TableCell>
                    <TableCell>{getFinancialBadge(agency)}</TableCell>
                    <TableCell>{getSituationText(agency)}</TableCell>
                    <TableCell>{formatCurrency(Number(agency.price_monthly || 0))}</TableCell>
                    <TableCell>{agency.user_count}</TableCell>
                    <TableCell>{agency.client_count}</TableCell>
                    <TableCell>{formatDate(agency.created_at)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" disabled={actionLoading === agency.agency_id}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetails(agency)}>
                            <Eye className="h-4 w-4 mr-2" /> Visualizar Detalhes
                          </DropdownMenuItem>
                          {agency.is_active ? (
                            <DropdownMenuItem onClick={() => handleSuspend(agency.agency_id)} className="text-destructive">
                              <Pause className="h-4 w-4 mr-2" /> Suspender
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleReactivate(agency.agency_id)} className="text-green-600">
                              <Play className="h-4 w-4 mr-2" /> Reativar
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredAgencies.length)} de {filteredAgencies.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => p - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage === totalPages}
                >
                  Próximo <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AgencyDetailsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        agency={selectedAgency}
      />
    </div>
  );
}
