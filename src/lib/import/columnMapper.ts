/**
 * Smart column mapper — auto-detects spreadsheet columns to system fields
 * by matching normalized synonyms (case-insensitive, accent-insensitive).
 */

export type ClientField =
  | "name"
  | "email"
  | "phone"
  | "document"
  | "status"
  | "monthly_fee"
  | "due_day";

export const CLIENT_FIELDS: { value: ClientField; label: string; required: boolean }[] = [
  { value: "name", label: "Nome", required: true },
  { value: "email", label: "Email", required: false },
  { value: "phone", label: "Telefone", required: false },
  { value: "document", label: "CPF/CNPJ", required: false },
  { value: "status", label: "Status (LEAD/ATIVO)", required: true },
  { value: "monthly_fee", label: "Mensalidade", required: false },
  { value: "due_day", label: "Dia de Vencimento", required: false },
];

export const REQUIRED_CLIENT_FIELDS: ClientField[] = ["name", "status"];

const SYNONYMS: Record<ClientField, string[]> = {
  name: ["nome", "cliente", "razaosocial", "razao", "nomecliente", "nomecompleto"],
  email: ["email", "emails", "correio", "mail", "e-mail"],
  phone: ["telefone", "celular", "contato", "whatsapp", "whats", "fone", "tel"],
  document: ["cpf", "cnpj", "documento", "cpfcnpj", "doc"],
  status: ["status", "situacao", "tipo", "categoria", "estagio"],
  monthly_fee: ["mensalidade", "valor", "valormensal", "fee", "preco", "valorcontrato"],
  due_day: ["diavencimento", "dia", "vencimento", "diadovencimento", "duedate", "dueday"],
};

export function normalizeHeader(value: string): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\*/g, "")
    .replace(/[\s_\-./]+/g, "")
    .trim();
}

export function autoMapColumns(
  headers: string[]
): Record<string, ClientField | null> {
  const result: Record<string, ClientField | null> = {};
  const used = new Set<ClientField>();

  for (const header of headers) {
    const normalized = normalizeHeader(header);
    let matched: ClientField | null = null;

    for (const field of Object.keys(SYNONYMS) as ClientField[]) {
      if (used.has(field)) continue;
      if (SYNONYMS[field].some((s) => normalized === s || normalized.includes(s))) {
        matched = field;
        used.add(field);
        break;
      }
    }

    result[header] = matched;
  }

  return result;
}

export function isFullyAutoMapped(
  mapping: Record<string, ClientField | null>
): boolean {
  const mapped = new Set(Object.values(mapping).filter(Boolean) as ClientField[]);
  return REQUIRED_CLIENT_FIELDS.every((f) => mapped.has(f));
}

export function applyMapping(
  rows: Record<string, unknown>[],
  mapping: Record<string, ClientField | null>
): Record<string, unknown>[] {
  return rows.map((row) => {
    const mapped: Record<string, unknown> = {};
    for (const [original, target] of Object.entries(mapping)) {
      if (target) mapped[target] = row[original];
    }
    return mapped;
  });
}
