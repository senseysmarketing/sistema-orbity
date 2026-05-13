import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Mail, MousePointer2, AlertCircle, Rocket, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSendPulseAddressBooks } from "@/hooks/useSendPulse";

interface CampaignStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: any;
}

interface NormalizedStats {
  sent: number;
  opened: number;
  clicked: number;
  error: number;
  unsubscribed: number;
  open_rate: number;
  click_rate: number;
  source: "api" | "campaign" | "addressbook" | "none";
}

// Normalizes whatever SendPulse returns into a consistent shape.
// Handles: /campaigns/{id}/stat OK, embedded campaign.statistics, addressbook fallback,
// and SendPulse error payloads like { message: "Not Found", error_code: 404 }.
function normalizeStats(
  apiData: any,
  campaign: any,
  addressBooks: any[]
): NormalizedStats {
  const isErrorPayload =
    apiData &&
    typeof apiData === "object" &&
    (apiData.error_code || apiData.error || apiData.message === "Not Found");

  // 1) Try the dedicated stat endpoint
  if (apiData && !isErrorPayload && typeof apiData === "object") {
    const sent =
      Number(apiData.sent ?? apiData.total_sent ?? apiData.delivered ?? 0) || 0;
    const opened = Number(apiData.opened ?? apiData.opening ?? 0) || 0;
    const clicked =
      Number(apiData.clicked ?? apiData.link_redirected ?? apiData.clicks ?? 0) || 0;
    const error = Number(apiData.error ?? apiData.errors ?? 0) || 0;
    const unsubscribed =
      Number(apiData.unsubscribed ?? apiData.unsubscribe ?? 0) || 0;
    if (sent > 0 || opened > 0 || clicked > 0 || error > 0) {
      return {
        sent,
        opened,
        clicked,
        error,
        unsubscribed,
        open_rate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
        click_rate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
        source: "api",
      };
    }
  }

  // 2) Use statistics already embedded in the campaign object (from get_campaigns)
  const embedded = campaign?.statistics;
  if (embedded && typeof embedded === "object") {
    const sent =
      Number(embedded.sent ?? embedded.delivered ?? 0) || 0;
    const opened = Number(embedded.opening ?? embedded.opened ?? 0) || 0;
    const clicked =
      Number(embedded.link_redirected ?? embedded.clicked ?? 0) || 0;
    const error = Number(embedded.error ?? 0) || 0;
    const unsubscribed = Number(embedded.unsubscribe ?? embedded.unsubscribed ?? 0) || 0;
    if (sent > 0 || opened > 0 || clicked > 0 || error > 0 || unsubscribed > 0) {
      return {
        sent,
        opened,
        clicked,
        error,
        unsubscribed,
        open_rate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
        click_rate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
        source: "campaign",
      };
    }
  }

  // 3) Fallback to campaign-level counts (all_email_qty) or address book size
  const campaignSent =
    Number(campaign?.all_email_qty ?? campaign?.tariff_email_qty ?? 0) || 0;
  if (campaignSent > 0) {
    return {
      sent: campaignSent,
      opened: 0,
      clicked: 0,
      error: 0,
      unsubscribed: 0,
      open_rate: 0,
      click_rate: 0,
      source: "campaign",
    };
  }

  const listId =
    campaign?.address_book_id ??
    campaign?.list_id ??
    campaign?.message?.list_id;
  if (listId != null) {
    const book = addressBooks.find((b: any) => Number(b.id) === Number(listId));
    const bookCount = Number(book?.all_email_qty ?? book?.all_email_count ?? 0) || 0;
    if (bookCount > 0) {
      return {
        sent: bookCount,
        opened: 0,
        clicked: 0,
        error: 0,
        unsubscribed: 0,
        open_rate: 0,
        click_rate: 0,
        source: "addressbook",
      };
    }
  }

  return {
    sent: 0,
    opened: 0,
    clicked: 0,
    error: 0,
    unsubscribed: 0,
    open_rate: 0,
    click_rate: 0,
    source: "none",
  };
}

export function CampaignStatsDialog({ open, onOpenChange, campaign }: CampaignStatsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [apiData, setApiData] = useState<any>(null);

  const addressBooksQuery = useSendPulseAddressBooks(open);
  const addressBooks = addressBooksQuery.data ?? [];

  useEffect(() => {
    if (open && campaign?.id) {
      fetchStats();
    } else if (!open) {
      setApiData(null);
    }
  }, [open, campaign?.id]);

  async function fetchStats() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sendpulse-api', {
        body: { action: 'get_campaign_stats', campaign_id: campaign.id }
      });
      if (error) throw error;
      setApiData(data);
    } catch (e) {
      console.error("Erro ao carregar estatísticas:", e);
      setApiData(null);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(
    () => normalizeStats(apiData, campaign, addressBooks),
    [apiData, campaign, addressBooks]
  );

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
  const metricsPending =
    isSent && stats.sent > 0 && stats.opened === 0 && stats.clicked === 0 && stats.error === 0;
  const usingFallback = stats.source === "addressbook" || stats.source === "campaign";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              {campaign?.name || "Estatísticas da Campanha"}
            </DialogTitle>
            {campaign && getStatusBadge(campaign)}
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
            {metricsPending && (
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-xs text-blue-700 dark:text-blue-300">
                📊 As métricas de abertura, clique e bounces podem levar alguns minutos para serem processadas pela SendPulse após o disparo. Volte mais tarde para ver os resultados completos.
              </div>
            )}
            {!metricsPending && usingFallback && stats.sent > 0 && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
                ℹ️ Volume de envios estimado a partir da lista de destino. Aberturas, cliques e erros aparecerão assim que a SendPulse finalizar o processamento.
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border shadow-none bg-card/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Mail className="h-3 w-3" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Enviados</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.sent}</div>
                </CardContent>
              </Card>

              <Card className="border shadow-none bg-card/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Rocket className="h-3 w-3" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Aberturas</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.open_rate}%</div>
                  <p className="text-[10px] text-muted-foreground">{stats.opened} aberturas únicas</p>
                </CardContent>
              </Card>

              <Card className="border shadow-none bg-card/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <MousePointer2 className="h-3 w-3" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Clicks (CTR)</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.click_rate}%</div>
                  <p className="text-[10px] text-muted-foreground">{stats.clicked} cliques totais</p>
                </CardContent>
              </Card>

              <Card className="border shadow-none bg-card/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <AlertCircle className="h-3 w-3" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Erros</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.error}</div>
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
                    <span className="font-semibold">{stats.sent ? Math.round(((stats.sent - stats.error) / stats.sent) * 100) : 0}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${stats.sent ? Math.round(((stats.sent - stats.error) / stats.sent) * 100) : 0}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Taxa de Rejeição (Unsubscribe)</span>
                    <span className="font-semibold">{stats.unsubscribed}</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-400"
                      style={{ width: `${stats.sent ? Math.round((stats.unsubscribed / stats.sent) * 100) : 0}%` }}
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
