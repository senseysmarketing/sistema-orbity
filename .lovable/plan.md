

# Remover ícone de calendário dos meses de previsão

## Mudança
Em `src/components/admin/CommandCenter/FloatingActionBar.tsx`, remover o ícone `CalendarClock` que aparece antes do nome dos meses futuros no dropdown. Manter apenas o texto do mês + sufixo `(Previsão)` em itálico/cinza.

## Detalhes técnicos
- Remover o trecho `{isFuture && <CalendarClock className="h-3 w-3 text-muted-foreground" />}` dentro de cada `SelectItem`.
- Remover `CalendarClock` da lista de imports do `lucide-react`.
- Manter o `SelectValue` do trigger limpo (já não renderiza o ícone).

## Ficheiros alterados
- `src/components/admin/CommandCenter/FloatingActionBar.tsx`

