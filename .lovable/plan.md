

# Filtrar Campos Pessoais e Selecionar Perguntas Qualificatórias

## Problema

A detecção de perguntas mostra campos como email, nome e telefone — dados pessoais que não são qualificatórios. Além disso, perguntas abertas (ex: "qual_seu_instagram?") geram listas enormes de respostas únicas e não servem para scoring. O usuário precisa poder escolher quais perguntas usar.

## Solução

### 1. Expandir a lista de campos filtrados automaticamente

Adicionar ao `TECHNICAL_FIELDS`: `email`, `full_name`, `first_name`, `last_name`, `phone_number`, `phone`, `nome`, `telefone`, `cidade`, `city`, `state`, `zip`, `country`, `street_address` e variações comuns de campos de contato/pessoais.

### 2. Filtro inteligente por quantidade de respostas únicas

Perguntas com mais de ~15 respostas únicas (como email ou instagram) são provavelmente abertas. Exibir um aviso mas ainda permitir ativação manual.

### 3. Sistema de ativação por pergunta

Cada formulário terá um estado de "perguntas ativas" para qualificação:

- Ao detectar perguntas, todas começam **desativadas** por padrão
- O usuário ativa via switch apenas as perguntas que deseja usar para scoring
- Perguntas desativadas ficam colapsadas/cinza e não mostram respostas
- Perguntas ativadas expandem e mostram as respostas com os selects de pontuação
- O estado de ativação é salvo junto com as regras (perguntas com regras salvas = ativas)

### Layout atualizado dentro do accordion do formulário:

```text
Pontuação por resposta

[Switch] qual_é_o_principal_gargalo...  (6 respostas)  ← ATIVA
   "Financeiro"         [Positivo (+1) ▼]  Bloqueador
   "Gestão"             [Neutro (0) ▼]     Bloqueador
   ...

[Switch] quando_pretende_comprar?       (3 respostas)  ← ATIVA
   "Imediato"           [Muito pos (+2) ▼] Bloqueador
   ...

[Switch] qual_seu_instagram?            (47 respostas) ← DESATIVA (cinza)
         Pergunta aberta — muitas respostas únicas
```

## Arquivo afetado

`src/components/crm/LeadScoringConfig.tsx` — Única alteração:

1. Expandir `TECHNICAL_FIELDS` com campos pessoais (email, nome, telefone, etc.)
2. Adicionar estado `enabledQuestions: Set<string>` no `FormAccordionItem`
3. Inicializar enabled = true apenas para perguntas que já têm regras salvas
4. Renderizar cada pergunta com um Switch de ativação ao lado do nome
5. Só mostrar respostas/scoring para perguntas ativadas
6. Badge com contagem de respostas e aviso "Pergunta aberta" se > 15 respostas únicas

