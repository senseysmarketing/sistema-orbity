
# Wizard para Criacao de Tarefas e Posts

## Resumo

Transformar os formularios de criacao de Tarefas e Posts do formato atual (tela unica com todos os campos) para um formato wizard passo-a-passo, onde o primeiro passo e o preenchimento com IA (que ja existe) e os passos seguintes apresentam os campos agrupados logicamente para o usuario conferir/alterar.

## O que o usuario vera

### Tarefas - Wizard de 4 passos

1. **IA** - Preenchimento Inteligente (ja existe, mantido como esta)
2. **Basico** - Titulo, Descricao, Tipo da tarefa
3. **Detalhes** - Prioridade, Status, Data de vencimento, Clientes, Usuarios atribuidos
4. **Revisao** - Resumo de tudo preenchido com botao "Criar Tarefa" + Subtarefas e Anexos

### Posts - Wizard de 5 passos

1. **IA** - Preenchimento Inteligente (ja existe, mantido como esta)
2. **Basico** - Titulo, Legenda/Texto, Plataforma, Tipo de Conteudo
3. **Agendamento** - Clientes, Data de Postagem, Data Limite da Arte
4. **Detalhes** - Prioridade, Usuarios, Hashtags, Observacoes
5. **Revisao** - Resumo de tudo + Subtarefas e Anexos com botao "Criar Postagem"

### Indicador de Progresso (ambos)

No topo do dialog, uma barra com circulos numerados e labels para cada etapa (similar ao print de referencia), com barra de progresso conectando os circulos. Etapas completadas ficam com fundo verde, a etapa atual com borda destacada.

### Navegacao

- Botoes "Voltar" e "Proximo" no rodape do dialog
- O botao "Pular e preencher manualmente" do passo IA avanca para o passo 2
- Na edicao de posts/tarefas existentes, o wizard NAO aparece - o formulario completo e exibido diretamente (como e hoje), pois nao faz sentido usar wizard para editar

## Mudancas Tecnicas

### 1. Novo componente `WizardStepIndicator`

**Arquivo:** `src/components/ui/wizard-step-indicator.tsx` (novo)

Componente reutilizavel que renderiza a barra de progresso com:
- Props: `currentStep`, `totalSteps`, `stepLabels` (array de strings)
- Circulos numerados com labels
- Linha de progresso conectando os circulos
- Estados: completado (verde), ativo (primario), pendente (cinza)

### 2. Refatorar criacao de Tarefas em `Tasks.tsx`

**Arquivo:** `src/pages/Tasks.tsx`

Atualmente o estado `createStep` e `"prefill" | "form"`. Sera alterado para um numero:
- `createStep: number` (1 = IA, 2 = Basico, 3 = Detalhes, 4 = Revisao)

O conteudo do dialog na criacao sera dividido:

**Passo 1 (IA):** Componente `AIPreFillStep` existente. "Pular" e "apos preencher" avancam para passo 2.

**Passo 2 (Basico):**
- Titulo (obrigatorio)
- Descricao
- Tipo (obrigatorio)
- Templates (botao "Usar Template" mantido aqui)

**Passo 3 (Detalhes):**
- Status + Prioridade (lado a lado)
- Data de vencimento
- Clientes + Usuarios atribuidos (lado a lado)

**Passo 4 (Revisao):**
- Resumo compacto de todos os campos preenchidos (cards com label/valor)
- Subtarefas + Anexos (editaveis neste passo)
- Botao "Criar Tarefa" no lugar de "Proximo"

Validacao entre passos:
- Passo 2 -> 3: exige titulo e tipo
- Passo 3 -> 4: sem validacao obrigatoria

O dialog de edicao de tarefas NAO sera alterado - continua com o formulario completo como esta.

### 3. Refatorar criacao de Posts em `PostFormDialog.tsx`

**Arquivo:** `src/components/social-media/PostFormDialog.tsx`

Atualmente `formStep` e `"prefill" | "form"`. Sera alterado para numero:
- `formStep: number` (1 = IA, 2 = Basico, 3 = Agendamento, 4 = Detalhes, 5 = Revisao)

**Passo 1 (IA):** AIPreFillStep existente.

**Passo 2 (Basico):**
- Titulo (obrigatorio)
- Legenda/Texto
- Plataforma + Tipo de Conteudo (lado a lado)

**Passo 3 (Agendamento):**
- Clientes
- Secao de Datas (Post Date + Due Date) - mantida identica ao bloco atual com bg-muted

**Passo 4 (Detalhes):**
- Status (readonly na criacao como ja esta) + Prioridade
- Usuarios atribuidos
- Hashtags
- Observacoes

**Passo 5 (Revisao):**
- Resumo de todos campos
- Subtarefas + Anexos
- Botao "Criar Postagem"

Validacao entre passos:
- Passo 2 -> 3: exige titulo

Na edicao (`editPost`), o wizard NAO aparece - formulario completo como hoje.

### 4. Componente de Revisao reutilizavel

**Arquivo:** `src/components/ui/wizard-review-step.tsx` (novo)

Componente que recebe um array de `{ label, value }` e renderiza uma lista de campos preenchidos em formato compacto (grid 2 colunas), facilitando a conferencia rapida antes de submeter.

## Arquivos Modificados/Criados

| Arquivo | Operacao | Descricao |
|---|---|---|
| `src/components/ui/wizard-step-indicator.tsx` | Criar | Indicador de progresso wizard reutilizavel |
| `src/components/ui/wizard-review-step.tsx` | Criar | Componente de revisao reutilizavel |
| `src/pages/Tasks.tsx` | Editar | Substituir dialog de criacao por wizard de 4 passos |
| `src/components/social-media/PostFormDialog.tsx` | Editar | Substituir dialog de criacao por wizard de 5 passos |

Nenhuma mudanca de banco de dados. Nenhuma mudanca em edge functions.
