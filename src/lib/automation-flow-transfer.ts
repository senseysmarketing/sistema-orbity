import { z } from "zod";
import type { AutomationFlow, AutomationFlowDraft, AutomationStepDraft, AutomationStepType } from "@/hooks/useWhatsAppAutomationFlows";

const SCHEMA_LITERAL = "orbity.automation_flow" as const;
const SCHEMA_VERSION = 1 as const;
const MAX_IMPORT_BYTES = 500 * 1024;

const TRIGGER_TYPES = [
  "lead_created",
  "pipeline_stage_entered",
  "lead_idle",
  "whatsapp_message_received",
  "keyword_received",
  "tag_added",
  "owner_changed",
  "task_created",
  "task_completed",
  "meeting_created",
  "proposal_sent",
  "client_created",
  "lead_status_changed",
  "manual",
] as const;

const STEP_TYPES = [
  "condition",
  "send_whatsapp",
  "send_whatsapp_media",
  "delay",
  "action",
  "branch",
  "end",
] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

export const AutomationFlowExportSchema = z.object({
  schema: z.literal(SCHEMA_LITERAL),
  version: z.literal(SCHEMA_VERSION),
  exported_at: z.string(),
  exported_from: z.object({
    app: z.string(),
    agency_name: z.string().nullable().optional(),
  }),
  flow: z.object({
    name: z.string().min(1).max(120),
    description: z.string().nullable().optional(),
    trigger_type: z.enum(TRIGGER_TYPES),
    trigger_config: z.record(z.any()).default({}),
    stop_rules: z.record(z.any()).default({}),
    status: z.literal("inactive"),
  }),
  steps: z.array(z.object({
    position: z.number().int().nonnegative(),
    step_type: z.enum(STEP_TYPES),
    title: z.string().min(1).max(200),
    config: z.record(z.any()).default({}),
  })).min(1),
  metadata: z.object({
    source_flow_name: z.string().optional(),
    contains_tenant_specific_references: z.boolean().optional(),
  }).default({}),
  warnings: z.array(z.string()).default([]),
});

export type AutomationFlowExportFile = z.infer<typeof AutomationFlowExportSchema>;

// ---------- Export sanitization ----------

const TENANT_KEYS_ALWAYS_DROP = ["agency_id", "tenant_id", "user_id", "owner_id", "assigned_to"];
const TENANT_KEYS_TO_PRESERVE_AS_ORIGINAL = ["stage_id", "task_type_id", "pipeline_id", "custom_field_id", "campaign_id", "lead_id", "client_id"];

function sanitizeStepConfigForExport(
  stepType: AutomationStepType,
  config: Record<string, any>,
): { config: Record<string, any>; warnings: string[] } {
  const next: Record<string, any> = { ...config };
  const warnings: string[] = [];

  if (stepType === "action") {
    const action = String(next.action || "");
    if (action === "assign_owner" && (next.owner_id || next.user_id)) {
      next.original_owner_id = next.owner_id || next.user_id;
      delete next.owner_id;
      delete next.user_id;
      next.requires_review = true;
      next.review_reason = "assign_owner_removed_on_export";
      warnings.push("Ação 'Alterar responsável' foi removida — selecione um novo responsável após importar.");
    }
    if ((action === "move_lead" || action === "update_status") && isUuid(next.stage_id)) {
      next.original_stage_id = next.stage_id;
      delete next.stage_id;
      next.requires_review = true;
      warnings.push("Etapa de destino removida — reconfigure a etapa após importar.");
    }
  }

  // Drop sensitive references in any step
  for (const key of TENANT_KEYS_ALWAYS_DROP) {
    if (key in next) delete next[key];
  }
  for (const key of TENANT_KEYS_TO_PRESERVE_AS_ORIGINAL) {
    if (key in next && isUuid(next[key])) {
      next[`original_${key}`] = next[key];
      delete next[key];
      warnings.push(`Campo '${key}' continha um ID específico da agência e foi removido — reconfigure após importar.`);
    }
  }

  return { config: next, warnings };
}

