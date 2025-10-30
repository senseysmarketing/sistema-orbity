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
          'Valor Mensal*',
          'Dia Vencimento*',
          'Data Início',
          'Contato',
          'Serviço',
          'Ativo*',
          'Tem Fidelidade',
          'Observações'
        ],
        example: [{
          'Nome*': 'Empresa XYZ Ltda',
          'Valor Mensal*': 1500.00,
          'Dia Vencimento*': 10,
          'Data Início': '2024-01-15',
          'Contato': '(11) 98765-4321',
          'Serviço': 'Gestão de Tráfego',
          'Ativo*': 'SIM',
          'Tem Fidelidade': 'SIM',
          'Observações': 'Cliente desde janeiro'
        }],
        validations: {
          'Ativo*': ['SIM', 'NAO'],
          'Tem Fidelidade': ['SIM', 'NAO']
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
      '   - Preencha todos os campos obrigatórios',
      '',
      '2. FORMATOS ACEITOS:',
      '   - Datas: YYYY-MM-DD (ex: 2024-01-15)',
      '   - Valores: Use ponto para decimal (ex: 1500.00)',
      '   - Telefone: (11) 98765-4321 ou 11987654321',
      '   - Ativo/Fidelidade: SIM ou NAO (maiúsculas)',
      '   - Status: PAGO, PENDENTE ou ATRASADO',
      '',
      '3. ABA CLIENTES:',
      '   - Nome: Nome completo do cliente',
      '   - Valor Mensal: Valor do contrato mensal',
      '   - Dia Vencimento: Dia do mês (1-31)',
      '   - Data Início: Data de início do contrato',
      '',
      '4. ABA PAGAMENTOS:',
      '   - Cliente: Deve ser exatamente igual ao nome na aba Clientes',
      '   - Vencimento: Data de vencimento do pagamento',
      '   - Data Pagamento: Deixe vazio se não foi pago ainda',
      '',
      '5. DICAS:',
      '   - Não altere os cabeçalhos das colunas',
      '   - Remova a linha de exemplo antes de importar',
      '   - Certifique-se de que os nomes de clientes sejam idênticos nas duas abas',
      '   - Salve o arquivo como .xlsx antes de importar'
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
          'Status*',
          'Prioridade*',
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
          'Status*': 'NOVO',
          'Prioridade*': 'ALTA',
          'Valor Estimado': 5000.00,
          'Notas': 'Interessada em gestão de tráfego'
        }],
        validations: {
          'Origem*': ['MANUAL', 'SITE', 'INDICACAO', 'REDES_SOCIAIS', 'FACEBOOK_LEADS'],
          'Status*': ['NOVO', 'CONTATO', 'QUALIFICADO', 'PROPOSTA', 'NEGOCIACAO', 'GANHO', 'PERDIDO'],
          'Prioridade*': ['BAIXA', 'MEDIA', 'ALTA']
        }
      }
    ],
    instructions: [
      '📋 INSTRUÇÕES - LEADS',
      '',
      '1. CAMPOS:',
      '   - Email ou Telefone: Pelo menos um é recomendado',
      '   - Origem: De onde veio o lead',
      '   - Status: Estágio atual no funil',
      '   - Prioridade: BAIXA, MEDIA ou ALTA',
      '',
      '2. ORIGENS VÁLIDAS:',
      '   - MANUAL, SITE, INDICACAO, REDES_SOCIAIS, FACEBOOK_LEADS',
      '',
      '3. STATUS VÁLIDOS:',
      '   - NOVO, CONTATO, QUALIFICADO, PROPOSTA, NEGOCIACAO, GANHO, PERDIDO'
    ]
  }
};

export function generateTemplate(type: ImportType): void {
  const config = TEMPLATES[type];
  const wb = XLSX.utils.book_new();

  // Add data sheets
  config.sheets.forEach(sheet => {
    const data = [sheet.headers, ...sheet.example];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws['!cols'] = sheet.headers.map(() => ({ wch: 20 }));

    // Style header row (yellow background for required fields)
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

  // Add instructions sheet
  const instructionsData = config.instructions.map(line => [line]);
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
  wsInstructions['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instruções');

  // Generate filename
  const filename = `template_${type}_${new Date().toISOString().split('T')[0]}.xlsx`;
  
  // Download
  XLSX.writeFile(wb, filename);
}

export function getTemplateInfo(type: ImportType) {
  return TEMPLATES[type];
}
