

# Redesign da Tela de Qualificação — Layout por Formulário com Importação Meta

## Problema Atual
A tela atual usa um dropdown para selecionar formulário e adiciona regras uma a uma. Precisa ser reorganizada para:
1. Listar todos os formulários como cards accordion (como nos prints de referência)
2. Mostrar perguntas/respostas detectadas inline com select de pontuação ao lado
3. Importar formulários diretamente da Meta API (sem depender de lead chegar)
4. Opção de re-qualificar leads existentes ao salvar configuração

## Design (baseado nos prints de referência)

### Estrutura da tela
```text
┌─────────────────────────────────────────┐
│ Qualificação Automática                 │
│ Defina regras para qualificar leads     │
│                                         │
│ [Legenda: 🔴 Quente ≥5  🟡 Morno 2-4  │
│           🔵 Frio ≤1 ]                  │
│                                         │
│ X/Y formulários  ████░░░               │
│ [Todos] [Meta] [Webhook]  [Sincronizar] │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ⚙ [Senseys] ADN507 v3  Meta  ✅    ▼│ │
│ │   3 perguntas detectadas            │ │
│ ├─────────────────────────────────────┤ │
│ │ (expandido):                        │ │
│ │  Pixel ID: [___________] [Salvar]   │ │
│ │                                     │ │
│ │  Qual seu objetivo?                 │ │
│ │   "Alugar"        [Neutro (0)    ▼] │ │
│ │   "Comprar"       [Positivo (+1) ▼] │ │
│ │   "Investir"      [Positivo (+1) ▼] │ │
│ │                                     │ │
│ │  Quando pretende comprar?           │ │
│ │   "Imediato"      [Muito pos (+2)▼] │ │
│ │   "3 meses"       [Positivo (+1) ▼] │ │
│ │                                     │ │
│ │  Legenda de Temperatura:            │ │
│ │  🔴 Score ≥ 5  🟡 ≥ 2 e < 5  🔵 <2│ │
│ │                                     │ │
│ │  [☑ Atualizar leads existentes]     │ │
│ │  [Excluir]        [Salvar Config]   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ⚙ Formulário 924321...  Meta  ⏳   ▼│ │
│ │   0 perguntas detectadas            │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Diálogo de Sincronização Meta
Botão "Sincronizar Meta" abre dialog que:
1. Chama `facebook-leads` com `action: 'list_pages'` → para cada página chama `list_forms`
2. Lista formulários disponíveis com status (Importado/Novo)
3. Botão "Sincronizar Todos" importa formulários novos como integrações

## Alterações Técnicas

### 1. `src/components/crm/LeadScoringConfig.tsx` — Rewrite completo

**Estrutura principal:**
- Lista todos formulários (integrations) como accordion items
- Cada item expandido mostra: Pixel ID, perguntas com respostas inline, legenda, ações
- Perguntas detectadas via `custom_fields` dos leads existentes OU da Meta API
- Cada resposta tem um `<Select>` inline com opções: Muito negativo (-2), Negativo (-1), Neutro (0), Positivo (+1), Muito positivo (+2)
- Badge de status: "Configurado" (verde) se tem regras, "Pendente" (amarelo) se não
- Contagem de perguntas detectadas
- Barra de progresso: formulários configurados / total

**Botão "Sincronizar Meta":**
- Abre dialog
- Usa as actions `list_pages` e `list_forms` da edge function `facebook-leads` (já existem)
- Para cada formulário encontrado, verifica se já existe em `facebook_lead_integrations`
- Permite importar novos formulários (cria integração com `save_integration`)

**Salvar configuração:**
- Salva todas as regras do formulário de uma vez (upsert batch)
- Se "Atualizar leads existentes" ativo, chama `process-lead-qualification` para cada lead daquele form

**Detecção de perguntas:**
- Busca `custom_fields` dos leads com source `facebook_leads` filtrado por form_id (via `facebook_lead_sync_log`)
- Agrupa por chave → lista respostas únicas
- Filtra campos técnicos (ad_id, platform, etc.)

### 2. Nenhuma alteração de backend necessária
- As actions `list_pages`, `list_forms`, `save_integration` já existem na edge function `facebook-leads`
- A qualificação já funciona via `process-lead-qualification`
- Apenas o frontend muda

### Componentes internos do novo arquivo:
- `FormAccordionItem` — card expandível por formulário
- `QuestionScoring` — bloco de pergunta com respostas inline
- `SyncMetaDialog` — dialog de importação de formulários
- `TemperatureLegend` — legenda de classificação

