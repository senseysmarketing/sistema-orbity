import { useState, useEffect, useCallback } from "react";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2, Target, Flame, Thermometer, Snowflake, Save, Info,
  RefreshCw, Facebook, CheckCircle2, Clock, Trash2, Settings2, Globe
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

// ── Types ──────────────────────────────────────────────
interface Integration {
  id: string;
  page_id: string;
  page_name: string;
  form_name: string;
  form_id: string;
  pixel_id: string | null;
  form_questions: DetectedQuestion[] | null;
  _parentId?: string;
  _isVirtual?: boolean;
  _isWebhook?: boolean;
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

interface FormData {
  rules: ScoringRule[];
  detectedQuestions: DetectedQuestion[];
  loading: boolean;
}

const TECHNICAL_FIELDS = new Set([
  // Meta/technical metadata
  "ad_id", "ad_name", "adset_id", "adset_name", "campaign_id",
  "campaign_name", "form_id", "platform", "leadgen_id", "created_time",
  "page_id", "page_name", "is_organic",
  // Personal/contact fields (not qualifying)
  "email", "e-mail", "e_mail", "email_address",
  "full_name", "first_name", "last_name", "nome", "nome_completo",
  "sobrenome", "name", "primeiro_nome",
  "phone", "phone_number", "telefone", "celular", "whatsapp",
  "numero_de_telefone", "tel", "mobile",
  // Address/location fields
  "city", "cidade", "state", "estado", "zip", "cep", "zip_code",
  "country", "pais", "street_address", "endereco", "endereço",
  "bairro", "neighborhood", "address",
  // Document fields
  "cpf", "cnpj", "rg", "document",
]);

const OPEN_ENDED_THRESHOLD = 15;

const SCORE_OPTIONS = [
  { value: "-2", label: "Muito negativo (-2)", color: "text-destructive" },
  { value: "-1", label: "Negativo (-1)", color: "text-orange-600" },
  { value: "0", label: "Neutro (0)", color: "text-muted-foreground" },
  { value: "1", label: "Positivo (+1)", color: "text-emerald-600" },
  { value: "2", label: "Muito positivo (+2)", color: "text-green-600" },
];

// ── Temperature Legend ─────────────────────────────────
function TemperatureLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      <span className="font-medium text-foreground">Classificação:</span>
      <span className="inline-flex items-center gap-1">
        <Flame className="h-4 w-4 text-red-500" /> Quente: ≥ 5 pts
      </span>
      <span className="inline-flex items-center gap-1">
        <Thermometer className="h-4 w-4 text-orange-500" /> Morno: 2–4 pts
      </span>
      <span className="inline-flex items-center gap-1">
        <Snowflake className="h-4 w-4 text-blue-500" /> Frio: ≤ 1 pt
      </span>
    </div>
  );
}

