

# Fix: Margens da tela de Lembretes

## Problema
A pagina de Lembretes usa `container mx-auto p-6` como wrapper, o que centraliza o conteudo com margens laterais extras. As demais telas (Agenda, CRM, etc.) usam apenas `space-y-4 md:space-y-6` sem container, aproveitando o padding do layout pai.

## Solucao

### `src/pages/Reminders.tsx`
- Linha ~182: trocar `className="container mx-auto p-6 space-y-6"` por `className="space-y-4 md:space-y-6"`
- Ajustar o titulo para `text-2xl md:text-3xl` (padrao das demais telas)

Uma unica linha alterada.

