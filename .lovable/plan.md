

# Correção: Remoção de Usuário Não Funciona

## Problema Identificado

Após análise detalhada, identifiquei **2 problemas** que estão causando a falha na remoção de usuários:

### Problema 1: Verificação de Permissão Incorreta no Frontend

A função `isAgencyAdmin` do hook `useAgency()` **é uma função** que precisa ser chamada com parênteses:

```typescript
// No hook useAgency.tsx (linha 205-207):
const isAgencyAdmin = () => {
  return agencyRole === 'admin' || agencyRole === 'owner';
};
```

**Porém**, no componente `UsersManagement.tsx`, ela está sendo usada **sem os parênteses**:

```typescript
// PROBLEMA - Linhas 49, 52 e 290:
if (currentAgency && isAgencyAdmin) { ... }  // ❌ Verifica se FUNÇÃO existe (sempre true)
if (!isAgencyAdmin) { ... }                   // ❌ Sempre false pois função existe

// CORRETO:
if (currentAgency && isAgencyAdmin()) { ... } // ✅ Chama a função
if (!isAgencyAdmin()) { ... }                  // ✅ Chama a função
```

### Problema 2: DELETE Não Verifica Rows Afetadas

O código atual faz DELETE e assume sucesso se não houver erro:

```typescript
const { error } = await supabase
  .from('agency_users')
  .delete()
  .eq('agency_id', currentAgency?.id)
  .eq('user_id', userId);

if (error) throw error;
// Assume sucesso mesmo se 0 rows foram deletadas!
```

Quando as políticas RLS bloqueiam a operação, o Supabase **não retorna erro** - apenas retorna 0 rows afetadas. O código precisa usar `.select()` para verificar se algo foi realmente deletado.

---

## Solução Técnica

### 1. Corrigir Chamadas de `isAgencyAdmin`

Modificar `src/components/admin/UsersManagement.tsx` para chamar a função corretamente:

| Linha | Antes | Depois |
|-------|-------|--------|
| 49 | `if (currentAgency && isAgencyAdmin)` | `if (currentAgency && isAgencyAdmin())` |
| 52 | `[currentAgency, isAgencyAdmin]` | `[currentAgency]` (isAgencyAdmin é função estável) |
| 290 | `if (!isAgencyAdmin)` | `if (!isAgencyAdmin())` |

### 2. Verificar Resultado do DELETE

Modificar a função `removeUser` para verificar se algo foi deletado:

```typescript
const removeUser = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('agency_users')
      .delete()
      .eq('agency_id', currentAgency?.id)
      .eq('user_id', userId)
      .select();  // Adicionar .select() para ver o que foi deletado

    if (error) throw error;

    // Verificar se algo foi realmente deletado
    if (!data || data.length === 0) {
      throw new Error('Você não tem permissão para remover este usuário ou ele não existe.');
    }

    toast({
      title: "Usuário removido!",
      description: "O usuário foi removido da agência.",
    });

    fetchUsers();
  } catch (error: any) {
    toast({
      title: "Erro ao remover usuário",
      description: error.message,
      variant: "destructive",
    });
  }
};
```

---

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/components/admin/UsersManagement.tsx` | Corrigir chamadas de `isAgencyAdmin()` e adicionar verificação no DELETE |

---

## Resultado Esperado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Member tenta acessar gerenciamento | Vê a interface (bug) | Vê "Acesso Restrito" |
| Admin tenta remover usuário | Falha silenciosa | Remove com sucesso |
| Member tenta remover via hack | Mostra sucesso falso | Mostra erro de permissão |

---

## Observações Técnicas

1. **Por que RLS não retorna erro?**
   - Por design, RLS do Postgres filtra rows silenciosamente
   - DELETE com 0 rows afetadas não é considerado erro
   - Usar `.select()` força o retorno das rows afetadas

2. **Por que `isAgencyAdmin` sem parênteses "funciona"?**
   - Em JavaScript, uma função é um objeto "truthy"
   - `if (isAgencyAdmin)` verifica se a função existe, não seu resultado
   - Isso significa que QUALQUER usuário passava na verificação

