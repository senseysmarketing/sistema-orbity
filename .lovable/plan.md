

# Melhorar Step de Frequencia e Remover Redundancia de Reels

## Problema

1. O toggle "Incluir Reels?" no step 2 (Frequencia) e redundante com a selecao de "Reels" nos formatos preferidos do step 3 (Estilo)
2. O step de Frequencia nao oferece campos para direcionar dias especificos de postagem, prioridades por dia ou outras instrucoes de distribuicao

## Solucao

### 1. Remover toggle "Incluir Reels?"

- Remover o toggle `includeReels` do step 2
- Remover a propriedade `includeReels` da interface `WizardData` em `useContentPlanning.tsx`
- Remover a referencia a `includeReels` no resumo do step 5
- A definicao de Reels fica exclusivamente no step 3 via selecao de formatos

### 2. Adicionar novos campos ao step de Frequencia

Novos campos no step 2:

- **Dias de postagem preferidos**: Selecao multipla dos dias da semana (seg-dom) via badges clicaveis para o usuario indicar em quais dias prefere publicar
- **Distribuicao por dia**: Campo textarea para o usuario dar direcoes sobre que tipo de conteudo priorizar em cada dia (ex: "Segunda: educativo, Quarta: conversao, Sexta: bastidores")
- **Horarios preferidos**: Campo texto para indicar faixa de horarios ideais (ex: "9h, 12h e 18h")
- **Observacoes de frequencia**: Textarea livre para instrucoes adicionais sobre ritmo e distribuicao (ex: "Nunca postar no domingo", "Intensificar na ultima semana do mes")

### Detalhes Tecnicos

**Arquivo: `src/hooks/useContentPlanning.tsx`**
- Remover `includeReels` da interface `WizardData`
- Adicionar novos campos:
  - `preferredDays: string[]` (dias da semana selecionados)
  - `dayDistribution: string` (direcao de conteudo por dia)
  - `preferredTimes: string` (horarios preferidos)
  - `frequencyNotes: string` (observacoes adicionais)

**Arquivo: `src/components/social-media/planning/ContentPlanWizard.tsx`**
- Remover o toggle de Reels do step 2
- Adicionar os 4 novos campos ao step 2
- Remover referencia a `includeReels` no resumo do step 5
- Adicionar constante `WEEKDAYS` para selecao de dias
- Atualizar estado inicial com os novos campos

