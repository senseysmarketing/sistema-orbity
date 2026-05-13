import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Mail, MousePointer2, AlertCircle, Rocket, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CampaignStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: any;
}

export function CampaignStatsDialog({ open, onOpenChange, campaign }: CampaignStatsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (open && campaign?.id) {
      fetchStats();
    }
  }, [open, campaign?.id]);

  async function fetchStats() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sendpulse-api', {
        body: { action: 'get_campaign_stats', campaign_id: campaign.id }
      });
      if (error) throw error;
      setStats(data);
    } catch (e) {
      console.error("Erro ao carregar estatísticas:", e);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (camp: any) => {
    const explain = String(camp?.status_explain ?? "").toLowerCase();
    const status = camp?.status;
    if (/(sent|send|complete|finish|done)/.test(explain) || status === 3)
      return <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">Concluída</Badge>;
    if (/(sending|process|run|deliver)/.test(explain) || status === 12)
      return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Enviando</Badge>;
    if (/(queue|moderat|draft|wait|schedul|pending)/.test(explain) || status === 1 || status === 2 || status === 11)
      return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Agendada</Badge>;
    if (/(pause|stop|cancel)/.test(explain) || status === 4)
      return <Badge variant="secondary" className="bg-muted text-muted-foreground border-border">Pausada</Badge>;
    if (/(error|fail|reject)/.test(explain))
      return <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-red-500/20">Erro</Badge>;
    return <Badge variant="secondary">{camp?.status_explain || `Status ${status ?? "?"}`}</Badge>;
  };

  const explainLower = String(campaign?.status_explain ?? "").toLowerCase();
  const isScheduled = /(queue|moderat|draft|wait|schedul|pending)/.test(explainLower) || campaign?.status === 1 || campaign?.status === 2 || campaign?.status === 11 || campaign?.status === 0;
  const isSent = /(sent|send|complete|finish|done)/.test(explainLower) || campaign?.status === 3;
  const noMetricsYet = isSent && stats && (stats.sent ?? 0) > 0 && (stats.opened ?? 0) === 0 && (stats.clicked ?? 0) === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              {campaign?.name || "Estatísticas da Campanha"}
            </DialogTitle>
            {campaign && getStatusBadge(campaign.status)}
          </div>
          <DialogDescription>
            {campaign?.subject && `Assunto: ${campaign.subject}`}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-none bg-secondary/20 shadow-none">
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-12" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : isScheduled ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center">
              <Rocket className="h-8 w-8 text-primary animate-bounce" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">🚀 Envio Programado</h3>
              <p className="text-muted-foreground">
                Esta campanha está na fila para ser disparada em:
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 text-primary font-bold bg-primary/5 py-2 px-4 rounded-full w-fit mx-auto">
                <Clock className="h-4 w-4" />
                {campaign.send_date && format(new Date(campaign.send_date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Disparo em aproximadamente {campaign.send_date && formatDistanceToNow(new Date(campaign.send_date), { locale: ptBR })}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border shadow-none bg-card/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Mail className="h-3 w-3" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Enviados</span>
                  </div>
                  <div className="text-2xl font-bold">{stats?.sent || 0}</div>
                </CardContent>
              </Card>
              
              <Card className="border shadow-none bg-card/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Rocket className="h-3 w-3" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Aberturas</span>
                  </div>
                  <div className="text-2xl font-bold">{stats?.open_rate || 0}%</div>
                  <p className="text-[10px] text-muted-foreground">{stats?.opened || 0} cliques únicos</p>
                </CardContent>
              </Card>

              <Card className="border shadow-none bg-card/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <MousePointer2 className="h-3 w-3" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Clicks (CTR)</span>
                  </div>
                  <div className="text-2xl font-bold">{stats?.click_rate || 0}%</div>
                  <p className="text-[10px] text-muted-foreground">{stats?.clicked || 0} cliques totais</p>
                </CardContent>
              </Card>

              <Card className="border shadow-none bg-card/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <AlertCircle className="h-3 w-3" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Erros</span>
                  </div>
                  <div className="text-2xl font-bold">{stats?.error || 0}</div>
                  <p className="text-[10px] text-muted-foreground">Bounces / Inválidos</p>
                </CardContent>
              </Card>
            </div>

            <div className="bg-secondary/10 rounded-lg p-4 border border-border/50">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Detalhamento do Fluxo
              </h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Taxa de Entrega</span>
                    <span className="font-semibold">{stats?.sent ? Math.round(((stats.sent - (stats.error || 0)) / stats.sent) * 100) : 0}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500" 
                      style={{ width: `${stats?.sent ? Math.round(((stats.sent - (stats.error || 0)) / stats.sent) * 100) : 0}%` }} 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Taxa de Rejeição (Unsubscribe)</span>
                    <span className="font-semibold">{stats?.unsubscribed || 0}</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-400" 
                      style={{ width: `${stats?.sent ? Math.round((stats.unsubscribed / stats.sent) * 100) : 0}%` }} 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
