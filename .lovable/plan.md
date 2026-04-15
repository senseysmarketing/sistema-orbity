

# Adicionar 7º Card "Agenda Inteligente" ao FeaturesGrid

## Alteração única: `src/components/landing/FeaturesGrid.tsx`

### 1. Import da imagem (topo do ficheiro)
```tsx
import AgendaImg from "@/assets/landing/Agenda.jpg";
```
`Calendar` já está importado — nenhuma alteração nos ícones.

### 2. Novo item no array `features`
Adicionar como 7º elemento (após "Decisões Baseadas em Dados"):
- **Título**: "Agenda Inteligente"
- **Descrição**: "Integração bidirecional com o Google Calendar. Centralize as suas reuniões, follow-ups e eventos, tudo em um único ecrã."
- **Ícone**: `CalendarCheck` (importar novo — `Calendar` já está em uso no card 5)
- **colSpan**: `""` (col-span-1)
- **image**: `AgendaImg`

### 3. Ajuste do JSX para suportar imagem
O card com `image` renderiza a imagem abaixo do texto com `rounded-2xl mt-4 group-hover:scale-105 transition-transform duration-700`. Os cards sem imagem mantêm-se iguais.

### 4. Resultado da grelha (3 colunas)
```text
Linha 1: [Feche Mais Contratos (span-2)] [Criativos]
Linha 2: [Inadimplência] [ROI Anúncios (span-2)]
Linha 3: [Conteúdo] [Dados] [Agenda ← NOVO]
```

Grelha completa sem espaços vazios. Estilo 100% consistente com os cards existentes.

