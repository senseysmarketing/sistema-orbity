import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle2, Circle, Sparkles, ArrowRight, X, Clock, PartyPopper } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useAgency } from '@/hooks/useAgency';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type AgencyFlags = {
  id: string;
  created_at: string;
  onboarding_completed_at: string | null;
  onboarding_discount_eligible: boolean;
  onboarding_widget_dismissed: boolean;
};

type ChecklistItem = {
  key: string;
  label: string;
  done: boolean;
  href: string;
};

async function countAtLeastOne(table: 'clients' | 'leads' | 'tasks' | 'whatsapp_accounts' | 'facebook_connections' | 'agency_users', agencyId: string) {
  const { count } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId);
  return count ?? 0;
}

function useAgencyFlags(agencyId: string | undefined) {
  return useQuery({
    queryKey: ['agency-onboarding-flags', agencyId],
    enabled: !!agencyId,
    staleTime: 30_000,
    queryFn: async (): Promise<AgencyFlags | null> => {
      if (!agencyId) return null;
      const { data, error } = await supabase
        .from('agencies')
        .select('id, created_at, onboarding_completed_at, onboarding_discount_eligible, onboarding_widget_dismissed')
        .eq('id', agencyId)
        .maybeSingle();
      if (error) throw error;
      return data as AgencyFlags | null;
    },
  });
}

function useChecklistProgress(agencyId: string | undefined) {
  return useQuery({
    queryKey: ['onboarding-checklist', agencyId],
    enabled: !!agencyId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<ChecklistItem[]> => {
      if (!agencyId) return [];
      const [whats, fb, clients, leads, tasks, users] = await Promise.all([
        countAtLeastOne('whatsapp_accounts', agencyId),
        countAtLeastOne('facebook_connections', agencyId),
        countAtLeastOne('clients', agencyId),
        countAtLeastOne('leads', agencyId),
        countAtLeastOne('tasks', agencyId),
        countAtLeastOne('agency_users', agencyId),
      ]);

      return [
        { key: 'integration', label: 'Conectar uma integração (WhatsApp ou Meta)', done: (whats + fb) > 0, href: '/dashboard/settings' },
        { key: 'client', label: 'Cadastrar seu primeiro cliente', done: clients > 0, href: '/dashboard/clients' },
        { key: 'lead', label: 'Adicionar seu primeiro lead', done: leads > 0, href: '/dashboard/crm' },
        { key: 'task', label: 'Criar sua primeira tarefa', done: tasks > 0, href: '/dashboard/tasks' },
        { key: 'team', label: 'Convidar um membro para a equipa', done: users > 1, href: '/dashboard/settings' },
      ];
    },
  });
}

function useCountdown(createdAt: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  if (!createdAt) return null;
  const deadline = new Date(createdAt).getTime() + 24 * 60 * 60 * 1000;
  const ms = deadline - now;
  if (ms <= 0) return null;
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return { hours, minutes };
}

export function OnboardingChecklist() {
  const { currentAgency } = useAgency();
  const queryClient = useQueryClient();
  const completionFiredRef = useRef(false);

  const agencyId = currentAgency?.id;
  const { data: flags } = useAgencyFlags(agencyId);
  const { data: items } = useChecklistProgress(agencyId);

  const doneCount = useMemo(() => items?.filter(i => i.done).length ?? 0, [items]);
  const allDone = !!items && items.length > 0 && doneCount === items.length;
  const countdown = useCountdown(flags?.created_at);

  const dismissMutation = useMutation({
    mutationFn: async () => {
      if (!agencyId) return;
      const { error } = await supabase
        .from('agencies')
        .update({ onboarding_widget_dismissed: true })
        .eq('id', agencyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-onboarding-flags', agencyId] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Não foi possível ocultar.'),
  });

  // Disparo único da conclusão (server-side decide elegibilidade)
  useEffect(() => {
    if (!flags || !items) return;
    if (!allDone) return;
    if (flags.onboarding_completed_at) return;
    if (completionFiredRef.current) return;

    completionFiredRef.current = true;

    (async () => {
      const { data: isEligible, error } = await supabase
        .rpc('complete_fast_track', { agency_uuid: flags.id });

      if (error) {
        completionFiredRef.current = false; // permite retry
        console.error('[fast-track] RPC error', error);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['agency-onboarding-flags', agencyId] });

      if (isEligible === true) {
        try {
          const { default: confetti } = await import('canvas-confetti');
          confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
        } catch {
          // ignore
        }
        toast.success('🎉 Cupom de R$100 desbloqueado para sua primeira mensalidade!');
      }
    })();
  }, [allDone, flags, items, agencyId, queryClient]);

  if (!flags || !items) return null;
  if (flags.onboarding_widget_dismissed) return null;

  const sevenDaysOld = (Date.now() - new Date(flags.created_at).getTime()) > 7 * 24 * 60 * 60 * 1000;
  const completed = !!flags.onboarding_completed_at;
  const eligible = flags.onboarding_discount_eligible;
  const canDismiss = completed || sevenDaysOld;

  return (
    <Card className="border-border/60 bg-card">
      <div className="p-5 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Configure sua agência em 5 passos
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {doneCount} de {items.length} concluídos
            </p>
          </div>
        </div>

        {/* Banner da oferta R$100 — 3 estados */}
        {!completed && countdown && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="rounded-md bg-amber-500/15 p-1.5 text-amber-600 dark:text-amber-400 shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                🎁 Complete os 5 passos em 24h e ganhe R$100 OFF na primeira mensalidade
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-0.5">
                {countdown.hours}h {countdown.minutes}m restantes
              </p>
            </div>
          </div>
        )}

        {!completed && !countdown && (
          <div className="rounded-lg border border-border/60 bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">
              A janela do bônus de R$100 expirou, mas configurar sua agência ainda vale muito. Continue quando puder.
            </p>
          </div>
        )}

        {/* Progress */}
        <Progress value={doneCount * 20} className="h-1.5" />

        {/* Lista */}
        <ul className="divide-y divide-border/60">
          {items.map(item => (
            <li key={item.key} className="py-2.5">
              {item.done ? (
                <div className="flex items-center gap-3 text-sm text-muted-foreground line-through opacity-60">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </div>
              ) : (
                <Link
                  to={item.href}
                  className="group flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors"
                >
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </Link>
              )}
            </li>
          ))}
        </ul>

        {/* Footer */}
        {(completed || canDismiss) && (
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/60">
            {completed && eligible ? (
              <Badge
                className={cn(
                  'gap-1.5 border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-amber-400/10 text-amber-700 dark:text-amber-300',
                )}
                variant="outline"
              >
                <PartyPopper className="h-3 w-3" />
                Cupom de R$100 desbloqueado
              </Badge>
            ) : completed ? (
              <span className="text-xs text-muted-foreground">
                Onboarding concluído. Bom trabalho!
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                Continue quando puder — você poderá ocultar este painel a qualquer momento.
              </span>
            )}

            {canDismiss && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => dismissMutation.mutate()}
                disabled={dismissMutation.isPending}
              >
                <X className="h-3 w-3" />
                Ocultar
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
