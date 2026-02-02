

# Correção: Post Desaparece ao Arrastar no Kanban de Social Media

## Diagnóstico

**O post NÃO foi excluído.** Ele existe no banco de dados, mas está com um status inválido que não corresponde a nenhuma coluna do Kanban.

### Evidências encontradas:

| Campo | Valor |
|-------|-------|
| Post ID | `387f67bc-ed53-4c72-99d2-48e2da09d2de` |
| Título | Caixa de perguntas (Stories) |
| Cliente | Juliano Fiuza Oioli |
| Status atual | `33efe0b1-624b-42bb-af1c-af1b53903415` |
| Última alteração | 02/02/2026 às 13:47 por Laryssa |

### Histórico de ações:
```text
13:11:57 - Laryssa → Status alterado para "Em Criação" ✅ (funcionou)
13:47:56 - Laryssa → Status alterado para "33efe0b1-624b-42bb-af1c-af1b53903415" ❌ (UUID inválido)
```

---

## Causa Raiz

O bug está no `handleDragEnd` do `PostKanban.tsx`:

```typescript
const newStatus = over.id as string; // ❌ BUG
```

Quando um post é arrastado e passa **por cima de outro post** antes de soltar na coluna, o `over.id` retorna o **ID do post** (UUID) em vez do **ID da coluna** (slug como `pending_approval`).

Isso acontece porque o `SortableContext` dentro de cada coluna registra os cards como droppables também.

---

## Solução

Modificar a função `handleDragEnd` para:
1. Verificar se o `over.id` é um ID de coluna válido
2. Se não for, descobrir a coluna correta usando `active.data.current.sortable.containerId` ou verificando se é um post e buscando a coluna do post de destino

---

## Arquivo a Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/social-media/PostKanban.tsx` | Corrigir `handleDragEnd` |

---

## Correção Técnica

### Nova lógica para `handleDragEnd`:

```typescript
const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event;

  if (!over) {
    setActivePost(null);
    return;
  }

  const postId = active.id as string;
  let newStatus = over.id as string;

  // Verificar se over.id é um ID de coluna válido
  const isValidColumn = allColumns.some(col => col.id === newStatus);

  if (!isValidColumn) {
    // over.id pode ser o ID de outro post - precisamos descobrir em qual coluna o post foi solto
    // Buscar a coluna do post de destino usando os dados do DnD
    const overData = over.data.current;
    
    if (overData?.sortable?.containerId) {
      newStatus = overData.sortable.containerId;
    } else {
      // Fallback: se não conseguir determinar a coluna, não faz nada
      setActivePost(null);
      return;
    }
  }

  // Verificar novamente após correção
  if (!allColumns.some(col => col.id === newStatus)) {
    console.warn('Status de destino inválido:', newStatus);
    setActivePost(null);
    return;
  }

  const post = posts.find(p => p.id === postId);
  
  // Só atualiza se o status realmente mudou
  if (post && post.status !== newStatus) {
    // ... resto da lógica existente
  }

  setActivePost(null);
};
```

---

## Correção Imediata do Post

Além da correção do código, o post da Laryssa precisa ter seu status corrigido manualmente:

```sql
UPDATE social_media_posts 
SET status = 'pending_approval'
WHERE id = '387f67bc-ed53-4c72-99d2-48e2da09d2de';
```

---

## Melhorias Adicionais

1. **Validação antes de salvar**: Verificar se o status é válido antes de chamar `updatePost`
2. **Rollback em caso de erro**: Já existe, mas precisa tratar o caso de status inválido
3. **Log para debug**: Adicionar console.log temporário para monitorar os IDs

---

## Passos de Implementação

1. Corrigir a lógica de `handleDragEnd` para validar o status de destino
2. Executar SQL para corrigir o post afetado
3. Testar arrastar posts entre colunas em diferentes cenários

