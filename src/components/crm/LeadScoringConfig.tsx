import { useState, useEffect, useCallback } from "react";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, Target, Flame, Thermometer, Snowflake, Save, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface Integration {
  id: string;
  page_name: string;
  form_name: string;
  form_id: string;
  pixel_id: string | null;
}

interface ScoringRule {
  id?: string;
  question: string;
  answer: string;
  score: number;
  is_blocker: boolean;
}

interface DetectedQuestion {
  question: string;
  answers: string[];
}

export function LeadScoringConfig() {
  const { currentAgency } = useAgency();
  const { toast } = useToast();

  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<string>("");
  const [pixelId, setPixelId] = useState("");
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [detectedQuestions, setDetectedQuestions] = useState<DetectedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPixel, setSavingPixel] = useState(false);

  // New rule form
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newScore, setNewScore] = useState(0);
  const [newIsBlocker, setNewIsBlocker] = useState(false);

  const loadIntegrations = useCallback(async () => {
    if (!currentAgency?.id) return;
    const { data } = await supabase
      .from("facebook_lead_integrations")
      .select("id, page_name, form_name, form_id, pixel_id")
      .eq("agency_id", currentAgency.id)
      .eq("is_active", true);
    setIntegrations((data as Integration[]) || []);
    setLoading(false);
  }, [currentAgency?.id]);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  // When integration is selected, load its pixel_id, rules, and detected questions
  useEffect(() => {
    if (!selectedIntegration || !currentAgency?.id) return;

    const integration = integrations.find((i) => i.id === selectedIntegration);
    setPixelId(integration?.pixel_id || "");

    // Load rules
    supabase
      .from("lead_scoring_rules")
      .select("*")
      .eq("agency_id", currentAgency.id)
      .eq("form_id", integration?.form_id || "")
      .then(({ data }) => {
        setRules(
          (data || []).map((r: any) => ({
            id: r.id,
            question: r.question,
            answer: r.answer,
            score: r.score,
            is_blocker: r.is_blocker,
          }))
        );
      });

    // Detect questions from existing leads' custom_fields
    supabase
      .from("leads")
      .select("custom_fields")
      .eq("agency_id", currentAgency.id)
      .eq("source", "facebook_leads")
      .not("custom_fields", "is", null)
      .limit(50)
      .then(({ data }) => {
        const questionsMap: Record<string, Set<string>> = {};
        (data || []).forEach((lead: any) => {
          if (lead.custom_fields && typeof lead.custom_fields === "object") {
            Object.entries(lead.custom_fields).forEach(([key, value]) => {
              if (!questionsMap[key]) questionsMap[key] = new Set();
              if (value && typeof value === "string") questionsMap[key].add(value);
            });
          }
        });
        setDetectedQuestions(
          Object.entries(questionsMap).map(([question, answersSet]) => ({
            question,
            answers: Array.from(answersSet).slice(0, 20),
          }))
        );
      });
  }, [selectedIntegration, currentAgency?.id, integrations]);

  const savePixelId = async () => {
    if (!selectedIntegration) return;
    setSavingPixel(true);
    const { error } = await supabase
      .from("facebook_lead_integrations")
      .update({ pixel_id: pixelId || null })
      .eq("id", selectedIntegration);
    setSavingPixel(false);
    if (error) {
      toast({ title: "Erro ao salvar Pixel ID", variant: "destructive" });
    } else {
      toast({ title: "Pixel ID salvo com sucesso" });
      loadIntegrations();
    }
  };

  const addRule = async () => {
    if (!currentAgency?.id || !newQuestion || !newAnswer) return;
    const integration = integrations.find((i) => i.id === selectedIntegration);
    if (!integration) return;

    setSaving(true);
    const { data, error } = await supabase
      .from("lead_scoring_rules")
      .insert({
        agency_id: currentAgency.id,
        form_id: integration.form_id,
        form_name: integration.form_name,
        question: newQuestion,
        answer: newAnswer,
        score: newScore,
        is_blocker: newIsBlocker,
      })
      .select()
      .single();
    setSaving(false);

    if (error) {
      toast({ title: "Erro ao adicionar regra", variant: "destructive" });
    } else {
      setRules((prev) => [
        ...prev,
        { id: data.id, question: newQuestion, answer: newAnswer, score: newScore, is_blocker: newIsBlocker },
      ]);
      setNewQuestion("");
      setNewAnswer("");
      setNewScore(0);
      setNewIsBlocker(false);
      toast({ title: "Regra adicionada" });
    }
  };

  const deleteRule = async (ruleId: string) => {
    const { error } = await supabase.from("lead_scoring_rules").delete().eq("id", ruleId);
    if (!error) {
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      toast({ title: "Regra removida" });
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 2) return <Badge className="bg-green-500/20 text-green-700">+{score}</Badge>;
    if (score === 1) return <Badge className="bg-emerald-500/20 text-emerald-700">+{score}</Badge>;
    if (score === 0) return <Badge variant="outline">0</Badge>;
    if (score === -1) return <Badge className="bg-orange-500/20 text-orange-700">{score}</Badge>;
    return <Badge className="bg-red-500/20 text-red-700">{score}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Classification Thresholds Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="flex flex-wrap items-center gap-3">
          <span className="font-medium">Classificação automática:</span>
          <span className="inline-flex items-center gap-1">
            <Flame className="h-4 w-4 text-red-500" /> Quente: ≥ 5 pontos
          </span>
          <span className="inline-flex items-center gap-1">
            <Thermometer className="h-4 w-4 text-orange-500" /> Morno: 2 a 4 pontos
          </span>
          <span className="inline-flex items-center gap-1">
            <Snowflake className="h-4 w-4 text-blue-500" /> Frio: ≤ 1 ponto
          </span>
        </AlertDescription>
      </Alert>

      {/* Form Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Configurar Qualificação
          </CardTitle>
          <CardDescription>
            Selecione um formulário para configurar as regras de pontuação e o Pixel Meta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {integrations.length === 0 ? (
            <Alert>
              <AlertDescription>
                Nenhuma integração de formulário ativa encontrada. Configure uma integração de leads do Facebook primeiro.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Formulário</Label>
                <Select value={selectedIntegration} onValueChange={setSelectedIntegration}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um formulário..." />
                  </SelectTrigger>
                  <SelectContent>
                    {integrations.map((int) => (
                      <SelectItem key={int.id} value={int.id}>
                        {int.page_name} — {int.form_name}
                      </SelectItem>
                    ))}</SelectContent>
                </Select>
              </div>

              {selectedIntegration && (
                <>
                  {/* Pixel ID */}
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label>Pixel ID (Meta Conversions API)</Label>
                      <Input
                        value={pixelId}
                        onChange={(e) => setPixelId(e.target.value)}
                        placeholder="Ex: 123456789012345"
                      />
                    </div>
                    <Button onClick={savePixelId} disabled={savingPixel} size="sm">
                      {savingPixel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      <span className="ml-1">Salvar</span>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Eventos como QualifiedLead serão disparados para este pixel quando leads quentes forem detectados.
                  </p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scoring Rules */}
      {selectedIntegration && (
        <Card>
          <CardHeader>
            <CardTitle>Regras de Pontuação</CardTitle>
            <CardDescription>
              Defina a pontuação para cada resposta do formulário. Use bloqueador para desqualificar leads automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing Rules */}
            {rules.length > 0 && (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{rule.question}</p>
                      <p className="text-xs text-muted-foreground truncate">{rule.answer}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      {rule.is_blocker && (
                        <Badge variant="destructive" className="text-xs">
                          Bloqueador
                        </Badge>
                      )}
                      {getScoreBadge(rule.score)}
                      <Button variant="ghost" size="icon" onClick={() => rule.id && deleteRule(rule.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            {/* Add New Rule */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Adicionar regra</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Pergunta</Label>
                  {detectedQuestions.length > 0 ? (
                    <Select value={newQuestion} onValueChange={(v) => { setNewQuestion(v); setNewAnswer(""); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma pergunta..." />
                      </SelectTrigger>
                      <SelectContent>
                        {detectedQuestions.map((q) => (
                          <SelectItem key={q.question} value={q.question}>
                            {q.question}
                          </SelectItem>
                        ))}</SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder="Ex: Quando pretende comprar?"
                    />
                  )}
                </div>
                <div>
                  <Label>Resposta</Label>
                  {newQuestion && detectedQuestions.find((q) => q.question === newQuestion)?.answers.length ? (
                    <Select value={newAnswer} onValueChange={setNewAnswer}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma resposta..." />
                      </SelectTrigger>
                      <SelectContent>
                        {detectedQuestions
                          .find((q) => q.question === newQuestion)
                          ?.answers.map((a) => (
                            <SelectItem key={a} value={a}>
                              {a}
                            </SelectItem>
                          ))}</SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={newAnswer}
                      onChange={(e) => setNewAnswer(e.target.value)}
                      placeholder="Ex: Imediato"
                    />
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-32">
                  <Label>Pontuação</Label>
                  <Select value={String(newScore)} onValueChange={(v) => setNewScore(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-2">-2 (Desqualifica)</SelectItem>
                      <SelectItem value="-1">-1 (Baixa)</SelectItem>
                      <SelectItem value="0">0 (Neutro)</SelectItem>
                      <SelectItem value="1">+1 (Boa)</SelectItem>
                      <SelectItem value="2">+2 (Forte)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={newIsBlocker} onCheckedChange={setNewIsBlocker} />
                  <Label className="text-sm">Bloqueador</Label>
                </div>
                <Button onClick={addRule} disabled={saving || !newQuestion || !newAnswer} size="sm">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span className="ml-1">Adicionar</span>
                </Button>
              </div>
              {newIsBlocker && (
                <p className="text-xs text-destructive">
                  Se a resposta do lead corresponder a esta regra, ele será automaticamente classificado como FRIO independente das outras pontuações.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pipeline Events Info */}
      {selectedIntegration && pixelId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Eventos do Funil → Pixel Meta</CardTitle>
            <CardDescription>
              Eventos disparados automaticamente para o Pixel quando o lead muda de status no funil
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div className="p-2 rounded border text-center">
                <p className="font-medium">Lead</p>
                <p className="text-xs text-muted-foreground">Novo lead</p>
              </div>
              <div className="p-2 rounded border text-center">
                <p className="font-medium">QualifiedLead</p>
                <p className="text-xs text-muted-foreground">Lead quente</p>
              </div>
              <div className="p-2 rounded border text-center">
                <p className="font-medium">Schedule</p>
                <p className="text-xs text-muted-foreground">Visita agendada</p>
              </div>
              <div className="p-2 rounded border text-center">
                <p className="font-medium">Purchase</p>
                <p className="text-xs text-muted-foreground">Venda fechada</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

