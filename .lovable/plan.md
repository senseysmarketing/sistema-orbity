

# Melhorias de UX no ClientForm.tsx

## Alteracoes

### 1. Mascara de Telefone
Adicionar funcao `formatPhone` junto das mascaras existentes (formatDocument, formatCep). Formato: `(XX) XXXXX-XXXX` ou `(XX) XXXX-XXXX`. Aplicar no onChange do campo Contato.

### 2. Separar Contato em Email + WhatsApp
Atualmente o campo "Contato" e generico ("Email, telefone, etc."). Para suportar a regua de cobranca, separar em dois campos:
- **E-mail** — com texto de ajuda: "Este e-mail receberá as faturas e notas fiscais automáticas."
- **WhatsApp** — com mascara de telefone e texto: "Este número receberá os links de pagamento e avisos de vencimento."

Adicionar `email` ao `initialFormData` e ao payload de submit. Manter `contact` como campo de WhatsApp (renomear label).

> **Nota**: Se a tabela `clients` nao tiver coluna `email`, sera necessario adicionar via migration. Vou verificar o schema.

**Alternativa simplificada** (se preferir nao alterar o banco): manter o campo unico "Contato" com mascara de telefone e adicionar os textos de ajuda apenas nele. Porem isso limita a regua de cobranca.

### 3. Layout 2 colunas otimizado
O formulario ja usa `grid grid-cols-1 md:grid-cols-2` em varias linhas. Reorganizar para:
- Linha 1: Nome + E-mail
- Linha 2: WhatsApp + Servico
- Linha 3: Valor Mensal + Dia de Vencimento
- Linha 4: Data de Inicio (sozinho ou com outro campo)
- Fidelidade + datas de contrato (ja ok)
- Observacoes (full width)
- Separator + Dados de Faturamento (ja ok)

## Verificacao necessaria
Preciso checar se `clients` ja tem coluna `email` no schema.

## Arquivos modificados
- `src/components/admin/ClientForm.tsx` — mascara, textos de ajuda, layout

Possivelmente:
- Migration SQL — adicionar coluna `email` em `clients` (se nao existir)
- `src/integrations/supabase/types.ts` — atualizar tipos

