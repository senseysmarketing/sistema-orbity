import { describe, it, expect } from 'vitest';
import { renderBillingTemplate } from '../lib/billing-utils';

describe('Billing Variable Replacement', () => {
  const vars = {
    nome_cliente: 'João Silva',
    valor_formatado: 'R$ 150,00',
    data_vencimento: '15/05/2026',
    link_fatura: 'https://fatura.com/123'
  };

  it('should replace variables with single curly braces {variable}', () => {
    const template = 'Olá {nome}, seu boleto no valor de {valor} vence em {vencimento}. Link: {link}';
    const result = renderBillingTemplate(template, vars);
    
    expect(result).toBe('Olá João Silva, seu boleto no valor de R$ 150,00 vence em 15/05/2026. Link: https://fatura.com/123');
  });

  it('should replace variables with double curly braces {{variable}}', () => {
    const template = 'Olá {{nome}}, seu boleto no valor de {{valor}} vence em {{vencimento}}. Link: {{link}}';
    const result = renderBillingTemplate(template, vars);
    
    expect(result).toBe('Olá João Silva, seu boleto no valor de R$ 150,00 vence em 15/05/2026. Link: https://fatura.com/123');
  });

  it('should replace legacy variables names', () => {
    const template = 'Cliente: {nome_cliente}, Valor: {{valor_formatado}}, Vencimento: {data_vencimento}';
    const result = renderBillingTemplate(template, vars);
    
    expect(result).toBe('Cliente: João Silva, Valor: R$ 150,00, Vencimento: 15/05/2026');
  });

  it('should handle mixed single and double curly braces', () => {
    const template = 'Olá {nome}, confirmamos o valor de {{valor}} para o dia {vencimento}.';
    const result = renderBillingTemplate(template, vars);
    
    expect(result).toBe('Olá João Silva, confirmamos o valor de R$ 150,00 para o dia 15/05/2026.');
  });

  it('should handle conditional {{#link}} blocks correctly (link exists)', () => {
    const template = 'Fatura gerada.{{#link}} Link: {{link}}{{/link}}';
    const result = renderBillingTemplate(template, vars, true);
    
    expect(result).toBe('Fatura gerada. Link: https://fatura.com/123');
  });

  it('should handle conditional {{#link}} blocks correctly (link missing)', () => {
    const template = 'Fatura gerada.{{#link}} Link: {{link}}{{/link}}';
    const result = renderBillingTemplate(template, vars, false);
    
    expect(result).toBe('Fatura gerada.');
  });
  
  it('should handle aliases like {vencimento} correctly', () => {
    const template = 'Vence em {vencimento}';
    const result = renderBillingTemplate(template, vars);
    expect(result).toBe('Vence em 15/05/2026');
  });
});
