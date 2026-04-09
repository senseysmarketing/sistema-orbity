

# Botao de Excluir Cliente Inativo - Gerenciar Carteira

## Resumo
Adicionar um botao de lixeira ao lado esquerdo do badge "Inativo" para excluir clientes inativos, com modal de confirmacao.

## Solucao

### `src/components/admin/CommandCenter/ClientManagementSheet.tsx`

1. **Importar** `Trash2` do lucide-react e `Button` do shadcn

2. **Novo estado**: `deleteClient: Client | null` para controlar o modal de exclusao

3. **Nova mutation** `deleteMutation` que faz `DELETE` na tabela `clients` pelo `id`, invalida queries ao sucesso

4. **UI**: Para clientes inativos (`!client.active`), renderizar um botao icone `Trash2` entre o nome/valor e o badge:
   ```
   [Avatar] [Nome + Valor] [Lixeira] [Badge Inativo] [Switch]
   ```
   - Botao pequeno, `variant="ghost"`, `size="icon"`, classe `h-7 w-7 text-muted-foreground hover:text-destructive`

5. **Modal de confirmacao de exclusao**: Novo `AlertDialog` similar ao de inativacao, com texto alertando que a acao e irreversivel e remove todos os dados do cliente

