

# Fix: Gradiente do sidebar sendo sobrescrito por bg-sidebar interno

## Problema
O componente `sidebar.tsx` (shadcn) tem `bg-sidebar` hardcoded em múltiplos elementos internos (linhas 144, 159, 209). Estas classes sobrepõem-se ao gradiente aplicado no `<Sidebar>` do `AppSidebar.tsx`, tornando-o invisível.

## Solução
Editar `src/components/ui/sidebar.tsx` para remover ou tornar transparente o `bg-sidebar` nos containers internos do sidebar, permitindo que o gradiente do `AppSidebar` seja visível.

### Alterações em `src/components/ui/sidebar.tsx`
1. **Linha 144** — Inner div desktop: trocar `bg-sidebar` por `bg-transparent`
2. **Linha 159** — Sheet mobile: trocar `bg-sidebar` por `bg-transparent`  
3. **Linha 209** — Inner wrapper: trocar `bg-sidebar` por `bg-transparent`

### Sem alterações em `AppSidebar.tsx`
O gradiente já está correctamente aplicado (`bg-gradient-to-b from-purple-950 via-purple-900 to-indigo-950`). Apenas precisa de deixar de ser tapado.

