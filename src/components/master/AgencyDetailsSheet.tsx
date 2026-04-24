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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Building2, Users, Calendar as CalendarIcon, Clock, RotateCcw,
  Mail, Phone, Globe, MessageCircle, Activity, TrendingUp, ExternalLink,
  CheckCircle2, AlertCircle, MinusCircle, Loader2, FileText, CreditCard,
} from 'lucide-react';
import { format, endOfDay, addDays, differenceInDays, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMaster } from '@/hooks/useMaster';
import { useAgencyDetails } from '@/hooks/useAgencyDetails';
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

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const onlyDigits = (v?: string | null) => (v || '').replace(/\D/g, '');

const getInitials = (name?: string | null, email?: string | null) => {
  const base = name || email || '?';
  return base
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

const getHealthStatus = (lastLogin: string | null, lastActivity: string | null) => {
  const ref = lastLogin || lastActivity;
  if (!ref) {
    return { label: 'Nunca acessou', variant: 'destructive' as const, icon: MinusCircle, color: 'text-destructive' };
  }
  const days = differenceInDays(new Date(), new Date(ref));
  if (days <= 2) return { label: 'Ativo', variant: 'default' as const, icon: CheckCircle2, color: 'text-emerald-500' };
  if (days <= 14) return { label: 'Ocioso', variant: 'secondary' as const, icon: AlertCircle, color: 'text-amber-500' };
  return { label: 'Inativo', variant: 'destructive' as const, icon: MinusCircle, color: 'text-destructive' };
};

export function AgencyDetailsSheet({ open, onOpenChange, agency }: AgencyDetailsSheetProps) {
  const { suspendAgency, reactivateAgency, refreshAgencies } = useMaster();
  const { data: details, isLoading: loadingDetails } = useAgencyDetails(agency?.agency_id ?? null, open);

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
    if (!currentTrialEnd) return <p className="text-xs text-muted-foreground">Sem trial configurado</p>;
    if (currentTrialEnd > now) {
      const days = differenceInDays(currentTrialEnd, now);
      return (
        <p className="text-xs text-primary">
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

  const a = details?.agency;
  const activity = details?.activity;
  const members = details?.members ?? [];
  const billing = details?.billing_history ?? [];
  const sub = details?.subscription;

  const health = getHealthStatus(activity?.last_login_at ?? null, activity?.last_activity_at ?? null);
  const HealthIcon = health.icon;

  const phoneDigits = onlyDigits(a?.contact_phone || a?.public_phone);
  const emailContact = a?.contact_email || a?.public_email;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {agency.agency_name}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Saúde da conta */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Saúde da Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HealthIcon className={cn('h-5 w-5', health.color)} />
                  <span className="font-medium">{health.label}</span>
                </div>
                <Badge variant={health.variant}>{agency.computed_status}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Último login</div>
                  <div className="font-medium">
                    {loadingDetails ? <Loader2 className="h-3 w-3 animate-spin" /> :
                      activity?.last_login_at
                        ? formatDistanceToNow(new Date(activity.last_login_at), { addSuffix: true, locale: ptBR })
                        : 'Nunca'}
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Última atividade</div>
                  <div className="font-medium">
                    {loadingDetails ? <Loader2 className="h-3 w-3 animate-spin" /> :
                      activity?.last_activity_at
                        ? formatDistanceToNow(new Date(activity.last_activity_at), { addSuffix: true, locale: ptBR })
                        : 'Sem atividade'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contato e cadastro */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Contato e Cadastro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {a?.description && (
                <p className="text-muted-foreground italic">{a.description}</p>
              )}

              <div className="grid grid-cols-1 gap-2">
                {emailContact && (
                  <a
                    href={`mailto:${emailContact}`}
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                  >
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{emailContact}</span>
                  </a>
                )}
                {(a?.contact_phone || a?.public_phone) && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{a?.contact_phone || a?.public_phone}</span>
                    {phoneDigits.length >= 10 && (
                      <a
                        href={`https://wa.me/${phoneDigits.startsWith('55') ? phoneDigits : '55' + phoneDigits}`}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-auto"
                      >
                        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                          <MessageCircle className="h-3 w-3" /> WhatsApp
                        </Button>
                      </a>
                    )}
                  </div>
                )}
                {a?.website_url && (
                  <a
                    href={a.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                  >
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{a.website_url}</span>
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </a>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground">Slug</div>
                  <div className="font-mono">{a?.slug || '—'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Criada em</div>
                  <div>{format(new Date(agency.created_at), 'dd/MM/yyyy', { locale: ptBR })}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Onboarding</div>
                  <div>
                    {a?.onboarding_completed_at
                      ? format(new Date(a.onboarding_completed_at), 'dd/MM/yyyy', { locale: ptBR })
                      : 'Não concluído'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Plano</div>
                  <div>{sub?.plan_name || agency.plan_name || '—'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Atividade e Uso Real */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Uso e Atividade
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDetails ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <Metric label="Clientes ativos" value={activity?.active_clients ?? 0} sub={`${activity?.total_clients ?? 0} no total`} />
                  <Metric label="Leads (30d)" value={activity?.leads_last_30d ?? 0} sub={`${activity?.leads_last_7d ?? 0} nos últimos 7d`} />
                  <Metric label="Tarefas (30d)" value={activity?.tasks_completed_30d ?? 0} sub={`${activity?.tasks_last_7d ?? 0} criadas em 7d`} />
                  <Metric label="Reuniões (30d)" value={activity?.meetings_last_30d ?? 0} sub={`${activity?.total_meetings ?? 0} no total`} />
                  <Metric label="Pagamentos (30d)" value={activity?.payments_paid_30d ?? 0} sub={`${activity?.total_payments ?? 0} no total`} />
                  <Metric label="Receita (30d)" value={formatCurrency(Number(activity?.revenue_30d ?? 0))} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Membros */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Membros ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingDetails ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : members.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Nenhum membro cadastrado</p>
              ) : (
                members.map((m) => (
                  <div key={m.user_id} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={m.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">{getInitials(m.name, m.email)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{m.name || m.email || 'Sem nome'}</div>
                      <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-[10px]">{m.role}</Badge>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {m.last_sign_in_at
                          ? formatDistanceToNow(new Date(m.last_sign_in_at), { addSuffix: true, locale: ptBR })
                          : 'Nunca acessou'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Histórico de Faturas (real) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Histórico de Faturas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingDetails ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : billing.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Sem faturas registradas</p>
              ) : (
                billing.map((b) => (
                  <div key={b.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div>{format(new Date(b.created_at), "dd 'de' MMM yyyy", { locale: ptBR })}</div>
                        <Badge
                          variant={b.status === 'paid' ? 'default' : b.status === 'open' ? 'secondary' : 'outline'}
                          className="text-[10px] mt-1"
                        >
                          {b.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatCurrency(Number(b.amount))}</span>
                      {b.invoice_url && (
                        <a href={b.invoice_url} target="_blank" rel="noreferrer">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Suspend Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <Label className="text-sm font-medium">Acesso Ativo</Label>
              <p className="text-xs text-muted-foreground">Suspender ou reativar acesso manualmente</p>
            </div>
            <Switch checked={agency.is_active} onCheckedChange={handleToggleActive} disabled={toggling} />
          </div>

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
                        className={cn('w-full justify-start text-left font-normal', !trialDate && 'text-muted-foreground')}
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
                  <Button size="sm" onClick={handleSaveTrial} disabled={!dateChanged || savingTrial} className="flex-1">
                    {savingTrial ? 'Salvando...' : 'Salvar nova data'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleResetTrial} disabled={savingTrial}>
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
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Metric({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
