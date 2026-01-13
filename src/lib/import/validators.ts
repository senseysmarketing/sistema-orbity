import { z } from 'zod';

// Client validation
export const ClientImportSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  valorMensal: z.number().positive("Valor mensal deve ser positivo"),
  diaVencimento: z.number().int().min(1, "Dia mínimo é 1").max(31, "Dia máximo é 31"),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido (use YYYY-MM-DD)").optional().nullable(),
  contato: z.union([z.string(), z.number()]).transform(val => {
    if (val === null || val === undefined) return null;
    const phoneStr = String(val).replace(/\D/g, '');
    if (!phoneStr) return null;
    if (phoneStr.length === 11) {
      return `+55 (${phoneStr.slice(0, 2)}) ${phoneStr.slice(2, 7)}-${phoneStr.slice(7)}`;
    } else if (phoneStr.length === 10) {
      return `+55 (${phoneStr.slice(0, 2)}) ${phoneStr.slice(2, 6)}-${phoneStr.slice(6)}`;
    }
    return phoneStr;
  }).optional().nullable(),
  servico: z.string().optional().nullable(),
  ativo: z.enum(['SIM', 'NAO'], { errorMap: () => ({ message: "Ativo deve ser SIM ou NAO" }) }),
  temFidelidade: z.enum(['SIM', 'NAO'], { errorMap: () => ({ message: "Tem Fidelidade deve ser SIM ou NAO" }) }).optional().nullable(),
  observacoes: z.string().optional().nullable()
});

// Payment validation
export const PaymentImportSchema = z.object({
  cliente: z.string().min(1, "Cliente é obrigatório"),
  valor: z.number().positive("Valor deve ser positivo"),
  vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido (use YYYY-MM-DD)"),
  dataPagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido (use YYYY-MM-DD)").optional().nullable(),
  status: z.enum(['PAGO', 'PENDENTE', 'ATRASADO'], { errorMap: () => ({ message: "Status deve ser PAGO, PENDENTE ou ATRASADO" }) })
});

// Expense validation
export const ExpenseImportSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  valor: z.number().positive("Valor deve ser positivo"),
  vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido (use YYYY-MM-DD)"),
  categoria: z.string().optional().nullable(),
  tipo: z.enum(['FIXA', 'AVULSA', 'PARCELADA'], { errorMap: () => ({ message: "Tipo deve ser FIXA, AVULSA ou PARCELADA" }) }),
  status: z.enum(['PAGO', 'PENDENTE', 'ATRASADO'], { errorMap: () => ({ message: "Status deve ser PAGO, PENDENTE ou ATRASADO" }) }),
  descricao: z.string().optional().nullable(),
  parcelas: z.number().int().positive().optional().nullable(),
  diaRecorrencia: z.number().int().min(1).max(31).optional().nullable()
});

// Salary validation
export const SalaryImportSchema = z.object({
  funcionario: z.string().min(1, "Funcionário é obrigatório"),
  valor: z.number().positive("Valor deve ser positivo"),
  vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido (use YYYY-MM-DD)"),
  dataPagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido (use YYYY-MM-DD)").optional().nullable(),
  status: z.enum(['PAGO', 'PENDENTE', 'ATRASADO'], { errorMap: () => ({ message: "Status deve ser PAGO, PENDENTE ou ATRASADO" }) })
});

// Lead validation
export const LeadImportSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").optional().nullable(),
  telefone: z.union([z.string(), z.number()]).transform(val => {
    if (val === null || val === undefined) return null;
    // Convert to string if it's a number
    const phoneStr = String(val).replace(/\D/g, '');
    if (!phoneStr) return null;
    
    // Format Brazilian phone: +55 (DDD) 91234-5678 or +55 (DDD) 1234-5678
    if (phoneStr.length === 11) {
      // With 9 in front: +55 (XX) 9XXXX-XXXX
      return `+55 (${phoneStr.slice(0, 2)}) ${phoneStr.slice(2, 7)}-${phoneStr.slice(7)}`;
    } else if (phoneStr.length === 10) {
      // Without 9: +55 (XX) XXXX-XXXX
      return `+55 (${phoneStr.slice(0, 2)}) ${phoneStr.slice(2, 6)}-${phoneStr.slice(6)}`;
    }
    // Return as is if format doesn't match
    return phoneStr;
  }).optional().nullable(),
  empresa: z.string().optional().nullable(),
  cargo: z.string().optional().nullable(),
  origem: z.enum(['SITE', 'INDICACAO', 'GOOGLE_ADS', 'FACEBOOK_ADS', 'INSTAGRAM', 'LINKEDIN', 'WHATSAPP', 'MANUAL'], { 
    errorMap: () => ({ message: "Origem inválida. Valores aceitos: SITE, INDICACAO, GOOGLE_ADS, FACEBOOK_ADS, INSTAGRAM, LINKEDIN, WHATSAPP, MANUAL" }) 
  }),
  status: z.enum(['LEADS', 'QUALIFICADO', 'AGENDAMENTO', 'REUNIAO', 'PROPOSTA', 'GANHO', 'PERDIDO'], {
    errorMap: () => ({ message: "Status inválido. Valores aceitos: LEADS, QUALIFICADO, AGENDAMENTO, REUNIAO, PROPOSTA, GANHO, PERDIDO" })
  }),
  prioridade: z.enum(['FRIO', 'MORNO', 'QUENTE'], { errorMap: () => ({ message: "Prioridade deve ser FRIO, MORNO ou QUENTE" }) }),
  valorEstimado: z.number().nonnegative().optional().nullable(),
  notas: z.string().optional().nullable()
});

