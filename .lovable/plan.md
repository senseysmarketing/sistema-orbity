

# Edição de Clientes na Gerenciar Carteira (com refinamentos)

## Resumo
Adicionar botao de editar em cada linha de cliente no `ClientManagementSheet`, com loading state, tratamento de erros, e sincronizacao com gateway apos edicao.

## Alteracoes

### 1. `src/components/admin/CommandCenter/ClientManagementSheet.tsx`

**Imports**: `Pencil, Loader2` do lucide-react, `ClientForm` de `@/components/admin/ClientForm`

**Novos states**:
- `editingClient: any | null` -- cliente completo para o formulario
- `loadingClientId: string | null` -- ID do cliente sendo carregado (para loading no botao)

**Funcao `handleEditClient(client)`**:
- Seta `loadingClientId = client.id`
- Busca `supabase.from("clients").select("*").eq("id", client.id).single()` dentro de try/catch
- Em caso de sucesso: seta `editingClient` com os dados completos
- Em caso de erro: exibe toast "Nao foi possivel carregar os detalhes do cliente. Verifique sua conexao."
- Finally: limpa `loadingClientId`

**Botao Pencil** (visivel para todos os clientes, antes do Trash2):
```tsx
<Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
  onClick={() => handleEditClient(client)}
  disabled={loadingClientId === client.id}>
  {loadingClientId === client.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
</Button>
```

**ClientForm** (apos os AlertDialogs):
```tsx
<ClientForm
  open={!!editingClient}
  onOpenChange={(o) => { if (!o) setEditingClient(null); }}
  client={editingClient}
  onSuccess={() => {
    setEditingClient(null);
    queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
    queryClient.invalidateQueries({ queryKey: ["admin-payments-all"] });
  }}
/>
```

### 2. Sincronizacao com Gateway (dentro do `ClientForm.tsx`)

No bloco de update (apos `supabase.from('clients').update(data)`), adicionar logica de sync:
- Verificar se o cliente possui `conexa_customer_id` ou `asaas_customer_id`
- Se sim, disparar chamada para a Edge Function `create-gateway-charge` (ou uma funcao dedicada de update) para atualizar os dados no provedor externo
- Isso sera feito de forma "fire-and-forget" com toast informativo: "Dados sincronizados com o gateway" ou warning em caso de falha (sem bloquear o save local)

**Implementacao pratica**: Chamar `supabase.functions.invoke('sync-gateway-customer', { body: { clientId, agencyId } })` apos o update local. Se a funcao nao existir ainda, deixamos para uma iteracao futura e apenas adicionamos um TODO no codigo.

### 3. Validacao visual ao abrir em modo edicao

No `ClientForm.tsx`, adicionar um `useEffect` que, quando `client` e preenchido (modo edicao), dispara `form.trigger()` ou manualmente verifica campos obrigatorios (document, zip_code) e exibe badges/alerts visuais nos campos vazios. Como o form usa estado simples (sem react-hook-form), adicionaremos classes condicionais `border-amber-400` nos inputs de document e zip_code quando estiverem vazios em modo edicao, com um pequeno alerta no topo: "Preencha os campos destacados para garantir compatibilidade com os gateways de pagamento."

## Resumo de arquivos
- `ClientManagementSheet.tsx` -- botao edit, loading, error handling, ClientForm
- `ClientForm.tsx` -- validacao visual em modo edicao + TODO sync gateway
- 0 migrations, 0 edge functions

