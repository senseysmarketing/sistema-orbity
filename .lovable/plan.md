

# Botão "Ver Fatura" no menu de 3 pontinhos

## Resumo
Adicionar um item "Ver Fatura" no `DropdownMenu` do `CashFlowTable.tsx` que aparece quando o pagamento possui uma URL de fatura (`invoiceUrl`). O link abre a URL em nova aba, funcionando tanto para Conexa quanto Asaas.

## Alterações (1 arquivo)

### `src/components/admin/CommandCenter/CashFlowTable.tsx`

**Import**: Adicionar `ExternalLink` do lucide-react.

**Novo DropdownMenuItem** (inserir logo após o item "Editar Detalhes", antes do "Emitir Fatura Conexa"):

```tsx
{item.invoiceUrl && (
  <DropdownMenuItem onClick={() => window.open(item.invoiceUrl, '_blank')}>
    <ExternalLink className="h-4 w-4 mr-2" />
    Ver Fatura
  </DropdownMenuItem>
)}
```

A condição `item.invoiceUrl` garante que o botão só aparece após a fatura ser emitida, independente do gateway (Conexa ou Asaas). O `invoiceUrl` já é preenchido em `useFinancialMetrics` a partir de `conexa_invoice_url` ou `invoice_url`.

## Resumo de arquivos
- 1 componente alterado (`CashFlowTable.tsx`)
- 0 migrations, 0 edge functions

