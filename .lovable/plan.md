

# Mensagem Pronta por Semana - Resumo de Conteudos

## O que sera feito

Adicionar uma opcao "Copiar resumo semanal" no menu de 3 pontinhos do card de planejamento. Ao clicar, abre um modal (Dialog) com uma mensagem pre-formatada agrupando os conteudos por semana, pronta para copiar e colar (ex: enviar ao cliente via WhatsApp).

## Estrutura da mensagem gerada

```text
Bom dia! Segue o planejamento de conteudos para as redes sociais. 
Qualquer alteracao ou sugestao, pode me acionar!

--- Semana 1 (03/02 a 09/02) - 3 Conteudos ---

1. Titulo do Post [Terca-feira, 04/02]
   Tema: Descricao resumida do conteudo
   Formato: Carrossel | Plataforma: Instagram

2. Titulo do Post [Quinta-feira, 06/02]
   Tema: Descricao resumida
   Formato: Reels | Plataforma: Instagram

--- Semana 2 (10/02 a 16/02) - 2 Conteudos ---
...
```

## Arquivos

### Novo: `src/components/social-media/planning/WeeklySummaryDialog.tsx`

- Dialog com o texto gerado formatado
- Recebe o `ContentPlan` (com seus `content_plan_items`) como prop
- Agrupa os itens por semana (baseado no `post_date`, calculando segunda a domingo)
- Itens sem `post_date` vao em uma secao "Sem data definida" ao final
- Botao "Copiar" que copia todo o texto para a area de transferencia com `navigator.clipboard.writeText()`
- Textarea read-only mostrando a mensagem para que o usuario tambem possa selecionar manualmente
- O nome do cliente aparece na saudacao

### Modificado: `src/components/social-media/planning/ContentPlanCard.tsx`

- Adicionar nova prop `onCopyWeeklySummary` ao componente
- Adicionar item no DropdownMenu: icone `MessageSquareText` + "Resumo semanal"
- Ao clicar, chama `onCopyWeeklySummary(plan)`

### Modificado: `src/components/social-media/planning/ContentPlanningList.tsx`

- Adicionar estado `summaryPlan` para controlar qual plano esta com o modal de resumo aberto
- Passar callback `onCopyWeeklySummary` ao `ContentPlanCard`
- Renderizar o `WeeklySummaryDialog` com o plano selecionado

## Logica de agrupamento por semana

- Ordenar itens por `post_date`
- Para cada item, calcular o numero da semana do mes (semana 1 = dias 1-7, semana 2 = 8-14, etc.)
- Agrupar e mostrar o intervalo de datas de cada semana
- Exibir dia da semana em portugues (Segunda-feira, Terca-feira...)
- Contar quantos conteudos tem em cada semana

