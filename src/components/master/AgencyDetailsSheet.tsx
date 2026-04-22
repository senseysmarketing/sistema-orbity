import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Building2, Users, Calendar as CalendarIcon, DollarSign, Clock, RotateCcw } from 'lucide-react';
import { format, endOfDay, addDays, differenceInDays, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMaster } from '@/hooks/useMaster';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AgencyDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agency: {
    agency_id: string;
    agency_name: string;
    created_at: string;
    is_active: boolean;
    user_count: number;
    client_count: number;
    task_count: number;
    total_revenue: number;
    plan_name: string;
    subscription_status: string;
    current_period_end: string;
    trial_end: string | null;
    computed_status: string;
    price_monthly: number | null;
  } | null;
}

// Mock payment history data
const MOCK_PAYMENTS = [
  { id: '1', date: '2025-06-01', amount: 997, status: 'paid' },
  { id: '2', date: '2025-05-01', amount: 997, status: 'paid' },
  { id: '3', date: '2025-04-01', amount: 997, status: 'paid' },
  { id: '4', date: '2025-03-01', amount: 997, status: 'paid' },
];

export function AgencyDetailsSheet({ open, onOpenChange, agency }: AgencyDetailsSheetProps) {
  const { suspendAgency, reactivateAgency, refreshAgencies } = useMaster();
  const [toggling, setToggling] = useState(false);
  const [trialDate, setTrialDate] = useState<Date | undefined>(undefined);
  const [savingTrial, setSavingTrial] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    if (agency?.trial_end) {
      setTrialDate(new Date(agency.trial_end));
    } else {
      setTrialDate(undefined);
    }
  }, [agency?.agency_id, agency?.trial_end]);

  if (!agency) return null;

  const handleToggleActive = async (checked: boolean) => {
    setToggling(true);
    if (checked) {
      await reactivateAgency(agency.agency_id);
    } else {
      await suspendAgency(agency.agency_id);
    }
    setToggling(false);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const status = agency.subscription_status;
  const trialEditingBlocked = status === 'active' || status === 'canceled';
  const currentTrialEnd = agency.trial_end ? new Date(agency.trial_end) : null;
  const now = new Date();
  const dateChanged =
    trialDate &&
    (!currentTrialEnd ||
      endOfDay(trialDate).toISOString() !== endOfDay(currentTrialEnd).toISOString());

  const handleSaveTrial = async () => {
    if (!trialDate) return;
    setSavingTrial(true);
    try {
      const finalDate = endOfDay(trialDate).toISOString();

      // Check if subscription record exists
      const { data: existing } = await supabase
        .from('agency_subscriptions')
        .select('id, status')
        .eq('agency_id', agency.agency_id)
        .maybeSingle();

      if (existing) {
        const newStatus =
          existing.status === 'trial' ||
          existing.status === 'trial_expired' ||
          existing.status === 'past_due'
            ? 'trial'
            : existing.status;

        const { error } = await supabase
          .from('agency_subscriptions')
          .update({ trial_end: finalDate, status: newStatus })
          .eq('agency_id', agency.agency_id);
        if (error) throw error;
      } else {
        // Upsert with orbity_trial plan
        const { data: plan, error: planErr } = await supabase
          .from('subscription_plans')
          .select('id')
          .eq('slug', 'orbity_trial')
          .eq('is_active', true)
          .maybeSingle();
        if (planErr) throw planErr;
        if (!plan) throw new Error('Plano orbity_trial não encontrado.');

        const { error } = await supabase.from('agency_subscriptions').insert({
          agency_id: agency.agency_id,
          plan_id: plan.id,
          status: 'trial',
          trial_start: new Date().toISOString(),
          trial_end: finalDate,
          billing_cycle: 'monthly',
        });
        if (error) throw error;
      }

      toast.success('Trial atualizado com sucesso.');
      await refreshAgencies();
    } catch (e: any) {
      toast.error('Erro ao atualizar trial', { description: e.message });
    } finally {
      setSavingTrial(false);
    }
  };

  const handleResetTrial = () => {
    const defaultDate = addDays(new Date(agency.created_at), 7);
    setTrialDate(defaultDate);
  };

  const renderTrialLegend = () => {
    if (!currentTrialEnd) {
      return <p className="text-xs text-muted-foreground">Sem trial configurado</p>;
    }
    if (currentTrialEnd > now) {
      const days = differenceInDays(currentTrialEnd, now);
      return (
        <p className="text-xs text-blue-600">
          Trial ativo até {format(currentTrialEnd, 'dd/MM/yyyy', { locale: ptBR })} ({days} dia{days !== 1 ? 's' : ''} restantes)
        </p>
      );
    }
    return (
      <p className="text-xs text-destructive">
        Trial expirado em {format(currentTrialEnd, 'dd/MM/yyyy', { locale: ptBR })}
      </p>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {agency.agency_name}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-muted/50">
              <Users className="h-4 w-4 text-muted-foreground mb-1" />
              <div className="text-lg font-bold">{agency.user_count}</div>
              <div className="text-xs text-muted-foreground">Usuários</div>
            </div>
            <div className="p-3 rounded-lg border bg-muted/50">
              <Building2 className="h-4 w-4 text-muted-foreground mb-1" />
              <div className="text-lg font-bold">{agency.client_count}</div>
              <div className="text-xs text-muted-foreground">Clientes</div>
            </div>
            <div className="p-3 rounded-lg border bg-muted/50">
              <CalendarIcon className="h-4 w-4 text-muted-foreground mb-1" />
              <div className="text-sm font-medium">{format(new Date(agency.created_at), 'dd/MM/yyyy', { locale: ptBR })}</div>
              <div className="text-xs text-muted-foreground">Criada em</div>
            </div>
            <div className="p-3 rounded-lg border bg-muted/50">
              <DollarSign className="h-4 w-4 text-muted-foreground mb-1" />
              <div className="text-sm font-medium">{formatCurrency(Number(agency.price_monthly || 0))}</div>
              <div className="text-xs text-muted-foreground">Valor Mensal</div>
            </div>
          </div>

          <Separator />

          {/* Suspend Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <Label className="text-sm font-medium">Acesso Ativo</Label>
              <p className="text-xs text-muted-foreground">Suspender ou reativar acesso manualmente</p>
            </div>
            <Switch
              checked={agency.is_active}
              onCheckedChange={handleToggleActive}
              disabled={toggling}
            />
          </div>

          <Separator />

          {/* Trial Management */}
          <div className="space-y-3 p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Gestão de Acesso e Trial</Label>
            </div>

            {trialEditingBlocked ? (
              <Alert variant="default">
                <AlertDescription className="text-xs">
                  A agência já possui ou possuiu uma assinatura (<span className="font-medium">{status}</span>). A modificação manual do período de trial não está disponível para este estado.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Data de expiração do Trial</Label>
                  <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !trialDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {trialDate ? format(trialDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={trialDate}
                        onSelect={(d) => { setTrialDate(d); setPopoverOpen(false); }}
                        initialFocus
                        className={cn('p-3 pointer-events-auto')}
                      />
                    </PopoverContent>
                  </Popover>
                  {renderTrialLegend()}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveTrial}
                    disabled={!dateChanged || savingTrial}
                    className="flex-1"
                  >
                    {savingTrial ? 'Salvando...' : 'Salvar nova data'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleResetTrial}
                    disabled={savingTrial}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Padrão (7d)
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  A data será salva como fim do dia (23:59:59) para o cliente ter acesso até o último minuto.
                </p>
              </>
            )}
          </div>

          <Separator />

          {/* Payment History (Mock) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Histórico de Pagamentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {MOCK_PAYMENTS.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{format(new Date(p.date), 'MMM yyyy', { locale: ptBR })}</span>
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">Pago</Badge>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(p.amount)}</span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground text-center pt-2">
                Dados mockados — integração com Stripe pendente
              </p>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