export interface ValidationError {
  row: number;
  sheet: string;
  field: string;
  message: string;
  value: any;
}

export function validateClients(data: any[]): { valid: any[]; errors: ValidationError[] } {
  const valid: any[] = [];
  const errors: ValidationError[] = [];

  data.forEach((row, index) => {
    try {
      const parsed = ClientImportSchema.parse(row);
      valid.push(parsed);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          errors.push({
            row: index + 2, // +2 because of header row and 0-index
            sheet: 'Clientes',
            field: err.path.join('.'),
            message: err.message,
            value: row[err.path[0]]
          });
        });
      }
    }
  });

  return { valid, errors };
}

export function validatePayments(data: any[], clients: any[]): { valid: any[]; errors: ValidationError[] } {
  const valid: any[] = [];
  const errors: ValidationError[] = [];
  const clientNames = clients.map(c => c.nome?.toLowerCase().trim());

  data.forEach((row, index) => {
    try {
      const parsed = PaymentImportSchema.parse(row);
      
      // Check if client exists
      const clientName = row.cliente?.toLowerCase().trim();
      if (!clientNames.includes(clientName)) {
        errors.push({
          row: index + 2,
          sheet: 'Pagamentos',
          field: 'cliente',
          message: `Cliente "${row.cliente}" não encontrado na aba Clientes`,
          value: row.cliente
        });
      } else {
        valid.push(parsed);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          errors.push({
            row: index + 2,
            sheet: 'Pagamentos',
            field: err.path.join('.'),
            message: err.message,
            value: row[err.path[0]]
          });
        });
      }
    }
  });

  return { valid, errors };
}

export function validateExpenses(data: any[]): { valid: any[]; errors: ValidationError[] } {
  const valid: any[] = [];
  const errors: ValidationError[] = [];

  data.forEach((row, index) => {
    try {
      const parsed = ExpenseImportSchema.parse(row);
      
      // Validate business rules
      if (parsed.tipo === 'PARCELADA' && !parsed.parcelas) {
        errors.push({
          row: index + 2,
          sheet: 'Despesas',
          field: 'parcelas',
          message: 'Parcelas é obrigatório para despesas parceladas',
          value: parsed.parcelas
        });
      } else if (parsed.tipo === 'FIXA' && !parsed.diaRecorrencia) {
        errors.push({
          row: index + 2,
          sheet: 'Despesas',
          field: 'diaRecorrencia',
          message: 'Dia de recorrência é obrigatório para despesas fixas',
          value: parsed.diaRecorrencia
        });
      } else {
        valid.push(parsed);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          errors.push({
            row: index + 2,
            sheet: 'Despesas',
            field: err.path.join('.'),
            message: err.message,
            value: row[err.path[0]]
          });
        });
      }
    }
  });

  return { valid, errors };
}

export function validateSalaries(data: any[]): { valid: any[]; errors: ValidationError[] } {
  const valid: any[] = [];
  const errors: ValidationError[] = [];

  data.forEach((row, index) => {
    try {
      const parsed = SalaryImportSchema.parse(row);
      valid.push(parsed);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          errors.push({
            row: index + 2,
            sheet: 'Salários',
            field: err.path.join('.'),
            message: err.message,
            value: row[err.path[0]]
          });
        });
      }
    }
  });

  return { valid, errors };
}

export function validateLeads(data: any[]): { valid: any[]; errors: ValidationError[] } {
  const valid: any[] = [];
  const errors: ValidationError[] = [];

  data.forEach((row, index) => {
    try {
      const parsed = LeadImportSchema.parse(row);
      
      // At least email or phone should be provided
      if (!parsed.email && !parsed.telefone) {
        errors.push({
          row: index + 2,
          sheet: 'Leads',
          field: 'email/telefone',
          message: 'Pelo menos email ou telefone deve ser fornecido',
          value: null
        });
      } else {
        valid.push(parsed);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          errors.push({
            row: index + 2,
            sheet: 'Leads',
            field: err.path.join('.'),
            message: err.message,
            value: row[err.path[0]]
          });
        });
      }
    }
  });

  return { valid, errors };
}
