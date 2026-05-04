export function renderBillingTemplate(
  tpl: string,
  vars: Record<string, string>,
  hasLink?: boolean
): string {
  let out = tpl;
  
  // Handle conditional block {{#link}}...{{/link}}
  if (out.includes('{{#link}}')) {
    out = hasLink
      ? out.replace(/\{\{#link\}\}/g, "").replace(/\{\{\/link\}\}/g, "")
      : out.replace(/\{\{#link\}\}[\s\S]*?\{\{\/link\}\}/g, "");
  }

  // Create aliases to ensure compatibility with all possible tags
  const expandedVars = {
    ...vars,
    nome: vars.nome || vars.nome_cliente,
    valor: vars.valor || vars.valor_formatado,
    vencimento: vars.vencimento || vars.data_vencimento,
    link: vars.link || vars.link_fatura || vars.link_pagamento,
  };

  // Sort keys by length descending to avoid partial matches
  const keys = Object.keys(expandedVars).sort((a, b) => b.length - a.length);

  for (const k of keys) {
    const v = expandedVars[k] ?? "";
    // Handle both {{token}} and {token}
    out = out.split(`{{${k}}}`).join(v);
    out = out.split(`{${k}}`).join(v);
  }
  
  return out;
}
