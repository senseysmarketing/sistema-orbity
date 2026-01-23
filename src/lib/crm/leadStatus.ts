export type CanonicalLeadStatus =
  | "leads"
  | "em_contato"
  | "qualified"
  | "scheduled"
  | "meeting"
  | "proposal"
  | "won"
  | "lost";

const CANONICAL: Set<string> = new Set([
  "leads",
  "em_contato",
  "qualified",
  "scheduled",
  "meeting",
  "proposal",
  "won",
  "lost",
]);

const stripDiacritics = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * Normaliza qualquer variação (dbStatus, display, statusKey legado/PT-BR) para o dbStatus canônico.
 * Isso é crítico para:
 * - badges/cores (UI)
 * - relatórios (dashboard)
 * - filtros
 */
export function normalizeLeadStatusToDb(rawStatus: string | null | undefined): CanonicalLeadStatus | string {
  if (!rawStatus) return "leads";

  const trimmed = String(rawStatus).trim();
  if (!trimmed) return "leads";

  // 1) Se já é canônico, retorna.
  if (CANONICAL.has(trimmed)) return trimmed as CanonicalLeadStatus;

  // 2) Normalizações comuns (lowercase + underscores + sem acentos)
  const normalizedKey = stripDiacritics(trimmed)
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_");

  // 3) Compat: dbStatus legado
  if (normalizedKey === "new") return "leads";

  // 4) Compat: statusKey / display PT-BR
  const map: Record<string, CanonicalLeadStatus> = {
    leads: "leads",
    lead: "leads",
    em_contato: "em_contato",
    emcontato: "em_contato",
    qualified: "qualified",
    qualificados: "qualified",
    qualificado: "qualified",
    scheduled: "scheduled",
    agendamentos: "scheduled",
    agendamento: "scheduled",
    meeting: "meeting",
    reunioes: "meeting",
    reuniao: "meeting",
    proposal: "proposal",
    propostas: "proposal",
    proposta: "proposal",
    won: "won",
    vendas: "won",
    venda: "won",
    ganho: "won",
    gained: "won",
    lost: "lost",
    perdido: "lost",
    perdida: "lost",
    loss: "lost",
  };

  if (map[normalizedKey]) return map[normalizedKey];

  // 5) fallback: mantém (suporta etapas custom no banco)
  return trimmed;
}
