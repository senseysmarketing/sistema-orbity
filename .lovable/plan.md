

# Aplicar gradiente roxo da landing page no menu lateral interno

## Resumo
Substituir o fundo sólido (`bg-sidebar` / `#1c102f`) do `AppSidebar` por um gradiente vertical que vai do purple-950 ao indigo-950, harmonizando com a landing page.

## Alteração

### `src/components/layout/AppSidebar.tsx`
- No `<Sidebar>` principal (linha 155): trocar `bg-sidebar` por `bg-gradient-to-b from-purple-950 via-purple-900 to-indigo-950`
- No `<SidebarHeader>` (linha 157): trocar `bg-sidebar` por `bg-transparent`
- No `<SidebarContent>` (~linha 165): trocar `bg-sidebar` por `bg-transparent`
- No `<SidebarFooter>` (~linha 218): trocar `bg-sidebar` por `bg-transparent`
- Ajustar o active state dos items: trocar `bg-sidebar-accent` por `bg-white/15` e o hover por `hover:bg-white/10` para combinar com o glassmorphism
- Borders (header/footer): trocar `border-sidebar-border` por `border-white/10` para subtileza

Apenas o gradiente, sem SVGs. Direção `to-b` (top-to-bottom) que funciona melhor em elementos verticais como sidebars.

## Ficheiro alterado
1. `src/components/layout/AppSidebar.tsx`

