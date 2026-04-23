

# Ajuste de largura do modal de detalhes da tarefa

## Problema

O `TaskDetailsDialog` usa `max-w-2xl` (672px) mas agora possui 5 botões no rodapé (Melhorar com IA, Duplicar, **Enviar para Aprovação**, Excluir, Editar). No desktop, eles transbordam e geram scroll horizontal — o botão "Excluir" aparece cortado e "Editar" fica fora da área visível, como mostra o screenshot.

## Solução

Edição cirúrgica em **um único arquivo**: `src/components/tasks/TaskDetailsDialog.tsx`.

### 1. Aumentar largura do modal (linha 332)

Trocar:
```tsx
<DialogContent className="max-w-2xl max-h-[85vh] md:max-h-[90vh] overflow-y-auto p-4 md:p-6">
```
Por:
```tsx
<DialogContent className="max-w-3xl lg:max-w-4xl max-h-[85vh] md:max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 md:p-6">
```

- `max-w-3xl` (768px) no tablet, `lg:max-w-4xl` (896px) no desktop — espaço suficiente para os 5 botões em linha.
- `overflow-x-hidden` elimina o scroll horizontal que ainda aparece (visível no screenshot do usuário) caso algum conteúdo interno (anexos, histórico) ultrapasse a largura.

### 2. Permitir o footer quebrar em duas linhas quando necessário (linha 625)

Trocar:
```tsx
<DialogFooter className="flex-col sm:flex-row gap-2">
```
Por:
```tsx
<DialogFooter className="flex-col sm:flex-row sm:flex-wrap sm:justify-end gap-2">
```

- `sm:flex-wrap` garante que, em viewports estreitos onde os 5 botões ainda não couberem em linha (ex: tablet pequeno), eles quebrem para uma segunda linha em vez de gerar scroll horizontal.
- `sm:justify-end` mantém o alinhamento à direita esperado em diálogos.

## Sem mudanças

- Comportamento mobile (full-width buttons via `w-full sm:w-auto`) — preservado.
- Lógica de Smart Batch, validação de anexos 10 MB, Alert de feedback do cliente — intactos.
- Demais modais (`AlertDialogContent`) — não tocados.