function sanitizeTriggerConfigForExport(config: Record<string, any>): { config: Record<string, any>; warnings: string[] } {
  const next: Record<string, any> = { ...(config || {}) };
  const warnings: string[] = [];

  for (const key of TENANT_KEYS_ALWAYS_DROP) {
    if (key in next) {
      delete next[key];
      warnings.push(`Configuração do gatilho continha '${key}' e foi removida.`);
    }
  }
  for (const key of TENANT_KEYS_TO_PRESERVE_AS_ORIGINAL) {
    if (key in next && isUuid(next[key])) {
      next[`original_${key}`] = next[key];
      delete next[key];
      warnings.push(`Gatilho referenciava '${key}' específico — reconfigure após importar.`);
    }
  }

  return { config: next, warnings };
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

export interface BuildExportInput {
  flow: AutomationFlow;
  agencyName?: string | null;
}

export function buildAutomationFlowExport({ flow, agencyName }: BuildExportInput): AutomationFlowExportFile {
  const allWarnings: string[] = [];

  const sortedSteps = [...(flow.automation_steps || [])]
    .filter((s: any) => !s.is_deleted)
    .sort((a: any, b: any) => (a.position || 0) - (b.position || 0));

  const triggerSan = sanitizeTriggerConfigForExport(flow.trigger_config || {});
  allWarnings.push(...triggerSan.warnings);

  const exportedSteps = sortedSteps.map((step, idx) => {
    const san = sanitizeStepConfigForExport(step.step_type as AutomationStepType, (step.config as any) || {});
    allWarnings.push(...san.warnings);
    return {
      position: idx,
      step_type: step.step_type as typeof STEP_TYPES[number],
      title: step.title || `Bloco ${idx + 1}`,
      config: san.config,
    };
  });

  const warnings = dedupe(allWarnings);

  const payload: AutomationFlowExportFile = {
    schema: SCHEMA_LITERAL,
    version: SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    exported_from: {
      app: "Orbity",
      agency_name: agencyName ?? null,
    },
    flow: {
      name: flow.name,
      description: flow.description ?? null,
      trigger_type: flow.trigger_type as typeof TRIGGER_TYPES[number],
      trigger_config: triggerSan.config,
      stop_rules: flow.stop_rules || {},
      status: "inactive",
    },
    steps: exportedSteps,
    metadata: {
      source_flow_name: flow.name,
      contains_tenant_specific_references: warnings.length > 0,
    },
    warnings,
  };

  return AutomationFlowExportSchema.parse(payload);
}

function slugify(value: string): string {
  return (value || "fluxo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "fluxo";
}

export function downloadAutomationFlowFile(payload: AutomationFlowExportFile, flowName: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(flowName)}.orbity-flow.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// ---------- Import sanitization ----------

function sanitizeImportedStepConfig(
  stepType: AutomationStepType,
  config: Record<string, any>,
): { config: Record<string, any>; warnings: string[] } {
  const next: Record<string, any> = { ...(config || {}) };
  const warnings: string[] = [];

  if (stepType === "action") {
    const action = String(next.action || "");
    if (action === "assign_owner" && (next.owner_id || next.user_id || next.original_owner_id)) {
      delete next.owner_id;
      delete next.user_id;
      delete next.original_owner_id;
      warnings.push("Ação 'Alterar responsável' importada sem destinatário — selecione um responsável antes de ativar.");
    }
    if ((action === "move_lead" || action === "update_status") && (next.stage_id || next.original_stage_id)) {
      if (isUuid(next.stage_id) || next.original_stage_id) {
        delete next.stage_id;
        delete next.original_stage_id;
        warnings.push("Etapa de destino não importada — reconfigure a etapa antes de ativar.");
      }
    }
  }

  for (const key of [...TENANT_KEYS_ALWAYS_DROP, ...TENANT_KEYS_TO_PRESERVE_AS_ORIGINAL]) {
    if (key in next) delete next[key];
    const originalKey = `original_${key}`;
    if (originalKey in next) delete next[originalKey];
  }
  delete next.requires_review;
  delete next.review_reason;

  return { config: next, warnings };
}

function sanitizeImportedTriggerConfig(config: Record<string, any>): { config: Record<string, any>; warnings: string[] } {
  const next: Record<string, any> = { ...(config || {}) };
  const warnings: string[] = [];

  for (const key of [...TENANT_KEYS_ALWAYS_DROP, ...TENANT_KEYS_TO_PRESERVE_AS_ORIGINAL]) {
    if (key in next) delete next[key];
    const originalKey = `original_${key}`;
    if (originalKey in next) {
      delete next[originalKey];
      warnings.push(`Gatilho referenciava '${key}' da agência de origem — reconfigure antes de ativar.`);
    }
  }

  return { config: next, warnings };
}

function normalizeImportedStopRules(rules: Record<string, any> | undefined | null): Record<string, any> {
  const r = rules || {};
  return {
    stop_on_reply: r.stop_on_reply !== false,
    stop_on_final_status: r.stop_on_final_status !== false,
    stop_on_manual_owner_change: r.stop_on_manual_owner_change === true,
    stop_on_tag_added: typeof r.stop_on_tag_added === "string" ? r.stop_on_tag_added : "",
    avoid_conflicts: r.avoid_conflicts !== false,
  };
}

export interface ImportResult {
  form: AutomationFlowDraft;
  warnings: string[];
}

export function parseAutomationFlowImport(text: string): ImportResult {
  if (text.length > MAX_IMPORT_BYTES) {
    throw new Error("Arquivo muito grande (limite de 500 KB).");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Arquivo inválido: não é um JSON válido.");
  }

  const parsed = AutomationFlowExportSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Arquivo inválido: schema desconhecido ou versão não suportada.");
  }

  const data = parsed.data;
  const warnings: string[] = [...(data.warnings || [])];

  const triggerSan = sanitizeImportedTriggerConfig(data.flow.trigger_config || {});
  warnings.push(...triggerSan.warnings);

  const steps: AutomationStepDraft[] = data.steps
    .filter((s) => s.step_type !== ("trigger" as any))
    .sort((a, b) => a.position - b.position)
    .map((s) => {
      const san = sanitizeImportedStepConfig(s.step_type as AutomationStepType, s.config || {});
      warnings.push(...san.warnings);
      return {
        step_type: s.step_type as AutomationStepType,
        title: s.title,
        config: san.config,
      };
    });

  if (steps.length === 0) {
    throw new Error("Arquivo não contém blocos de automação válidos.");
  }

  const form: AutomationFlowDraft = {
    name: `${data.flow.name} (importado)`.slice(0, 120),
    description: data.flow.description || "",
    status: "inactive",
    trigger_type: data.flow.trigger_type,
    trigger_config: triggerSan.config,
    stop_rules: normalizeImportedStopRules(data.flow.stop_rules),
    steps,
  };

  return { form, warnings: dedupe(warnings) };
}

export const __test = {
  SCHEMA_LITERAL,
  SCHEMA_VERSION,
  MAX_IMPORT_BYTES,
  sanitizeStepConfigForExport,
  sanitizeImportedStepConfig,
  normalizeImportedStopRules,
};
