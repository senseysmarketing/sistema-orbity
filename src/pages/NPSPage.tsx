import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquareHeart, Send, Users, ThumbsUp, Minus, ThumbsDown, RefreshCw,
  MessageCircle, Palette, Settings2, AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function getCurrentPeriod(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${q}-${now.getFullYear()}`;
}

export default function NPSPage() {
  const { currentAgency } = useAgency();
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);

  // Local form state for customization
  const [customForm, setCustomForm] = useState<Record<string, any> | null>(null);

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

  // Save settings mutation (generic for all tabs)
  const saveSettings = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
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

  // Initialize customForm when settings load
  const getCustomFormValues = () => {
    if (customForm) return customForm;
    return {
      survey_title: settings?.survey_title || "Olá, {{client_name}}!",
      survey_message: settings?.survey_message || "Como está nossa parceria?",
      main_question: settings?.main_question || "De 0 a 10, o quanto você recomendaria nossos serviços?",
      feedback_label_promoter: settings?.feedback_label_promoter || "Ficamos muito felizes! O que mais gostou?",
      feedback_label_neutral: settings?.feedback_label_neutral || "Obrigado! O que faltou para a nota ser 10?",
      feedback_label_detractor: settings?.feedback_label_detractor || "Sentimos muito por isso. O que podemos fazer IMEDIATAMENTE para resolver o seu problema?",
      whatsapp_template: settings?.whatsapp_template || "Olá {{client_name}}! 👋\n\nGostaríamos de saber como está a nossa parceria. Avalie-nos em 30 segundos:\n\n🔗 {{nps_link}}\n\nSua opinião é muito importante! 💙",
      whatsapp_enabled: settings?.whatsapp_enabled ?? false,
    };
  };

  const form = getCustomFormValues();

  const updateFormField = (field: string, value: any) => {
    setCustomForm((prev) => ({ ...form, ...prev, [field]: value }));
  };

  // Save customization
  const handleSaveCustomization = async () => {
    const values = { ...form, ...customForm };
    saveSettings.mutate(
      {
        survey_title: values.survey_title,
        survey_message: values.survey_message,
        main_question: values.main_question,
        feedback_label_promoter: values.feedback_label_promoter,
        feedback_label_neutral: values.feedback_label_neutral,
        feedback_label_detractor: values.feedback_label_detractor,
      },
      {
        onSuccess: () => {
          toast.success("Configurações atualizadas com sucesso!");
          setCustomForm(null);
        },
      }
    );
  };

  // Save WhatsApp settings
  const handleSaveWhatsApp = async () => {
    const values = { ...form, ...customForm };
    saveSettings.mutate(
      {
        whatsapp_enabled: values.whatsapp_enabled,
        whatsapp_template: values.whatsapp_template,
        whatsapp_instance_id: settings?.whatsapp_instance_id,
      },
      {
        onSuccess: () => {
          toast.success("Configurações atualizadas com sucesso!");
          setCustomForm(null);
        },
      }
    );
  };

  // Send survey with safety lock
  const handleSendSurvey = async () => {
    if (!currentAgency?.id) return;

    // GUARDRAIL: Check whatsapp_enabled from DB settings
    if (!settings?.whatsapp_enabled) {
      toast.error("O envio via WhatsApp está desativado. Ative-o primeiro.");
      return;
    }

    const instanceId = settings?.whatsapp_instance_id || (whatsappInstances.length === 1 ? whatsappInstances[0]?.id : null);
    if (!instanceId) {
      toast.error("Nenhuma instância WhatsApp selecionada.");
      return;
    }

    setSending(true);
    try {
      const period = getCurrentPeriod();
      const origin = window.location.origin;
      const clientsToSend = clients.filter((c: any) => clientStatusMap[c.id] !== "responded");

      if (!clientsToSend.length) {
        toast("Todos os clientes já responderam neste período.");
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

      const template = settings?.whatsapp_template || form.whatsapp_template;

      let sent = 0;
      for (const token of tokens || []) {
        const client = clientsToSend.find((c: any) => c.id === token.client_id);
        if (!client?.contact) continue;

        const surveyUrl = `${origin}/nps-survey?t=${token.id}`;
        const message = template
          .replace(/\{\{client_name\}\}/g, client.name)
          .replace(/\{\{nps_link\}\}/g, surveyUrl);

        try {
          await supabase.functions.invoke("whatsapp-send", {
            body: { account_id: instanceId, phone_number: client.contact, message },
          });
          sent++;
        } catch (e) {
          console.error("Failed to send to", client.name, e);
        }
      }

      toast.success(`Pesquisa enviada para ${sent} clientes`);
      queryClient.invalidateQueries({ queryKey: ["nps-tokens"] });
    } catch (error: any) {
      toast.error("Erro ao enviar pesquisa: " + error.message);
    } finally {
      setSending(false);
    }
  };

  if (loadingResponses) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const npsColor = npsMetrics.nps >= 50 ? "text-emerald-600" : npsMetrics.nps >= 0 ? "text-amber-600" : "text-red-600";
  const whatsappEnabled = customForm?.whatsapp_enabled ?? settings?.whatsapp_enabled ?? false;
  const instanceId = settings?.whatsapp_instance_id || (whatsappInstances.length === 1 ? whatsappInstances[0]?.id : null);
  const canSend = whatsappEnabled && !!instanceId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MessageSquareHeart className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">NPS — Net Promoter Score</h1>
          <p className="text-sm text-muted-foreground">Acompanhe a satisfação dos seus clientes</p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="gap-2"><Users className="h-4 w-4" />Dashboard</TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2"><MessageCircle className="h-4 w-4" />WhatsApp</TabsTrigger>
          <TabsTrigger value="customize" className="gap-2"><Palette className="h-4 w-4" />Personalizar</TabsTrigger>
          <TabsTrigger value="settings" className="gap-2"><Settings2 className="h-4 w-4" />Configurações</TabsTrigger>
        </TabsList>

        {/* ====== DASHBOARD TAB ====== */}
        <TabsContent value="dashboard" className="space-y-6">
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

          <Card>
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
        </TabsContent>

        {/* ====== WHATSAPP TAB ====== */}
        <TabsContent value="whatsapp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Controle de Disparos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label className="text-base font-semibold">Ativar Disparos via WhatsApp</Label>
                  <p className="text-sm text-muted-foreground">Trava de segurança global para envios NPS</p>
                </div>
                <Switch
                  checked={whatsappEnabled}
                  onCheckedChange={(v) => updateFormField("whatsapp_enabled", v)}
                />
              </div>

              {!whatsappEnabled && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  O envio de pesquisas está desativado. Ative o toggle acima para habilitar.
                </div>
              )}

              <div className="space-y-2">
                <Label>Instância para NPS</Label>
                {whatsappInstances.length > 1 ? (
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
                          {inst.phone_number ? formatPhoneDisplay(inst.phone_number) : inst.instance_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : whatsappInstances.length === 1 ? (
                  <div className="p-3 rounded-lg border bg-muted/30 text-sm">
                    <span className="font-medium">
                      {whatsappInstances[0].phone_number
                        ? formatPhoneDisplay(whatsappInstances[0].phone_number)
                        : whatsappInstances[0].instance_name}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma instância conectada</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Template da Mensagem</Label>
                <Textarea
                  value={form.whatsapp_template}
                  onChange={(e) => updateFormField("whatsapp_template", e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis disponíveis: <code className="bg-muted px-1 rounded">{"{{client_name}}"}</code> e <code className="bg-muted px-1 rounded">{"{{nps_link}}"}</code>
                </p>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleSaveWhatsApp} variant="outline" disabled={saveSettings.isPending}>
                  Salvar Configurações
                </Button>
                <Button onClick={handleSendSurvey} disabled={!canSend || sending}>
                  {sending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Enviar Pesquisa Agora
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== PERSONALIZAR TAB ====== */}
        <TabsContent value="customize" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Textos do Formulário Público</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Título da Pesquisa</Label>
                <Input
                  value={form.survey_title}
                  onChange={(e) => updateFormField("survey_title", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Use <code className="bg-muted px-1 rounded">{"{{client_name}}"}</code> para inserir o nome do cliente</p>
              </div>

              <div className="space-y-2">
                <Label>Mensagem de Introdução</Label>
                <Input
                  value={form.survey_message}
                  onChange={(e) => updateFormField("survey_message", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Use <code className="bg-muted px-1 rounded">{"{{client_name}}"}</code> para inserir o nome do cliente</p>
              </div>

              <div className="space-y-2">
                <Label>Pergunta Principal (0 a 10)</Label>
                <Input
                  value={form.main_question}
                  onChange={(e) => updateFormField("main_question", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feedback Inteligente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <Label>Promotores (9-10)</Label>
                </div>
                <Input
                  value={form.feedback_label_promoter}
                  onChange={(e) => updateFormField("feedback_label_promoter", e.target.value)}
                  className="border-emerald-300 focus:border-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <Label>Neutros (7-8)</Label>
                </div>
                <Input
                  value={form.feedback_label_neutral}
                  onChange={(e) => updateFormField("feedback_label_neutral", e.target.value)}
                  className="border-amber-300 focus:border-amber-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <Label>Detratores (0-6)</Label>
                </div>
                <Input
                  value={form.feedback_label_detractor}
                  onChange={(e) => updateFormField("feedback_label_detractor", e.target.value)}
                  className="border-red-300 focus:border-red-500"
                />
              </div>

              <Button onClick={handleSaveCustomization} disabled={saveSettings.isPending} className="w-full">
                Salvar Personalização
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== CONFIGURAÇÕES TAB ====== */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configurações de Ciclo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Frequência da Pesquisa</Label>
                <Select
                  value={settings?.frequency || "quarterly"}
                  onValueChange={(v) => saveSettings.mutate({ frequency: v }, { onSuccess: () => toast.success("Frequência atualizada!") })}
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

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label>Envio Automático no Final do Ciclo</Label>
                  <p className="text-sm text-muted-foreground">Dispara automaticamente quando o ciclo encerra</p>
                </div>
                <Switch
                  checked={settings?.auto_send || false}
                  onCheckedChange={(v) => saveSettings.mutate({ auto_send: v }, { onSuccess: () => toast.success("Configuração salva!") })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