// ── Question Scoring Block ─────────────────────────────
function QuestionScoringBlock({
  question,
  answers,
  rules,
  onRuleChange,
  enabled,
  onToggle,
  isOpenEnded,
}: {
  question: string;
  answers: string[];
  rules: ScoringRule[];
  onRuleChange: (question: string, answer: string, score: number, is_blocker: boolean) => void;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  isOpenEnded: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          className="shrink-0"
        />
        <p className={`text-sm font-medium flex-1 min-w-0 truncate ${enabled ? "text-foreground" : "text-muted-foreground"}`}>
          {question}
        </p>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
          {answers.length} resposta{answers.length > 1 ? "s" : ""}
        </Badge>
        {isOpenEnded && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 text-yellow-600 border-yellow-200">
            Pergunta aberta
          </Badge>
        )}
      </div>
      {enabled && (
        <div className="space-y-1.5 pl-3 ml-5 border-l-2 border-muted">
          {answers.map((answer) => {
            const existingRule = rules.find(
              (r) => r.question === question && r.answer === answer
            );
            const currentScore = existingRule?.score ?? 0;
            const isBlocker = existingRule?.is_blocker ?? false;

            return (
              <div
                key={answer}
                className="flex items-center gap-3 py-1.5"
              >
                <span className="text-sm text-muted-foreground flex-1 min-w-0 truncate">
                  "{answer}"
                </span>
                <Select
                  value={String(currentScore)}
                  onValueChange={(v) => onRuleChange(question, answer, Number(v), isBlocker)}
                >
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCORE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className={opt.color}>{opt.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1.5">
                  <Switch
                    checked={isBlocker}
                    onCheckedChange={(b) => onRuleChange(question, answer, currentScore, b)}
                    className="scale-75"
                  />
                  <span className="text-[10px] text-muted-foreground w-14">Bloqueador</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Sync Meta Dialog ───────────────────────────────────
function SyncMetaDialog({
  open,
  onOpenChange,
  agencyId,
  existingFormIds,
  onSynced,
  configuredPages,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  existingFormIds: Set<string>;
  onSynced: () => void;
  configuredPages: Array<{ page_id: string; page_name: string }>;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [allForms, setAllForms] = useState<
    Array<{ pageId: string; pageName: string; pageToken: string; formId: string; formName: string; exists: boolean }>
  >([]);

  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const fetchFormsFromMeta = async () => {
    setLoading(true);
    setAllForms([]);
    setProgress({ done: 0, total: configuredPages.length });
    try {
      if (configuredPages.length === 0) {
        setLoading(false);
        return;
      }

      // Call list_forms directly for each configured page (edge function auto-fetches page token)
      const formsAccum: typeof allForms = [];
      const results = await Promise.allSettled(
        configuredPages.map((page) =>
          supabase.functions.invoke("facebook-leads", {
            body: { action: "list_forms", agencyId, pageId: page.page_id },
          }).then(({ data, error }) => {
            if (error) throw error;
            return { page, forms: data?.forms || [] };
          })
        )
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          for (const f of result.value.forms) {
            formsAccum.push({
              pageId: result.value.page.page_id,
              pageName: result.value.page.page_name,
              pageToken: "",
              formId: f.id,
              formName: f.name,
              exists: existingFormIds.has(f.id),
            });
          }
        }
      }
      setProgress({ done: configuredPages.length, total: configuredPages.length });
      setAllForms(formsAccum);
    } catch (err: any) {
      toast({ title: "Erro ao buscar formulários", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchFormsFromMeta();
  }, [open]);

  const connectionId = async () => {
    const { data } = await supabase
      .from("facebook_connections")
      .select("id")
      .eq("agency_id", agencyId)
      .eq("is_active", true)
      .limit(1)
      .single();
    return data?.id;
  };

  const importForm = async (form: (typeof allForms)[0]) => {
    setSaving(true);
    try {
      const connId = await connectionId();
      if (!connId) throw new Error("Nenhuma conexão Facebook ativa");

      await supabase.functions.invoke("facebook-leads", {
        body: {
          action: "save_integration",
          agencyId,
          connectionId: connId,
          pageId: form.pageId,
          pageName: form.pageName,
          pageAccessToken: form.pageToken,
          formId: form.formId,
          formName: form.formName,
          defaultStatus: "new",
          defaultPriority: "cold",
        },
      });

      toast({ title: `Formulário "${form.formName}" importado!` });
      setAllForms((prev) =>
        prev.map((f) => (f.formId === form.formId ? { ...f, exists: true } : f))
      );
      onSynced();
    } catch (err: any) {
      toast({ title: "Erro ao importar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const importAll = async () => {
    const newForms = allForms.filter((f) => !f.exists);
    for (const f of newForms) {
      await importForm(f);
    }
  };

  const newCount = allForms.filter((f) => !f.exists).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5" />
            Sincronizar Formulários Meta
          </DialogTitle>
          <DialogDescription>
            Importar formulários do Facebook Lead Ads para configurar qualificação
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {progress.total > 0
                ? `Buscando formulários... (${progress.done}/${progress.total} páginas)`
                : "Buscando páginas..."}
            </p>
            {allForms.length > 0 && (
              <p className="text-xs text-muted-foreground">{allForms.length} formulário(s) encontrado(s)</p>
            )}
          </div>
        ) : allForms.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum formulário encontrado nas páginas conectadas.
          </p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {allForms.map((form) => (
              <div
                key={form.formId}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{form.formName}</p>
                  <p className="text-xs text-muted-foreground truncate">{form.pageName}</p>
                </div>
                {form.exists ? (
                  <Badge variant="outline" className="text-green-600 border-green-200 shrink-0">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Importado
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => importForm(form)}
                    disabled={saving}
                    className="shrink-0"
                  >
                    Importar
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {newCount > 0 && (
          <Button onClick={importAll} disabled={saving} className="w-full">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Importar todos ({newCount})
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Form Accordion Item ────────────────────────────────
function FormAccordionItem({
  integration,
  agencyId,
  onDeleted,
  isConfiguredFromParent,
  ruleCountFromParent,
}: {
  integration: Integration;
  agencyId: string;
  onDeleted: () => void;
  isConfiguredFromParent: boolean;
  ruleCountFromParent: number;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormData>({
    rules: [],
    detectedQuestions: [],
    loading: true,
  });
  const [saving, setSaving] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, ScoringRule>>(new Map());
  const [enabledQuestions, setEnabledQuestions] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const loadFormData = useCallback(async () => {
    if (loaded) return;

    const parentId = integration._parentId || integration.id;
    const targetFormId = integration.form_id;

    // Load rules
    const rulesRes = await supabase
      .from("lead_scoring_rules")
      .select("*")
      .eq("agency_id", agencyId)
      .eq("form_id", targetFormId);

    // Get lead_ids from sync_log filtered by form
    const { data: syncData } = await supabase
      .from("facebook_lead_sync_log")
      .select("lead_id, lead_data")
      .eq("integration_id", parentId)
      .limit(500);

    // Filter by real form_id if this is a virtual entry from "all"
    const leadIds = (syncData || [])
      .filter((row: any) => {
        if (!integration._isVirtual) return true;
        return String(row.lead_data?.form_id) === targetFormId;
      })
      .map((row: any) => row.lead_id)
      .filter(Boolean);

    // Fetch leads by IDs to get custom_fields
    let leadsData: any[] = [];
    if (leadIds.length > 0) {
      const { data } = await supabase
        .from("leads")
        .select("custom_fields")
        .in("id", leadIds.slice(0, 100))
        .not("custom_fields", "is", null);
      leadsData = data || [];
    }

    const rules: ScoringRule[] = (rulesRes.data || []).map((r: any) => ({
      id: r.id,
      question: r.question,
      answer: r.answer,
      score: r.score,
      is_blocker: r.is_blocker,
    }));

    // Build questions map - start with cached form_questions if available
    const questionsMap: Record<string, Set<string>> = {};
    let usedCache = false;

    if (integration.form_questions && Array.isArray(integration.form_questions) && integration.form_questions.length > 0) {
      // Use cached questions from DB
      for (const q of integration.form_questions) {
        if (q.question && q.answers) {
          questionsMap[q.question] = new Set(q.answers);
        }
      }
      usedCache = true;
    }

    // Also add questions detected from lead data
    leadsData.forEach((lead: any) => {
      if (lead.custom_fields && typeof lead.custom_fields === "object") {
        Object.entries(lead.custom_fields).forEach(([key, value]) => {
          if (TECHNICAL_FIELDS.has(key)) return;
          if (!questionsMap[key]) questionsMap[key] = new Set();
          if (value && typeof value === "string") questionsMap[key].add(value);
        });
      }
    });

    // If no cached questions, fetch from Meta API and persist
    if (!usedCache) {
      try {
        const { data: metaData, error: metaError } = await supabase.functions.invoke("facebook-leads", {
          body: {
            action: "list_form_questions",
            agencyId,
            pageId: integration.page_id,
            formId: targetFormId,
          },
        });

        if (!metaError && metaData?.questions) {
          for (const q of metaData.questions) {
            const key = q.key;
            if (!key || TECHNICAL_FIELDS.has(key)) continue;
            if (!questionsMap[key]) questionsMap[key] = new Set();
            if (q.options && Array.isArray(q.options)) {
              for (const opt of q.options) {
                if (opt.value) questionsMap[key].add(opt.value);
              }
            }
          }

          // Persist questions to DB for caching (only for non-virtual integrations)
          const questionsToCache = Object.entries(questionsMap)
            .map(([question, answersSet]) => ({
              question,
              answers: Array.from(answersSet).slice(0, 20),
            }))
            .filter((q) => q.answers.length > 0);

          if (questionsToCache.length > 0 && !integration._isVirtual) {
            await supabase
              .from("facebook_lead_integrations")
              .update({ form_questions: questionsToCache } as any)
              .eq("id", integration.id);
          }
        }
      } catch (metaErr) {
        console.warn("Could not fetch Meta form questions:", metaErr);
      }
    }

    const detectedQuestions = Object.entries(questionsMap)
      .map(([question, answersSet]) => ({
        question,
        answers: Array.from(answersSet).slice(0, 20),
      }))
      .filter((q) => q.answers.length > 0);

    // Initialize pending changes from existing rules
    const changes = new Map<string, ScoringRule>();
    const activeQuestions = new Set<string>();
    rules.forEach((r) => {
      changes.set(`${r.question}|||${r.answer}`, r);
      activeQuestions.add(r.question);
    });

    setPendingChanges(changes);
    setEnabledQuestions(activeQuestions);
    setFormData({ rules, detectedQuestions, loading: false });
    setLoaded(true);
  }, [agencyId, integration.form_id, integration.pixel_id, integration._parentId, integration._isVirtual, integration.form_questions, loaded]);

  const handleRuleChange = (question: string, answer: string, score: number, is_blocker: boolean) => {
    const key = `${question}|||${answer}`;
    const existing = formData.rules.find((r) => r.question === question && r.answer === answer);
    setPendingChanges((prev) => {
      const next = new Map(prev);
      next.set(key, {
        id: existing?.id,
        question,
        answer,
        score,
        is_blocker,
      });
      return next;
    });
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      // Delete existing rules for this form
      await supabase
        .from("lead_scoring_rules")
        .delete()
        .eq("agency_id", agencyId)
        .eq("form_id", integration.form_id);

      // Insert only rules for enabled questions with non-zero scores or blockers
      const rulesToInsert = Array.from(pendingChanges.values())
        .filter((r) => enabledQuestions.has(r.question) && (r.score !== 0 || r.is_blocker))
        .map((r) => ({
          agency_id: agencyId,
          form_id: integration.form_id,
          form_name: integration.form_name,
          question: r.question,
          answer: r.answer,
          score: r.score,
          is_blocker: r.is_blocker,
        }));

      if (rulesToInsert.length > 0) {
        const { error } = await supabase.from("lead_scoring_rules").insert(rulesToInsert);
        if (error) throw error;
      }

      // Optionally re-qualify existing leads from this specific form
      if (updateExisting) {
        // Only re-qualify leads that match THIS form's questions.
        // We paginate to avoid the previous 500-lead hard limit.
        const activeQuestionKeys = new Set(rulesToInsert.map(r => r.question));

        const PAGE_SIZE = 200;
        const candidateLeads: Array<{ id: string }> = [];
        let page = 0;

        while (true) {
          const { data: pageLeads } = await supabase
            .from("leads")
            .select("id, custom_fields")
            .eq("agency_id", agencyId)
            .eq("source", "facebook_leads")
            .not("custom_fields", "is", null)
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

          if (!pageLeads || pageLeads.length === 0) break;

          // Keep only leads that have at least one question key from this form
          for (const lead of pageLeads) {
            if (!lead.custom_fields || typeof lead.custom_fields !== 'object') continue;
            const keys = Object.keys(lead.custom_fields);
            if (keys.some(k => activeQuestionKeys.has(k))) {
              candidateLeads.push({ id: lead.id });
            }
          }

          if (pageLeads.length < PAGE_SIZE) break;
          page++;
        }

        if (candidateLeads.length > 0) {
          const batchSize = 10;
          let processed = 0;
          let successes = 0;
          let failures = 0;

          for (let i = 0; i < candidateLeads.length; i += batchSize) {
            const batch = candidateLeads.slice(i, i + batchSize);
            const results = await Promise.allSettled(
              batch.map((lead) =>
                supabase.functions.invoke("process-lead-qualification", {
                  body: { lead_id: lead.id, agency_id: agencyId },
                })
              )
            );

            for (const r of results) {
              processed++;
              if (r.status === 'fulfilled') successes++;
              else failures++;
            }
          }

          toast({
            title: `Leads atualizados: ${successes}/${processed}`,
            description: failures > 0 ? `${failures} falha(s)` : undefined,
          });
        }
      }

      toast({ title: "Configuração salva com sucesso!" });
      setLoaded(false); // force reload
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteIntegration = async () => {
    await supabase.from("lead_scoring_rules").delete().eq("form_id", integration.form_id).eq("agency_id", agencyId);
    if (integration._isVirtual) {
      // Virtual entry: only delete rules, not the parent integration
      toast({ title: "Regras do formulário removidas" });
      onDeleted();
      return;
    }
    const { error } = await supabase.from("facebook_lead_integrations").delete().eq("id", integration.id);
    if (!error) {
      toast({ title: "Formulário removido" });
      onDeleted();
    }
  };

  const configuredCount = loaded ? formData.rules.length : ruleCountFromParent;
  const isConfigured = loaded ? configuredCount > 0 : isConfiguredFromParent;
  const questionsCount = loaded ? formData.detectedQuestions.length : (integration.form_questions?.length || 0);

  // Check if there are actual pending changes vs saved rules
  const hasChanges = (() => {
    if (!loaded) return false;
    const savedKeys = new Set(formData.rules.map((r) => `${r.question}|||${r.answer}|||${r.score}|||${r.is_blocker}`));
    const pendingKeys = new Set(
      Array.from(pendingChanges.values())
        .filter((r) => r.score !== 0 || r.is_blocker)
        .map((r) => `${r.question}|||${r.answer}|||${r.score}|||${r.is_blocker}`)
    );
    if (savedKeys.size !== pendingKeys.size) return true;
    for (const k of savedKeys) {
      if (!pendingKeys.has(k)) return true;
    }
    return false;
  })();

  return (
    <AccordionItem value={integration.id} className="border rounded-lg px-1">
      <AccordionTrigger className="hover:no-underline py-3 px-3" onClick={loadFormData}>
        <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <Settings2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm truncate">
                [{integration.page_name}] {integration.form_name}
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                <Facebook className="h-3 w-3 mr-0.5" /> Meta
              </Badge>
              {isConfigured ? (
                <Badge variant="outline" className="text-green-600 border-green-200 text-[10px] px-1.5 py-0">
                  <CheckCircle2 className="h-3 w-3 mr-0.5" /> Configurado
                </Badge>
              ) : (
                <Badge variant="outline" className="text-yellow-600 border-yellow-200 text-[10px] px-1.5 py-0">
                  <Clock className="h-3 w-3 mr-0.5" /> Pendente
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {questionsCount > 0
                ? `${questionsCount} pergunta${questionsCount > 1 ? "s" : ""} detectada${questionsCount > 1 ? "s" : ""}`
                : loaded ? "Nenhuma pergunta detectada" : "Clique para carregar"}
              {configuredCount > 0 && ` · ${configuredCount} regra${configuredCount > 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-3 pb-4">
        {formData.loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Scoring rules below */}

            {/* Questions & Scoring */}
            {formData.detectedQuestions.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Selecione as perguntas qualificatórias</p>
                <p className="text-xs text-muted-foreground -mt-2">
                  Ative apenas as perguntas que deseja usar para qualificação de leads
                </p>
                {formData.detectedQuestions.map((q) => {
                  const isOpenEnded = q.answers.length > OPEN_ENDED_THRESHOLD;
                  return (
                    <QuestionScoringBlock
                      key={q.question}
                      question={q.question}
                      answers={q.answers}
                      rules={Array.from(pendingChanges.values())}
                      onRuleChange={handleRuleChange}
                      enabled={enabledQuestions.has(q.question)}
                      onToggle={(on) => {
                        setEnabledQuestions((prev) => {
                          const next = new Set(prev);
                          if (on) next.add(q.question);
                          else next.delete(q.question);
                          return next;
                        });
                      }}
                      isOpenEnded={isOpenEnded}
                    />
                  );
                })}
              </div>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Nenhuma pergunta detectada. As perguntas aparecem automaticamente quando leads chegam, ou sincronize os formulários da Meta.
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            {/* Temperature Legend */}
            <TemperatureLegend />

            {/* Pipeline Events info removed - Pixel is now configured in Integrações tab */}

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`update-${integration.id}`}
                  checked={updateExisting}
                  onCheckedChange={(c) => setUpdateExisting(!!c)}
                />
                <Label htmlFor={`update-${integration.id}`} className="text-xs cursor-pointer">
                  Atualizar leads existentes
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deleteIntegration}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir
                </Button>
                <Button
                  onClick={saveConfig}
                  disabled={saving || (!hasChanges && !updateExisting)}
                  size="sm"
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Salvar Configuração
                </Button>
              </div>
            </div>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

// ── Main Component ─────────────────────────────────────
export function LeadScoringConfig() {
  const { currentAgency } = useAgency();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [configuredPages, setConfiguredPages] = useState<Array<{ page_id: string; page_name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "meta" | "configured" | "pending">("all");

  const loadIntegrations = useCallback(async () => {
    if (!currentAgency?.id) return;
    const { data } = await supabase
      .from("facebook_lead_integrations")
      .select("id, page_id, page_name, form_name, form_id, pixel_id, form_questions")
      .eq("agency_id", currentAgency.id)
      .eq("is_active", true);

    const rawIntegrations = (data || []) as unknown as Integration[];

    // Extract unique pages BEFORE filtering, so configuredPages is always populated
    const uniquePages = [...new Map(
      rawIntegrations.map((i) => [i.page_id, { page_id: i.page_id, page_name: i.page_name }])
    ).values()];
    setConfiguredPages(uniquePages);

    const expanded: Integration[] = [];

    for (const int of rawIntegrations) {
      if (int.form_id === "all") {
        // Expand "all" into individual real forms from sync_log
        const { data: syncData } = await supabase
          .from("facebook_lead_sync_log")
          .select("lead_data")
          .eq("integration_id", int.id)
          .limit(500);

        const formMap = new Map<string, string>();
        (syncData || []).forEach((row: any) => {
          const fid = row.lead_data?.form_id;
          const fname = row.lead_data?.form_name;
          if (fid && !formMap.has(String(fid))) {
            formMap.set(String(fid), fname || `Formulário ${fid}`);
          }
        });

        if (formMap.size > 0) {
          for (const [realFormId, realFormName] of formMap) {
            expanded.push({
              ...int,
              id: `${int.id}__${realFormId}`,
              form_id: realFormId,
              form_name: realFormName,
              _parentId: int.id,
              _isVirtual: true,
            });
          }
        }
        // If no leads yet, skip — don't show "all" in qualification
      } else {
        expanded.push(int);
      }
    }

    setIntegrations(expanded);
    setLoading(false);
  }, [currentAgency?.id]);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  // We need to know which forms have rules to show configured badge
  const [configuredFormIds, setConfiguredFormIds] = useState<Set<string>>(new Set());
  const [ruleCounts, setRuleCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!currentAgency?.id || integrations.length === 0) return;
    supabase
      .from("lead_scoring_rules")
      .select("form_id")
      .eq("agency_id", currentAgency.id)
      .then(({ data }) => {
        const formIds = new Set<string>();
        const counts: Record<string, number> = {};
        for (const r of data || []) {
          formIds.add((r as any).form_id);
          counts[(r as any).form_id] = (counts[(r as any).form_id] || 0) + 1;
        }
        setConfiguredFormIds(formIds);
        setRuleCounts(counts);
      });
  }, [currentAgency?.id, integrations]);

  const configuredCount = integrations.filter((i) => configuredFormIds.has(i.form_id)).length;
  const totalCount = integrations.length;
  const progressPercent = totalCount > 0 ? (configuredCount / totalCount) * 100 : 0;

  const filteredIntegrations = integrations.filter((i) => {
    if (filter === "configured") return configuredFormIds.has(i.form_id);
    if (filter === "pending") return !configuredFormIds.has(i.form_id);
    return true; // "all" and "meta" (all are meta for now)
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header with legend */}
      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5" />
            Qualificação Automática
          </h3>
          <p className="text-sm text-muted-foreground">
            Defina regras de pontuação por formulário para qualificar leads automaticamente
          </p>
        </div>
        <TemperatureLegend />
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {configuredCount}/{totalCount} formulário{totalCount > 1 ? "s" : ""} configurado{configuredCount > 1 ? "s" : ""}
            </span>
            <span className="text-muted-foreground">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      )}

      {/* Filters + Sync */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {(["all", "configured", "pending"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter(f)}
              className="h-7 text-xs px-3"
            >
              {f === "all" ? "Todos" : f === "configured" ? "Configurados" : "Pendentes"}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => setSyncDialogOpen(true)} className="h-7">
          <RefreshCw className="h-3 w-3 mr-1" />
          Sincronizar Meta
        </Button>
      </div>

      {/* Forms Accordion */}
      {filteredIntegrations.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {totalCount === 0
                ? "Nenhum formulário encontrado. Clique em \"Sincronizar Meta\" para importar formulários."
                : "Nenhum formulário corresponde ao filtro selecionado."}
            </p>
            {totalCount === 0 && (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setSyncDialogOpen(true)}>
                <Facebook className="h-4 w-4 mr-1" />
                Sincronizar Formulários
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-2">
          {filteredIntegrations.map((integration) => (
             <FormAccordionItem
              key={integration.id}
              integration={integration}
              agencyId={currentAgency!.id}
              onDeleted={loadIntegrations}
              isConfiguredFromParent={configuredFormIds.has(integration.form_id)}
              ruleCountFromParent={ruleCounts[integration.form_id] || 0}
            />
          ))}
        </Accordion>
      )}

      {/* Sync Dialog */}
      {currentAgency && (
        <SyncMetaDialog
          open={syncDialogOpen}
          onOpenChange={setSyncDialogOpen}
          agencyId={currentAgency.id}
          existingFormIds={new Set(integrations.map((i) => i.form_id))}
          onSynced={loadIntegrations}
          configuredPages={configuredPages}
        />
      )}
    </div>
  );
}
