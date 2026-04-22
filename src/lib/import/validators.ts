import { z } from 'zod';

// ===== Client v2 (LEAD/ATIVO with conditional fields) =====
export const ClientImportSchemaV2 = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z
    .string()
    .email("Email inválido")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  phone: z
    .union([z.string(), z.number()])
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null;
      const phoneStr = String(val).replace(/\D/g, "");
      if (!phoneStr) return null;
      if (phoneStr.length === 11) {
        return `+55 (${phoneStr.slice(0, 2)}) ${phoneStr.slice(2, 7)}-${phoneStr.slice(7)}`;
      }
      if (phoneStr.length === 10) {
        return `+55 (${phoneStr.slice(0, 2)}) ${phoneStr.slice(2, 6)}-${phoneStr.slice(6)}`;
      }
      return phoneStr;
    })
    .optional()
    .nullable(),
  document: z
    .union([z.string(), z.number()])
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null;
      return String(val).replace(/\D/g, "");
    })
    .optional()
    .nullable(),
  status: z.enum(["LEAD", "ATIVO"], {
    errorMap: () => ({ message: "Status deve ser LEAD ou ATIVO" }),
  }),
  monthly_fee: z
    .union([z.number(), z.string()])
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null;
      const n = typeof val === "string" ? parseFloat(val.replace(",", ".")) : val;
      return isNaN(n as number) ? null : (n as number);
    })
    .optional()
    .nullable(),
  due_day: z
    .union([z.number(), z.string()])
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null;
      const n = typeof val === "string" ? parseInt(val, 10) : val;
      return isNaN(n as number) ? null : (n as number);
    })
    .optional()
    .nullable(),
}).superRefine((data, ctx) => {
  if (data.status === "ATIVO") {
    if (!data.monthly_fee || data.monthly_fee <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["monthly_fee"],
        message: "Mensalidade obrigatória e > 0 para clientes ATIVO",
      });
    }
    if (!data.due_day || data.due_day < 1 || data.due_day > 31) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["due_day"],
        message: "Dia de vencimento (1-31) obrigatório para clientes ATIVO",
      });
    }
  }
  if (data.document && data.document.length !== 11 && data.document.length !== 14) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["document"],
      message: "CPF/CNPJ deve ter 11 ou 14 dígitos",
    });
  }
});

export type ClientImportV2 = z.infer<typeof ClientImportSchemaV2>;

// ===== Legacy schemas (preserved for non-clients flows) =====
export const ClientImportSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  valorMensal: z.number().positive("Valor mensal deve ser positivo"),
  diaVencimento: z.number().int().min(1).max(31),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  contato: z.union([z.string(), z.number()]).transform(val => {
    if (val === null || val === undefined) return null;
    const phoneStr = String(val).replace(/\D/g, '');
    if (!phoneStr) return null;
    if (phoneStr.length === 11) return `+55 (${phoneStr.slice(0,2)}) ${phoneStr.slice(2,7)}-${phoneStr.slice(7)}`;
    if (phoneStr.length === 10) return `+55 (${phoneStr.slice(0,2)}) ${phoneStr.slice(2,6)}-${phoneStr.slice(6)}`;
    return phoneStr;
  }).optional().nullable(),
  servico: z.string().optional().nullable(),
  ativo: z.enum(['SIM','NAO']),
  temFidelidade: z.enum(['SIM','NAO']).optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

export const PaymentImportSchema = z.object({
  cliente: z.string().min(1),
  valor: z.number().positive(),
  vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataPagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status: z.enum(['PAGO','PENDENTE','ATRASADO']),
});

export const ExpenseImportSchema = z.object({
  nome: z.string().min(1),
  valor: z.number().positive(),
  vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categoria: z.string().optional().nullable(),
  tipo: z.enum(['FIXA','AVULSA','PARCELADA']),
  status: z.enum(['PAGO','PENDENTE','ATRASADO']),
  descricao: z.string().optional().nullable(),
  parcelas: z.number().int().positive().optional().nullable(),
  diaRecorrencia: z.number().int().min(1).max(31).optional().nullable(),
});

export const SalaryImportSchema = z.object({
  funcionario: z.string().min(1),
  valor: z.number().positive(),
  vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataPagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status: z.enum(['PAGO','PENDENTE','ATRASADO']),
});

