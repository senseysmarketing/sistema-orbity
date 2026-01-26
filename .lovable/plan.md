

# Correção: Loop Infinito no PostFormDialog

## Problema Identificado

A navegação do sistema está travada devido a um **loop infinito de re-renderizações** no componente `PostFormDialog`. O erro no console confirma:

> "Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render."

### Causa Raiz

No arquivo `src/components/social-media/PostFormDialog.tsx`, linha 77-83:

```typescript
useEffect(() => {
  if (!dueDateManuallyEdited && formData.post_date) {
    const daysBefore = getDefaultDueDateDaysBefore();
    const newDueDate = calculateDueDate(formData.post_date, daysBefore);
    setFormData(prev => ({ ...prev, due_date: newDueDate }));
  }
}, [formData.post_date, dueDateManuallyEdited, getDefaultDueDateDaysBefore]);
```

O problema é que `getDefaultDueDateDaysBefore` (do hook `useSocialMediaSettings`) é **recriada a cada render** porque não está memorizada com `useCallback`. Isso cria uma nova referência a cada render, que dispara o `useEffect`, que chama `setFormData`, que causa novo render → **loop infinito**.

---

## Solução

Corrigir o hook `useSocialMediaSettings.tsx` para memorizar a função `getDefaultDueDateDaysBefore` com `useCallback`, evitando que ela mude de referência a cada render.

---

## Alterações Técnicas

### Arquivo: `src/hooks/useSocialMediaSettings.tsx`

**Mudança:** Envolver `getDefaultDueDateDaysBefore` em `useCallback` com dependência em `settings?.default_due_date_days_before`.

**Antes:**
```typescript
const getDefaultDueDateDaysBefore = () => {
  return settings?.default_due_date_days_before ?? 3;
};
```

**Depois:**
```typescript
import { useState, useEffect, useCallback } from 'react';

// ...

const getDefaultDueDateDaysBefore = useCallback(() => {
  return settings?.default_due_date_days_before ?? 3;
}, [settings?.default_due_date_days_before]);
```

---

## Por que isso resolve?

1. Com `useCallback`, a função `getDefaultDueDateDaysBefore` mantém a **mesma referência** entre renders (a menos que `settings?.default_due_date_days_before` mude)
2. O `useEffect` no `PostFormDialog` não será mais disparado a cada render
3. O loop infinito é quebrado
4. A navegação entre telas volta a funcionar normalmente

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/hooks/useSocialMediaSettings.tsx` | Adicionar `useCallback` à função `getDefaultDueDateDaysBefore` |

---

## Resultado Esperado

- Navegação entre telas do sistema funcionando normalmente
- Formulário de postagem sem loops infinitos
- Cálculo automático de `due_date` funcionando corretamente

