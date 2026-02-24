
Objetivo
Corrigir definitivamente o scroll vertical no modal de preview do planejamento IA (`ContentPlanPreview`) para permitir visualizar todos os conteúdos e as informações abaixo sem corte.

Diagnóstico (com base no código atual)
- Em `ContentPlanPreview.tsx`, o `DialogContent` está com `max-h-[90vh] flex flex-col`, mas sem altura explícita (`h-[90vh]`), então a área flexível pode não ter um contexto de altura estável.
- O `ScrollArea` recebe `flex-1 min-h-0` diretamente. Em cenários com Radix + modal, isso pode falhar quando não existe um wrapper intermediário com `min-h-0`.
- O `ScrollArea` interno usa `overflow-hidden` no Root por design (arquivo `ui/scroll-area.tsx`), então ele depende fortemente de `h-full` e de um pai corretamente dimensionado para ativar viewport rolável.

Implementação proposta

1) Ajustar o container do modal para altura explícita
Arquivo:
- `src/components/social-media/planning/ContentPlanPreview.tsx`

Mudança:
- Em `DialogContent`, manter `max-h-[90vh]` e adicionar `h-[90vh]` (junto com `flex flex-col` já existente).

Resultado esperado:
- O layout interno passa a ter referência de altura real para distribuição flex.

2) Mover a responsabilidade de encolhimento para wrapper correto
Arquivo:
- `src/components/social-media/planning/ContentPlanPreview.tsx`

Mudança:
- Substituir a estrutura atual do bloco de itens:
  - De: `ScrollArea className="flex-1 min-h-0 pr-2"`
  - Para:
    - wrapper externo: `div className="flex-1 min-h-0"`
    - dentro dele: `ScrollArea className="h-full pr-2"`

Resultado esperado:
- O wrapper (`flex-1 min-h-0`) permite encolhimento correto no eixo vertical.
- O `ScrollArea` ocupa 100% da altura disponível e ativa scroll da viewport interna.

3) Preservar header/strategy/ações como áreas fixas
Arquivo:
- `src/components/social-media/planning/ContentPlanPreview.tsx`

Mudança:
- Manter os blocos superiores (header, estratégia, responsáveis, barra de seleção) e rodapé (botões) fora da área rolável.
- Não introduzir `overflow-hidden` adicional nos pais.

Resultado esperado:
- Apenas a lista de conteúdos rola; cabeçalho e ações ficam sempre visíveis.

4) Validação funcional e regressão visual
Cenários de teste:
- Abrir preview com muitos itens (>15) e confirmar acesso ao último card.
- Confirmar visualização completa do rodapé (botões) sem sobreposição/corte.
- Testar em desktop e viewport menor (mobile/tablet) para garantir comportamento consistente.
- Verificar que scroll da página de fundo continua bloqueado (comportamento esperado do dialog), mas scroll interno do modal funciona normalmente.

Critério de aceite
- Usuário consegue rolar até o último conteúdo no preview.
- Nenhuma seção inferior (cards finais + ações) fica inacessível.
- Sem regressão no layout do modal.

Fallback técnico (se algum navegador ainda apresentar inconsistência)
- Trocar somente a área rolável de `ScrollArea` para `div className="flex-1 min-h-0 overflow-y-auto pr-2"` mantendo o mesmo conteúdo interno.
- Esse fallback será aplicado apenas se o ajuste estrutural com `ScrollArea` não resolver 100% dos cenários.
