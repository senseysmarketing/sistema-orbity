import * as XLSX from 'xlsx';

export interface ParsedData {
  clients?: any[];
  payments?: any[];
  expenses?: any[];
  salaries?: any[];
  leads?: any[];
}

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\*/g, '') // Remove asterisks
    .replace(/\s+/g, '') // Remove spaces
    .trim();
}

function mapHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {
    // Clients
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
    'prioridade': 'prioridade',
    'valorestimado': 'valorEstimado',
    'notas': 'notas'
  };

  const result: Record<string, string> = {};
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    const mapped = mapping[normalized];
    if (mapped) {
      result[header] = mapped;
    }
  });

  return result;
}

function transformRow(row: any, headerMap: Record<string, string>): any {
  const transformed: any = {};
  
  Object.keys(row).forEach(key => {
    const mappedKey = headerMap[key];
    if (mappedKey) {
      let value = row[key];
      
      // Handle empty values
      if (value === '' || value === null || value === undefined) {
        transformed[mappedKey] = null;
        return;
      }
      
      // Convert string numbers to actual numbers
      if (mappedKey.includes('valor') || mappedKey.includes('Valor') || 
          mappedKey === 'diaVencimento' || mappedKey === 'parcelas' || 
          mappedKey === 'diaRecorrencia') {
        const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
        transformed[mappedKey] = isNaN(num) ? value : num;
      }
      // Handle date formats
      else if (mappedKey.includes('data') || mappedKey.includes('Data') || 
               mappedKey === 'vencimento') {
        // If it's an Excel date number, convert it
        if (typeof value === 'number') {
          const date = XLSX.SSF.parse_date_code(value);
          transformed[mappedKey] = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
        } else {
          transformed[mappedKey] = value;
        }
      }
      // Handle boolean-like values
      else if (mappedKey === 'ativo' || mappedKey === 'temFidelidade') {
        transformed[mappedKey] = String(value).toUpperCase();
      }
      // Handle status and enum values
      else if (mappedKey === 'status' || mappedKey === 'tipo' || 
               mappedKey === 'origem' || mappedKey === 'prioridade') {
        transformed[mappedKey] = String(value).toUpperCase().replace(/\s+/g, '_');
      }
      else {
        transformed[mappedKey] = value;
      }
    }
  });
  
  return transformed;
}

export async function parseClientsAndPayments(file: File): Promise<ParsedData> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);

  const result: ParsedData = {};

  // Parse Clients sheet
  if (workbook.SheetNames.includes('Clientes')) {
    const sheet = workbook.Sheets['Clientes'];
    const rawData = XLSX.utils.sheet_to_json(sheet);
    
    if (rawData.length > 0) {
      const headers = Object.keys(rawData[0]);
      const headerMap = mapHeaders(headers);
      result.clients = rawData.map(row => transformRow(row, headerMap));
    }
  }

  // Parse Payments sheet
  if (workbook.SheetNames.includes('Pagamentos')) {
    const sheet = workbook.Sheets['Pagamentos'];
    const rawData = XLSX.utils.sheet_to_json(sheet);
    
    if (rawData.length > 0) {
      const headers = Object.keys(rawData[0]);
      const headerMap = mapHeaders(headers);
      result.payments = rawData.map(row => transformRow(row, headerMap));
    }
  }

  return result;
}

export async function parseExpenses(file: File): Promise<ParsedData> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);

  const result: ParsedData = {};

  if (workbook.SheetNames.includes('Despesas')) {
    const sheet = workbook.Sheets['Despesas'];
    const rawData = XLSX.utils.sheet_to_json(sheet);
    
    if (rawData.length > 0) {
      const headers = Object.keys(rawData[0]);
      const headerMap = mapHeaders(headers);
      result.expenses = rawData.map(row => transformRow(row, headerMap));
    }
  }

  return result;
}

export async function parseSalaries(file: File): Promise<ParsedData> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);

  const result: ParsedData = {};

  if (workbook.SheetNames.includes('Salários')) {
    const sheet = workbook.Sheets['Salários'];
    const rawData = XLSX.utils.sheet_to_json(sheet);
    
    if (rawData.length > 0) {
      const headers = Object.keys(rawData[0]);
      const headerMap = mapHeaders(headers);
      result.salaries = rawData.map(row => transformRow(row, headerMap));
    }
  }

  return result;
}

export async function parseLeads(file: File): Promise<ParsedData> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);

  const result: ParsedData = {};

  if (workbook.SheetNames.includes('Leads')) {
    const sheet = workbook.Sheets['Leads'];
    const rawData = XLSX.utils.sheet_to_json(sheet);
    
    if (rawData.length > 0) {
      const headers = Object.keys(rawData[0]);
      const headerMap = mapHeaders(headers);
      result.leads = rawData.map(row => transformRow(row, headerMap));
    }
  }

  return result;
}

export async function parseImportFile(file: File, type: string): Promise<ParsedData> {
  switch (type) {
    case 'clients_and_payments':
      return parseClientsAndPayments(file);
    case 'expenses':
      return parseExpenses(file);
    case 'salaries':
      return parseSalaries(file);
    case 'leads':
      return parseLeads(file);
    default:
      throw new Error('Tipo de importação inválido');
  }
}
