import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquareHeart, Send, Users, ThumbsUp, Minus, ThumbsDown, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function getCurrentPeriod(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${q}-${now.getFullYear()}`;
}

export default function NPSPage() {
  const { currentAgency } = useAgency();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);

  // Fetch NPS responses
  const { data: responses = [], isLoading: loadingResponses } = useQuery({
    queryKey: ["nps-responses", currentAgency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nps_responses")
        .select("*")
        .eq("agency_id", currentAgency!.id)
        .order("response_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentAgency?.id,
  });

  // Fetch active clients
  const { data: clients = [] } = useQuery({
    queryKey: ["nps-clients", currentAgency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, contact, email")
        .eq("agency_id", currentAgency!.id)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentAgency?.id,
  });

  // Fetch NPS settings
  const { data: settings } = useQuery({
    queryKey: ["nps-settings", currentAgency?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("nps_settings")
        .select("*")
        .eq("agency_id", currentAgency!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!currentAgency?.id,
  });

  // Fetch WhatsApp instances
  const { data: whatsappInstances = [] } = useQuery({
    queryKey: ["nps-whatsapp-instances", currentAgency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_accounts")
        .select("id, instance_name, phone_number, status, purpose")
        .eq("agency_id", currentAgency!.id)
        .eq("status", "connected");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentAgency?.id,
  });

  // Fetch existing tokens for current period
  const { data: existingTokens = [] } = useQuery({
    queryKey: ["nps-tokens", currentAgency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nps_tokens")
        .select("*")
        .eq("agency_id", currentAgency!.id)
        .eq("period", getCurrentPeriod());
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentAgency?.id,
  });

  // Save settings mutation
  const saveSettings = useMutation({
    mutationFn: async (updates: { frequency?: string; auto_send?: boolean; whatsapp_instance_id?: string | null }) => {
      const { data: existing } = await supabase
        .from("nps_settings")
        .select("id")
        .eq("agency_id", currentAgency!.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("nps_settings")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("nps_settings")
          .insert({ agency_id: currentAgency!.id, ...updates });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nps-settings"] });
      toast({ title: "Configurações salvas" });
    },
  });

  // NPS calculation
  const npsMetrics = useMemo(() => {
    if (!responses.length) return { nps: 0, promoters: 0, neutrals: 0, detractors: 0, total: 0 };
    const promoters = responses.filter((r: any) => r.score >= 9).length;
    const neutrals = responses.filter((r: any) => r.score >= 7 && r.score <= 8).length;
    const detractors = responses.filter((r: any) => r.score <= 6).length;
    const total = responses.length;
    const nps = Math.round(((promoters - detractors) / total) * 100);
    return { nps, promoters, neutrals, detractors, total };
  }, [responses]);

  // Client status map
  const clientStatusMap = useMemo(() => {
    const map: Record<string, "responded" | "pending" | "not_sent"> = {};
    clients.forEach((c: any) => {
      const hasResponse = responses.find((r: any) => r.client_id === c.id || r.client_name === c.name);
      const hasToken = existingTokens.find((t: any) => t.client_id === c.id);
      if (hasResponse) map[c.id] = "responded";
      else if (hasToken) map[c.id] = "pending";
      else map[c.id] = "not_sent";
    });
    return map;
  }, [clients, responses, existingTokens]);

  // Send survey
  const handleSendSurvey = async () => {
    if (!currentAgency?.id) return;
    setSending(true);

    try {
      const period = getCurrentPeriod();
      const origin = window.location.origin;
      const clientsToSend = clients.filter((c: any) => clientStatusMap[c.id] !== "responded");

      if (!clientsToSend.length) {
        toast({ title: "Todos os clientes já responderam", variant: "default" });
        setSending(false);
        return;
      }

      // Generate tokens
      const tokensToInsert = clientsToSend.map((c: any) => ({
        agency_id: currentAgency.id,
        client_id: c.id,
        period,
      }));

      const { data: tokens, error: tokenError } = await supabase
        .from("nps_tokens")
        .insert(tokensToInsert)
        .select();

      if (tokenError) throw tokenError;

      // Find WhatsApp instance
      const instanceId = settings?.whatsapp_instance_id || whatsappInstances[0]?.id;
      if (!instanceId) {
        toast({ title: "Nenhuma instância WhatsApp conectada", variant: "destructive" });
        setSending(false);
        return;
      }

      // Send messages
      let sent = 0;
      for (const token of tokens || []) {
        const client = clientsToSend.find((c: any) => c.id === token.client_id);
        if (!client?.contact) continue;

        const surveyUrl = `${origin}/nps-survey?t=${token.id}`;
        const message = `Olá ${client.name}! 👋\n\nGostaríamos muito de saber como está a nossa parceria. Poderia nos avaliar em uma pesquisa rápida de 30 segundos?\n\n🔗 ${surveyUrl}\n\nSua opinião é muito importante para nós! 💙`;

        try {
          await supabase.functions.invoke("whatsapp-send", {
            body: {
              account_id: instanceId,
              phone_number: client.contact,
              message,
            },
          });
          sent++;
        } catch (e) {
          console.error("Failed to send to", client.name, e);
        }
      }

      toast({ title: `Pesquisa enviada para ${sent} clientes` });
      queryClient.invalidateQueries({ queryKey: ["nps-tokens"] });
    } catch (error: any) {
      toast({ title: "Erro ao enviar pesquisa", description: error.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (loadingResponses) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const npsColor = npsMetrics.nps >= 50 ? "text-emerald-600" : npsMetrics.nps >= 0 ? "text-amber-600" : "text-red-600";

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MessageSquareHeart className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">NPS — Net Promoter Score</h1>
            <p className="text-sm text-muted-foreground">Acompanhe a satisfação dos seus clientes</p>
          </div>
        </div>
        <Button onClick={handleSendSurvey} disabled={sending}>
          {sending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Enviar Pesquisa Agora
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className={`text-4xl font-bold ${npsColor}`}>{npsMetrics.nps}</p>
            <p className="text-sm text-muted-foreground mt-1">NPS Geral</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex items-center justify-center gap-2">
              <ThumbsUp className="h-5 w-5 text-emerald-500" />
              <p className="text-3xl font-bold text-emerald-600">{npsMetrics.promoters}</p>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Promotores (9-10)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex items-center justify-center gap-2">
              <Minus className="h-5 w-5 text-amber-500" />
              <p className="text-3xl font-bold text-amber-600">{npsMetrics.neutrals}</p>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Neutros (7-8)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex items-center justify-center gap-2">
              <ThumbsDown className="h-5 w-5 text-red-500" />
              <p className="text-3xl font-bold text-red-600">{npsMetrics.detractors}</p>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Detratores (0-6)</p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution bar */}
      {npsMetrics.total > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex h-6 w-full rounded-full overflow-hidden">
              <div className="bg-emerald-500 transition-all" style={{ width: `${(npsMetrics.promoters / npsMetrics.total) * 100}%` }} />
              <div className="bg-amber-400 transition-all" style={{ width: `${(npsMetrics.neutrals / npsMetrics.total) * 100}%` }} />
              <div className="bg-red-500 transition-all" style={{ width: `${(npsMetrics.detractors / npsMetrics.total) * 100}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>Promotores {Math.round((npsMetrics.promoters / npsMetrics.total) * 100)}%</span>
              <span>Neutros {Math.round((npsMetrics.neutrals / npsMetrics.total) * 100)}%</span>
              <span>Detratores {Math.round((npsMetrics.detractors / npsMetrics.total) * 100)}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Clientes — Período {getCurrentPeriod()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {clients.map((c: any) => {
                const status = clientStatusMap[c.id];
                const response = responses.find((r: any) => r.client_id === c.id || r.client_name === c.name);
                return (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      {response && (
                        <p className="text-xs text-muted-foreground">
                          Nota: {response.score} — {format(new Date(response.response_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={status === "responded" ? "default" : "outline"}
                      className={
                        status === "responded"
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : status === "pending"
                          ? "bg-amber-100 text-amber-700 border-amber-200"
                          : ""
                      }
                    >
                      {status === "responded" ? "Respondeu" : status === "pending" ? "Pendente" : "Não enviado"}
                    </Badge>
                  </div>
                );
              })}
              {!clients.length && (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum cliente ativo</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configurações de Ciclo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Frequência da Pesquisa</Label>
                <Select
                  value={settings?.frequency || "quarterly"}
                  onValueChange={(v) => saveSettings.mutate({ frequency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="biannual">Semestral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">WhatsApp</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Envio Automático</Label>
                <Switch
                  checked={settings?.auto_send || false}
                  onCheckedChange={(v) => saveSettings.mutate({ auto_send: v })}
                />
              </div>

              {whatsappInstances.length > 1 ? (
                <div className="space-y-2">
                  <Label>Instância para NPS</Label>
                  <Select
                    value={settings?.whatsapp_instance_id || ""}
                    onValueChange={(v) => saveSettings.mutate({ whatsapp_instance_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar instância" />
                    </SelectTrigger>
                    <SelectContent>
                      {whatsappInstances.map((inst: any) => (
                        <SelectItem key={inst.id} value={inst.id}>
                          {inst.instance_name} {inst.phone_number ? `(${inst.phone_number})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : whatsappInstances.length === 1 ? (
                <div className="text-sm text-muted-foreground">
                  Instância: <span className="font-medium text-foreground">{whatsappInstances[0].instance_name}</span>
                  {whatsappInstances[0].phone_number && ` (${whatsappInstances[0].phone_number})`}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma instância conectada</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