export const LeadImportSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email().optional().nullable(),
  telefone: z.union([z.string(), z.number()]).transform(val => {
    if (val === null || val === undefined) return null;
    const phoneStr = String(val).replace(/\D/g,'');
    if (!phoneStr) return null;
    if (phoneStr.length === 11) return `+55 (${phoneStr.slice(0,2)}) ${phoneStr.slice(2,7)}-${phoneStr.slice(7)}`;
    if (phoneStr.length === 10) return `+55 (${phoneStr.slice(0,2)}) ${phoneStr.slice(2,6)}-${phoneStr.slice(6)}`;
    return phoneStr;
  }).optional().nullable(),
  empresa: z.string().optional().nullable(),
  cargo: z.string().optional().nullable(),
  origem: z.enum(['SITE','INDICACAO','GOOGLE_ADS','FACEBOOK_ADS','INSTAGRAM','LINKEDIN','WHATSAPP','MANUAL']),
  etapa: z.enum(['NOVO_LEAD','QUALIFICADO','AGENDAMENTO','REUNIAO','PROPOSTA','GANHO','PERDIDO']),
  temperatura: z.enum(['FRIO','MORNO','QUENTE']),
  valorEstimado: z.number().nonnegative().optional().nullable(),
  notas: z.string().optional().nullable(),
});

export interface ValidationError {
  row: number;
  sheet: string;
  field: string;
  message: string;
  value: any;
}

function collectErrors(error: unknown, index: number, sheet: string, row: any, into: ValidationError[]) {
  if (error instanceof z.ZodError) {
    error.errors.forEach((err) => {
      into.push({
        row: index + 2,
        sheet,
        field: err.path.join('.'),
        message: err.message,
        value: row[err.path[0] as string],
      });
    });
  }
}

export function validateClientsV2(data: any[]): { valid: ClientImportV2[]; errors: ValidationError[] } {
  const valid: ClientImportV2[] = [];
  const errors: ValidationError[] = [];
  data.forEach((row, index) => {
    const res = ClientImportSchemaV2.safeParse(row);
    if (res.success) valid.push(res.data);
    else collectErrors(res.error, index, 'Clientes', row, errors);
  });
  return { valid, errors };
}

export function validateClients(data: any[]) {
  const valid: any[] = [];
  const errors: ValidationError[] = [];
  data.forEach((row, index) => {
    try { valid.push(ClientImportSchema.parse(row)); }
    catch (e) { collectErrors(e, index, 'Clientes', row, errors); }
  });
  return { valid, errors };
}

export function validatePayments(data: any[], clients: any[]) {
  const valid: any[] = [];
  const errors: ValidationError[] = [];
  const names = clients.map(c => (c.nome || c.name)?.toLowerCase().trim());
  data.forEach((row, index) => {
    try {
      const parsed = PaymentImportSchema.parse(row);
      const cn = row.cliente?.toLowerCase().trim();
      if (!names.includes(cn)) {
        errors.push({ row: index+2, sheet: 'Pagamentos', field: 'cliente', message: `Cliente "${row.cliente}" não encontrado`, value: row.cliente });
      } else valid.push(parsed);
    } catch (e) { collectErrors(e, index, 'Pagamentos', row, errors); }
  });
  return { valid, errors };
}

export function validateExpenses(data: any[]) {
  const valid: any[] = [];
  const errors: ValidationError[] = [];
  data.forEach((row, index) => {
    try {
      const parsed = ExpenseImportSchema.parse(row);
      if (parsed.tipo === 'PARCELADA' && !parsed.parcelas) {
        errors.push({ row: index+2, sheet:'Despesas', field:'parcelas', message:'Parcelas é obrigatório para PARCELADA', value: parsed.parcelas });
      } else if (parsed.tipo === 'FIXA' && !parsed.diaRecorrencia) {
        errors.push({ row: index+2, sheet:'Despesas', field:'diaRecorrencia', message:'Dia de recorrência obrigatório para FIXA', value: parsed.diaRecorrencia });
      } else valid.push(parsed);
    } catch (e) { collectErrors(e, index, 'Despesas', row, errors); }
  });
  return { valid, errors };
}

export function validateSalaries(data: any[]) {
  const valid: any[] = [];
  const errors: ValidationError[] = [];
  data.forEach((row, index) => {
    try { valid.push(SalaryImportSchema.parse(row)); }
    catch (e) { collectErrors(e, index, 'Salários', row, errors); }
  });
  return { valid, errors };
}

export function validateLeads(data: any[]) {
  const valid: any[] = [];
  const errors: ValidationError[] = [];
  data.forEach((row, index) => {
    try {
      const parsed = LeadImportSchema.parse(row);
      if (!parsed.email && !parsed.telefone) {
        errors.push({ row: index+2, sheet:'Leads', field:'email/telefone', message:'Pelo menos email ou telefone deve ser fornecido', value: null });
      } else valid.push(parsed);
    } catch (e) { collectErrors(e, index, 'Leads', row, errors); }
  });
  return { valid, errors };
}
