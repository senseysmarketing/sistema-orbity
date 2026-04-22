import * as XLSX from 'xlsx';

export interface ParsedData {
  clients?: any[];
  clientsRaw?: any[];
  clientsHeaders?: string[];
  payments?: any[];
  expenses?: any[];
  salaries?: any[];
  leads?: any[];
}

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\*/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function mapHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {
    // Legacy clients fields
    'nome': 'nome',
    'valormensal': 'valorMensal',
    'diavencimento': 'diaVencimento',
    'datainicio': 'dataInicio',
    'contato': 'contato',
    'servico': 'servico',
    'ativo': 'ativo',
    'temfidelidade': 'temFidelidade',
    'observacoes': 'observacoes',
    // Payments
    'cliente': 'cliente',
    'valor': 'valor',
    'vencimento': 'vencimento',
    'datapagamento': 'dataPagamento',
    'status': 'status',
    // Expenses
    'categoria': 'categoria',
    'tipo': 'tipo',
    'descricao': 'descricao',
    'parcelas': 'parcelas',
    'diarecorrencia': 'diaRecorrencia',
    // Salaries
    'funcionario': 'funcionario',
    // Leads
    'email': 'email',
    'telefone': 'telefone',
    'empresa': 'empresa',
    'cargo': 'cargo',
    'origem': 'origem',
    'etapadofunil': 'etapa',
    'temperatura': 'temperatura',
    'valorestimado': 'valorEstimado',
    'notas': 'notas',
  };

  const result: Record<string, string> = {};
  headers.forEach((header) => {
    const normalized = normalizeHeader(header);
    const mapped = mapping[normalized];
    if (mapped) result[header] = mapped;
  });
  return result;
}

function transformRow(row: any, headerMap: Record<string, string>): any {
  const transformed: any = {};
  Object.keys(row).forEach((key) => {
    const mappedKey = headerMap[key];
    if (!mappedKey) return;
    let value = row[key];

    if (value === '' || value === null || value === undefined) {
      transformed[mappedKey] = null;
      return;
    }

    if (mappedKey.includes('valor') || mappedKey.includes('Valor') ||
        mappedKey === 'diaVencimento' || mappedKey === 'parcelas' ||
        mappedKey === 'diaRecorrencia') {
      const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
      transformed[mappedKey] = isNaN(num) ? value : num;
    } else if (mappedKey.includes('data') || mappedKey.includes('Data') || mappedKey === 'vencimento') {
      if (typeof value === 'number') {
        const date = XLSX.SSF.parse_date_code(value);
        transformed[mappedKey] = `${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`;
      } else transformed[mappedKey] = value;
    } else if (mappedKey === 'ativo' || mappedKey === 'temFidelidade') {
      transformed[mappedKey] = String(value).toUpperCase();
    } else if (mappedKey === 'status' || mappedKey === 'tipo' ||
               mappedKey === 'origem' || mappedKey === 'etapa' || mappedKey === 'temperatura') {
      transformed[mappedKey] = String(value).toUpperCase().replace(/\s+/g, '_');
    } else transformed[mappedKey] = value;
  });
  return transformed;
}

function readSheet(wb: XLSX.WorkBook, name: string) {
  if (!wb.SheetNames.includes(name)) return null;
  const sheet = wb.Sheets[name];
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  if (rawData.length === 0) return { rawData, headers: [] };
  const headers = Object.keys(rawData[0]);
  return { rawData, headers };
}

export async function parseClientsAndPayments(file: File): Promise<ParsedData> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  const result: ParsedData = {};

  const clientsSheet = readSheet(workbook, 'Clientes');
  if (clientsSheet && clientsSheet.rawData.length > 0) {
    result.clientsRaw = clientsSheet.rawData;
    result.clientsHeaders = clientsSheet.headers;
    const map = mapHeaders(clientsSheet.headers);
    result.clients = clientsSheet.rawData.map((r) => transformRow(r, map));
  }

  const paymentsSheet = readSheet(workbook, 'Pagamentos');
  if (paymentsSheet && paymentsSheet.rawData.length > 0) {
    const map = mapHeaders(paymentsSheet.headers);
    result.payments = paymentsSheet.rawData.map((r) => transformRow(r, map));
  }

  return result;
}

export async function parseExpenses(file: File): Promise<ParsedData> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  const result: ParsedData = {};
  const sheet = readSheet(workbook, 'Despesas');
  if (sheet && sheet.rawData.length > 0) {
    const map = mapHeaders(sheet.headers);
    result.expenses = sheet.rawData.map((r) => transformRow(r, map));
  }
  return result;
}

export async function parseSalaries(file: File): Promise<ParsedData> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  const result: ParsedData = {};
  const sheet = readSheet(workbook, 'Salários');
  if (sheet && sheet.rawData.length > 0) {
    const map = mapHeaders(sheet.headers);
    result.salaries = sheet.rawData.map((r) => transformRow(r, map));
  }
  return result;
}

export async function parseLeads(file: File): Promise<ParsedData> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  const result: ParsedData = {};
  const sheet = readSheet(workbook, 'Leads');
  if (sheet && sheet.rawData.length > 0) {
    const map = mapHeaders(sheet.headers);
    result.leads = sheet.rawData.map((r) => transformRow(r, map));
  }
  return result;
}

export async function parseImportFile(file: File, type: string): Promise<ParsedData> {
  switch (type) {
    case 'clients_and_payments': return parseClientsAndPayments(file);
    case 'expenses': return parseExpenses(file);
    case 'salaries': return parseSalaries(file);
    case 'leads': return parseLeads(file);
    default: throw new Error('Tipo de importação inválido');
  }
}
