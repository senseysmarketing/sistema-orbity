import * as XLSX from 'xlsx';

export type ImportType = 
  | 'clients_and_payments' 
  | 'expenses' 
  | 'salaries' 
  | 'leads';

interface TemplateConfig {
  sheets: {
    name: string;
    headers: string[];
    example: any[];
    validations?: Record<string, string[]>;
  }[];
  instructions: string[];
}

const TEMPLATES: Record<ImportType, TemplateConfig> = {
  clients_and_payments: {
    sheets: [
      {
        name: 'Clientes',
        headers: [
          'Nome*',
          'Email',
          'Telefone',
          'CPF/CNPJ',
          'Status*',
          'Mensalidade',
          'Dia Vencimento'
        ],
        example: [{
          'Nome*': 'Empresa XYZ Ltda',
          'Email': 'contato@xyz.com',
          'Telefone': '(11) 98765-4321',
          'CPF/CNPJ': '12.345.678/0001-90',
          'Status*': 'ATIVO',
          'Mensalidade': 1500.00,
          'Dia Vencimento': 10
        }],
        validations: {
          'Status*': ['LEAD', 'ATIVO']
        }
      },
      {
        name: 'Pagamentos',
        headers: [
          'Cliente*',
          'Valor*',
          'Vencimento*',
          'Data Pagamento',
          'Status*'
        ],
        example: [{
          'Cliente*': 'Empresa XYZ Ltda',
          'Valor*': 1500.00,
          'Vencimento*': '2024-01-10',
          'Data Pagamento': '2024-01-08',
          'Status*': 'PAGO'
        }],
        validations: {
          'Status*': ['PAGO', 'PENDENTE', 'ATRASADO']
        }
      }
    ],
    instructions: [
      '📋 INSTRUÇÕES DE PREENCHIMENTO',
      '',
      '1. CAMPOS OBRIGATÓRIOS:',
      '   - Campos marcados com * são obrigatórios',
      '   - Para Status=ATIVO, Mensalidade e Dia Vencimento são obrigatórios',
      '   - Para Status=LEAD, Mensalidade e Dia Vencimento são ignorados',
      '',
      '2. FORMATOS:',
      '   - Datas: YYYY-MM-DD (ex: 2024-01-15)',
      '   - Valores: ponto para decimal (ex: 1500.00)',
      '   - Telefone: (11) 98765-4321 ou 11987654321',
      '   - CPF/CNPJ: opcional. Necessário para sincronização com gateway',
      '   - Status: LEAD ou ATIVO',
      '',
      '3. ABA PAGAMENTOS:',
      '   - Cliente: Deve ser exatamente igual ao nome na aba Clientes',
      '   - Status: PAGO, PENDENTE ou ATRASADO',
      '',
      '4. DICAS:',
      '   - Não altere os cabeçalhos das colunas',
      '   - Remova a linha de exemplo antes de importar',
      '   - O sistema detecta colunas por sinônimos (CPF, Documento, WhatsApp etc)'
    ]
  },
  expenses: {
    sheets: [
      {
        name: 'Despesas',
        headers: [
          'Nome*',
          'Valor*',
          'Vencimento*',
          'Categoria',
          'Tipo*',
          'Status*',
          'Descrição',
          'Parcelas',
          'Dia Recorrência'
        ],
        example: [{
          'Nome*': 'Aluguel Escritório',
          'Valor*': 3000.00,
          'Vencimento*': '2024-01-05',
          'Categoria': 'Infraestrutura',
          'Tipo*': 'FIXA',
          'Status*': 'PAGO',
          'Descrição': 'Aluguel mensal',
          'Parcelas': '',
          'Dia Recorrência': 5
        }],
        validations: {
          'Tipo*': ['FIXA', 'AVULSA', 'PARCELADA'],
          'Status*': ['PAGO', 'PENDENTE', 'ATRASADO']
        }
      }
    ],
    instructions: [
      '📋 INSTRUÇÕES - DESPESAS',
      '',
      '1. TIPOS DE DESPESA:',
      '   - FIXA: Despesas recorrentes mensais',
      '   - AVULSA: Despesas únicas',
      '   - PARCELADA: Despesas divididas em parcelas',
      '',
      '2. CAMPOS ESPECIAIS:',
      '   - Parcelas: Apenas para tipo PARCELADA (ex: 12)',
      '   - Dia Recorrência: Apenas para tipo FIXA (1-31)',
      '',
      '3. FORMATOS:',
      '   - Status: PAGO, PENDENTE ou ATRASADO',
      '   - Vencimento: YYYY-MM-DD'
    ]
  },
  salaries: {
    sheets: [
      {
        name: 'Salários',
        headers: [
          'Funcionário*',
          'Valor*',
          'Vencimento*',
          'Data Pagamento',
          'Status*'
        ],
        example: [{
          'Funcionário*': 'João Silva',
          'Valor*': 3500.00,
          'Vencimento*': '2024-01-05',
          'Data Pagamento': '2024-01-05',
          'Status*': 'PAGO'
        }],
        validations: {
          'Status*': ['PAGO', 'PENDENTE', 'ATRASADO']
        }
      }
    ],
    instructions: [
      '📋 INSTRUÇÕES - SALÁRIOS',
      '',
      '1. PREENCHIMENTO:',
      '   - Funcionário: Nome completo',
      '   - Valor: Valor do salário',
      '   - Vencimento: Data de pagamento prevista',
      '',
      '2. STATUS:',
      '   - PAGO: Já foi pago (preencha Data Pagamento)',
      '   - PENDENTE: Aguardando pagamento',
      '   - ATRASADO: Vencido e não pago'
    ]
  },
  leads: {
    sheets: [
      {
        name: 'Leads',
        headers: [
          'Nome*',
          'Email',
          'Telefone',
          'Empresa',
          'Cargo',
          'Origem*',
          'Etapa do Funil*',
          'Temperatura*',
          'Valor Estimado',
          'Notas'
        ],
        example: [{
          'Nome*': 'Maria Santos',
          'Email': 'maria@empresa.com',
          'Telefone': '(11) 98765-4321',
          'Empresa': 'Empresa ABC',
          'Cargo': 'Diretora de Marketing',
          'Origem*': 'INDICACAO',
          'Etapa do Funil*': 'NOVO_LEAD',
          'Temperatura*': 'QUENTE',
          'Valor Estimado': 5000.00,
          'Notas': 'Interessada em gestão de tráfego'
        }],
        validations: {
          'Origem*': ['SITE', 'INDICACAO', 'GOOGLE_ADS', 'FACEBOOK_ADS', 'INSTAGRAM', 'LINKEDIN', 'WHATSAPP', 'MANUAL'],
          'Etapa do Funil*': ['NOVO_LEAD', 'QUALIFICADO', 'AGENDAMENTO', 'REUNIAO', 'PROPOSTA', 'GANHO', 'PERDIDO'],
          'Temperatura*': ['FRIO', 'MORNO', 'QUENTE']
        }
      }
    ],
    instructions: [
      '📋 INSTRUÇÕES - LEADS',
      '',
      '1. CAMPOS:',
      '   - Email ou Telefone: Pelo menos um é recomendado',
      '   - Origem: De onde veio o lead',
      '   - Etapa do Funil: Estágio atual no funil de vendas',
      '   - Temperatura: FRIO, MORNO ou QUENTE',
      '',
      '2. ORIGENS VÁLIDAS:',
      '   - SITE, INDICACAO, GOOGLE_ADS, FACEBOOK_ADS, INSTAGRAM, LINKEDIN, WHATSAPP, MANUAL',
      '',
      '3. ETAPAS DO FUNIL:',
      '   - NOVO_LEAD, QUALIFICADO, AGENDAMENTO, REUNIAO, PROPOSTA, GANHO, PERDIDO'
    ]
  }
};

export function generateTemplate(type: ImportType): void {
  const config = TEMPLATES[type];
  const wb = XLSX.utils.book_new();

  config.sheets.forEach(sheet => {
    const exampleRows = sheet.example.map(row => 
      sheet.headers.map(header => row[header] ?? '')
    );
    const data = [sheet.headers, ...exampleRows];
    const ws = XLSX.utils.aoa_to_sheet(data);

    ws['!cols'] = sheet.headers.map(() => ({ wch: 20 }));

    const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) continue;
      
      if (sheet.headers[col].includes('*')) {
        ws[cellAddress].s = {
          fill: { fgColor: { rgb: 'FFFF00' } },
          font: { bold: true }
        };
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });

  const instructionsData = config.instructions.map(line => [line]);
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
  wsInstructions['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instruções');

  const filename = `template_${type}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function getTemplateInfo(type: ImportType) {
  return TEMPLATES[type];
}
