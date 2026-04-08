

# AI Contract Workspace - Refatoracao Completa

## Resumo
Substituir o wizard de contratos (4 passos) por um workspace de tela dividida com painel Copilot (esquerda) + Editor ao vivo (direita), usando IA para gerar o texto do contrato. Usar `ResizablePanelGroup` do shadcn/ui.

## Arquivos

### 1. Novo: `src/components/contracts/SmartContractGenerator.tsx`

Componente principal com layout dividido:

- **Estrutura**: `ResizablePanelGroup` horizontal com 2 paineis (40%/60%). Em mobile (`useIsMobile`), empilhar verticalmente com flex-col.
- **Painel Esquerdo (Copilot)**:
  - Select de clientes (fetch `clients` da agencia, igual ao `ContractClientStep`)
  - Ao selecionar cliente, buscar dados completos (nome, contact, CNPJ se tiver)
  - Inputs: "Valor Mensal (R$)" (number), "Duracao do Contrato (Meses)" (number), "Multa Rescisoria (%)" (number)
  - Textarea "Instrucoes Especificas para a IA" com placeholder
  - Botao "Gerar com IA" com Sparkles icon, loading state com spinner
- **Painel Direito (Editor)**:
  - Toolbar superior: botao "Salvar Contrato" + "Limpar"
  - Se `contractContent` vazio: empty state com icone e texto
  - Se preenchido: Textarea estilizada full-height, sem bordas, font mono, simulando folha A4 (bg-white, max-w, shadow, padding generoso)
  - O usuario edita o texto livremente apos a geracao

### 2. Logica de IA

- No clique de "Gerar com IA", chamar `supabase.functions.invoke('ai-assist')` com `type: "generate_contract"` e `content` contendo JSON com dados do cliente, valor, duracao, multa e instrucoes customizadas
- Adicionar handler para `generate_contract` na edge function `ai-assist`:
  - System prompt pedindo contrato profissional de prestacao de servicos de marketing digital em PT-BR
  - Incluir clausulas padrao: objeto, valor, prazo, obrigacoes, rescisao, foro
  - Incorporar instrucoes customizadas do usuario
  - Retornar texto puro do contrato (nao JSON, nao markdown)
  - Usar modelo padrao sem streaming (retorno direto via tool calling com campo `contract_text`)

### 3. Logica de Salvamento

- Ao clicar "Salvar Contrato":
  - INSERT na tabela `contracts` com: `agency_id`, `client_id`, `client_name`, `agency_name`, `total_value` (valor mensal), `contract_date` (hoje), `start_date` (hoje), `status: 'draft'`, `custom_clauses: contractContent` (texto completo gerado/editado)
  - Toast de sucesso + chamar `onComplete()`

### 4. Modificar: `src/pages/Contracts.tsx`

- Substituir import de `ContractGenerator` por `SmartContractGenerator`
- Trocar `<ContractGenerator>` por `<SmartContractGenerator>` com mesmas props
- Remover `<Card className="p-6">` wrapper (o novo componente gerencia seu proprio layout)

### 5. Modificar: `supabase/functions/ai-assist/index.ts`

- Adicionar constante `CONTRACT_TOOLS` com tool `extract_contract_data` (parametro `contract_text: string`)
- Adicionar case `generate_contract` no handler principal:
  - System prompt com template de contrato profissional de marketing
  - Parsear `content` como JSON para extrair dados do cliente/negocio
  - Chamar Lovable AI Gateway com tool calling
  - Retornar `{ result: { contract_text: "..." } }`

## Detalhes Tecnicos

- `ResizablePanelGroup` ja existe em `src/components/ui/resizable.tsx`
- Tabela `contracts` ja tem todos os campos necessarios (client_id, client_name, total_value, custom_clauses, status, etc.)
- `useIsMobile()` hook ja existe para responsividade
- Nao precisa de nova dependencia
- Edge function `ai-assist` ja tem padrao estabelecido de tool calling

