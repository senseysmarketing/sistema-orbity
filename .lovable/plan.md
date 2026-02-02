
# Correção: Fluxo de Desativação/Exclusão de Clientes

## Problema Identificado

Na tela Administrativa, na aba de Clientes, ao clicar nos três pontos do menu dropdown:

| Local | Comportamento Atual | Comportamento Esperado |
|-------|---------------------|------------------------|
| ClientCard (Cards) | Mostra "Desativar" | Correto (já implementado) |
| Tabela (Table view) | Mostra "Excluir" | Deveria mostrar "Desativar" ou "Reativar" |
| Cards na tabela | Mostra "Excluir" | Deveria mostrar "Desativar" ou "Reativar" |

**Regra de negócio solicitada:**
1. Cliente **ativo** → Mostrar opção "Desativar"
2. Cliente **inativo** → Mostrar opções "Reativar" e "Excluir Permanentemente"
3. **Exclusão definitiva** só é permitida para clientes já desativados

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/Admin.tsx` | Ajustar dropdowns na table view e adicionar Alert para desativar |
| `src/components/admin/ClientCard.tsx` | Adicionar lógica para mostrar Reativar/Excluir se inativo |

---

## Implementação

### 1. ClientCard.tsx

Modificar o dropdown para:
- **Se ativo**: Mostrar "Desativar" (já está assim)
- **Se inativo**: Mostrar "Reativar" e "Excluir Permanentemente"

Adicionar novas props:
```typescript
onDeactivate?: (client: Client) => void;
onReactivate?: (client: Client) => void;
```

Atualizar o menu dropdown:
```tsx
{client.active ? (
  <DropdownMenuItem 
    onClick={(e) => { e.stopPropagation(); onDeactivate?.(client); }}
    className="text-orange-600 focus:text-orange-600"
  >
    <UserX className="mr-2 h-4 w-4" />
    Desativar
  </DropdownMenuItem>
) : (
  <>
    <DropdownMenuItem 
      onClick={(e) => { e.stopPropagation(); onReactivate?.(client); }}
      className="text-green-600 focus:text-green-600"
    >
      <Play className="mr-2 h-4 w-4" />
      Reativar
    </DropdownMenuItem>
    <DropdownMenuItem 
      onClick={(e) => { e.stopPropagation(); onDelete(client); }}
      className="text-destructive focus:text-destructive"
    >
      <Trash2 className="mr-2 h-4 w-4" />
      Excluir Permanentemente
    </DropdownMenuItem>
  </>
)}
```

### 2. Admin.tsx

**2.1 Atualizar chamada do ClientCard:**
```tsx
<ClientCard
  ...
  onDeactivate={handleDeactivateClient}
  onReactivate={handleReactivateClient}
  onDelete={handleDeleteClient}
  ...
/>
```

**2.2 Ajustar dropdown na table view (linha ~2371):**

Alterar de:
```tsx
<DropdownMenuItem onClick={() => handleDeleteClient(client)} className="text-red-600">
  <Trash2 className="mr-2 h-4 w-4" />
  Excluir
</DropdownMenuItem>
```

Para:
```tsx
{client.active ? (
  <DropdownMenuItem 
    onClick={() => handleDeactivateClient(client)} 
    className="text-orange-600"
  >
    <UserX className="mr-2 h-4 w-4" />
    Desativar
  </DropdownMenuItem>
) : (
  <>
    <DropdownMenuItem 
      onClick={() => handleReactivateClient(client)} 
      className="text-green-600"
    >
      <Play className="mr-2 h-4 w-4" />
      Reativar
    </DropdownMenuItem>
    <DropdownMenuItem 
      onClick={() => handleDeleteClient(client)} 
      className="text-red-600"
    >
      <Trash2 className="mr-2 h-4 w-4" />
      Excluir Permanentemente
    </DropdownMenuItem>
  </>
)}
```

**2.3 Atualizar o Alert Dialog de exclusão:**

Modificar para deixar claro que é exclusão permanente:
```tsx
<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Excluir Cliente Permanentemente</AlertDialogTitle>
      <AlertDialogDescription>
        Tem certeza que deseja excluir permanentemente o cliente "{clientToDelete?.name}"? 
        <br /><br />
        <strong className="text-destructive">Esta ação não pode ser desfeita.</strong> Todos os dados relacionados 
        (pagamentos, histórico, etc.) serão removidos permanentemente.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction 
        onClick={confirmDeleteClient}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        Excluir Permanentemente
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**2.4 Adicionar validação de segurança na função confirmDeleteClient:**

```typescript
const confirmDeleteClient = async () => {
  if (!clientToDelete) return;
  
  // Segurança: só permite excluir clientes inativos
  if (clientToDelete.active) {
    toast({
      title: "Operação não permitida",
      description: "Você precisa desativar o cliente antes de excluí-lo permanentemente.",
      variant: "destructive"
    });
    setDeleteDialogOpen(false);
    setClientToDelete(null);
    return;
  }
  
  // ... resto da lógica existente
};
```

---

## Fluxo Final

```text
Usuário clica nos 3 pontos do cliente
         │
         ▼
    Cliente está ativo?
    ┌─────┴─────┐
   SIM         NÃO
    │           │
    ▼           ▼
"Desativar"   "Reativar" + "Excluir Permanentemente"
    │           │              │
    ▼           ▼              ▼
 Desativa    Reativa     Confirma exclusão
 cliente     cliente     (deleta do banco)
```

---

## Resumo das Mudanças

| Arquivo | Mudança |
|---------|---------|
| `ClientCard.tsx` | Adicionar props e lógica condicional no dropdown |
| `Admin.tsx` | Ajustar dropdowns nas visualizações em tabela, passar novas props ao ClientCard, validação de segurança |
